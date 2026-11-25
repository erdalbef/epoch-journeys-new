import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import {
  mapBraveHotelResults,
  extractDistinctHotelCandidates,
  validHotelResearchLocation
} from "@/lib/epoch-ai/hotelWebResearch";
import type { WebHotelResult } from "@/lib/epoch-ai/hotelWebResearch";
import { buildHotelBrief, meetsHotelGuestRatingMinimum } from "@/lib/epoch-ai/hotelExecutiveBrief";
import { compileHotelEvidence } from "@/lib/epoch-ai/hotelEvidenceResearch";
import { extractStructuredHotelResearch, type HotelCapacityCandidate } from "@/lib/epoch-ai/hotelStructuredResearch";
import { selectHotelOfficialSiteCandidates } from "@/lib/epoch-ai/hotelOfficialSiteSelection";
import type { HotelEvidenceReport } from "@/lib/epoch-ai/hotelEvidenceResearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const respond = (data: Record<string, unknown>, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });

const cleanNames = (value: unknown) =>
  Array.isArray(value)
    ? [...new Set(value.filter(
        (s): s is string =>
          typeof s === "string" &&
          s.trim().length >= 4 &&
          s.length <= 100
      ).map(s => s.trim()))].slice(0, 12)
    : [];

const SAFE_PROVIDER_CODES = new Set([
  "INTERNAL",
  "QUOTA_LIMITED",
  "RATE_LIMITED",
  "VALIDATION",
  "VALIDATION_ERROR",
  "INVALID_ARGUMENT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "SUBSCRIPTION_TOKEN_INVALID",
  "SUBSCRIPTION_TOKEN_MISSING",
  "INVALID_SUBSCRIPTION_TOKEN",
  "SUBSCRIPTION_TOKEN_EXPIRED",
  "NOT_FOUND"
]);

function providerCode(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "UNKNOWN";

  const code = (payload as {
    error?: { code?: unknown }
  }).error?.code;

  return typeof code === "string" && SAFE_PROVIDER_CODES.has(code)
    ? code
    : "UNKNOWN";
}

/** Admin-only, read-only public hotel research. */
export async function POST(request: Request) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return respond({ error: "Same-origin request required" }, 403);
  }

  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return respond({ error: "Request too large" }, 413);
  }

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return respond({ error: "Invalid request" }, 400);
  }

  if (!input || typeof input !== "object") {
    return respond({ error: "Invalid request" }, 400);
  }

  const payload = input as Record<string, unknown>;

  if (!validHotelResearchLocation(payload.city, payload.country)) {
    return respond({ error: "Valid city and country required" }, 400);
  }

  const city = (payload.city as string).trim();
  const country = (payload.country as string).trim();
  const knownNames = cleanNames(payload.knownNames);

  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();

  if (!key) {
    return respond({
      error: "Brave Search API key is not configured"
    }, 503);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 28000);

  const errors: string[] = [];
  let calls = 0;
  let successfulSearches = 0;
  let stopProviderRequests = false;

  function recordFailure(
    stage: string,
    status: number,
    code: string
  ) {
    const message = status
      ? `${stage}: Brave HTTP ${status} (${code})`
      : `${stage}: ${code}`;

    errors.push(message);

    // Never log API keys, query contents or raw provider bodies.
    console.error("HOTEL_RESEARCH_PROVIDER_FAILURE", {
      stage,
      status,
      code
    });

    if (
      [401, 402, 403, 429].includes(status) ||
      [
        "QUOTA_LIMITED",
        "RATE_LIMITED",
        "SUBSCRIPTION_TOKEN_INVALID",
        "SUBSCRIPTION_TOKEN_MISSING",
        "INVALID_SUBSCRIPTION_TOKEN",
        "SUBSCRIPTION_TOKEN_EXPIRED"
      ].includes(code)
    ) {
      stopProviderRequests = true;
    }
  }

  async function search(
    q: string,
    stage: string
  ): Promise<WebHotelResult[]> {
    if (stopProviderRequests || ctrl.signal.aborted || calls >= 12) {
      errors.push(`${stage}: search not attempted`);
      return [];
    }

    calls++;

    const url = new URL(
      "https://api.search.brave.com/res/v1/web/search"
    );

    url.searchParams.set("q", q);
    url.searchParams.set("count", "10");
    url.searchParams.set("extra_snippets", "true");

    try {
      const r = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": key!
        },
        redirect: "error",
        signal: ctrl.signal,
        cache: "no-store"
      });

      let data: unknown;

      try {
        data = await r.json();
      } catch {
        recordFailure(stage, r.status, "NON_JSON_RESPONSE");
        return [];
      }

      if (!r.ok) {
        recordFailure(stage, r.status, providerCode(data));
        return [];
      }

      const pages = mapBraveHotelResults(data);
      successfulSearches++;

      return pages;
    } catch {
      recordFailure(
        stage,
        0,
        ctrl.signal.aborted ? "TIME_LIMIT" : "NETWORK_ERROR"
      );

      return [];
    }
  }

  try {
    const discoveryPages = [
      ...(await search(
        `large 4 star 5 star hotels ${city} ${country} group accommodation guest rooms and suites`,
        "discovery-primary"
      )),
      ...(await search(
        `conference hotels ${city} ${country} hotel accommodation total guest rooms Marriott Hilton Accor IHG`,
        "discovery-secondary"
      ))
    ];

    if (successfulSearches === 0) {
      return respond({
        error: `Hotel discovery failed. ${errors[0] || "No search completed."}`,
        errors,
        provider: "Brave Search API"
      }, 424);
    }

    const discovery = extractDistinctHotelCandidates(
      discoveryPages,
      knownNames
    ).filter(item => item.identityStatus !== "identity-review");

    const names = [...new Set([
      ...discovery.map(c => c.name),
      ...knownNames
    ])].slice(0, 8);

    const reports: Record<string, HotelEvidenceReport> = {};
    const briefs: Record<string, ReturnType<typeof buildHotelBrief>> = {};

    const capacities: Record<string, HotelCapacityCandidate> = Object.create(null);

    // Sequential searches avoid bursts of simultaneous provider requests.
    for (let i = 0; i < names.length; i++) {
      if (stopProviderRequests || ctrl.signal.aborted) {
        errors.push(`${names.length - i} hotel research steps deferred`);
        break;
      }

      const name = names[i];
      const before = successfulSearches;

      const pages = await search(
        `"${name}" ${city} ${country} official hotel accommodation guest room count rooms suites meetings events accessibility parking`,
        `hotel-evidence-${i + 1}`
      );

      if (successfulSearches === before) continue;

      briefs[name] = buildHotelBrief(name, pages);

      try {
        reports[name] = compileHotelEvidence(
          name,
          city,
          country,
          pages,
          new Date().toISOString()
        );

        const capacityPages = [...pages, ...discoveryPages];
        const officialUrls = new Set(
          selectHotelOfficialSiteCandidates(name, capacityPages).map(page => page.sourceUrl)
        );
        const candidates = extractStructuredHotelResearch(name, capacityPages).capacities;
        const officialCounts = candidates.filter(item => officialUrls.has(item.sourceUrl));
        const evidence = officialCounts.length ? officialCounts : candidates;
        if (evidence.length && evidence.every(item => item.totalRooms === evidence[0].totalRooms)) {
          capacities[name] = evidence[0];
        }
      } catch {
        errors.push(`Hotel evidence step ${i + 1} could not be compiled`);
      }
    }

    const unratedNames = names.filter(name => !briefs[name]?.rating);
    const reviewPages: WebHotelResult[] = [];
    for (let offset = 0; offset < unratedNames.length && !stopProviderRequests && !ctrl.signal.aborted; offset += 4) {
      const propertyNames = unratedNames.slice(offset, offset + 4)
        .map(name => `"${name.replace(/"/g, "").slice(0, 65)}"`).join(" OR ");
      reviewPages.push(...await search(
        `(${propertyNames}) ${city} ${country} guest rating reviews (site:booking.com OR site:tripadvisor.com OR site:expedia.com)`,
        `hotel-reviews-${offset / 4 + 1}`
      ));
    }

    for (const name of unratedNames) {
      const review = buildHotelBrief(name, reviewPages);
      if (review.rating) {
        briefs[name] = {
          ...(briefs[name] ?? review),
          rating: review.rating,
          ratingOutOfFive: review.ratingOutOfFive,
          ratingSourceUrl: review.ratingSourceUrl
        };
      }
    }

    return respond({
      city,
      country,
      discovered: discovery.filter(item => meetsHotelGuestRatingMinimum(briefs[item.name])),
      reports,
      briefs,
      capacities,
      researchedCount: Object.keys(reports).length,
      errors,
      partial: errors.length > 0,
      provider: "Brave Search API",
      note: "Provisional public research only. No CRM writes, hotel confirmation or supplier emails."
    });
  } catch {
    console.error("DESTINATION_HOTEL_RESEARCH_INTERNAL_FAILURE");

    return respond({
      error: "Hotel research could not complete. No records changed."
    }, 500);
  } finally {
    clearTimeout(timer);
  }
}