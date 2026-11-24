import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/authOptions";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { isTrustedEpochAiOrigin } from "@/lib/security/epochAiTrustedOrigin";
import { assessHereRouteResponse } from "@/lib/epoch-ai/hereRouteAdapter";
import { buildRouteFeasibilitySummary } from "@/lib/epoch-ai/routeFeasibilitySummary";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  day: z.number().int().min(1).max(30),
  from: z.string().trim().min(2).max(120),
  to: z.string().trim().min(2).max(120),
}).strict();

type HereGeocode = { items?: Array<{ position?: { lat?: number; lng?: number } }> };

function validPosition(value: { lat?: number; lng?: number } | undefined):
  value is { lat: number; lng: number } {
  return value !== undefined && typeof value.lat === "number" &&
    typeof value.lng === "number" && Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) && Math.abs(value.lat) <= 90 &&
    Math.abs(value.lng) <= 180;
}

export async function POST(request: Request) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  if (!isTrustedEpochAiOrigin(
    request.headers.get("origin"),
    process.env.NODE_ENV ?? "development",
    process.env.EPOCH_ALLOWED_ORIGINS ?? ""
  )) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limit = checkRateLimit(`epoch-ai-route-check:${session.user.id}`, 12, 10 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Route check limit reached." }, { status: 429 });

  const key = (process.env.HERE_ROUTING_API_KEY || process.env.HERE_API_KEY)?.trim();
  if (!key) return NextResponse.json({ error: "HERE routing key is not configured on the server." }, { status: 503 });

  let raw: string;
  try {
    raw = await request.text();
    if (raw.length > 1500) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  } catch { return NextResponse.json({ error: "Could not read request." }, { status: 400 }); }
  let body: unknown;
  try { body = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a day, origin and destination." }, { status: 400 });
  const { day, from, to } = parsed.data;
  if (from.toLocaleLowerCase() === to.toLocaleLowerCase()) {
    return NextResponse.json({ error: "Origin and destination must differ." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 22000);
  const hereFetch = async (url: URL) => {
    const response = await fetch(url.toString(), { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`HERE HTTP ${response.status}`);
    return response.json() as Promise<unknown>;
  };

  try {
    const geocode = async (place: string) => {
      const url = new URL("https://geocode.search.hereapi.com/v1/geocode");
      url.searchParams.set("q", place);
      url.searchParams.set("limit", "1");
      url.searchParams.set("apiKey", key);
      const response = await hereFetch(url) as HereGeocode;
      const position = response?.items?.[0]?.position;
      if (!validPosition(position)) throw new Error("HERE location unavailable");
      return position;
    };
    const [origin, destination] = await Promise.all([geocode(from), geocode(to)]);
    const url = new URL("https://router.hereapi.com/v8/routes");
    url.searchParams.set("transportMode", "car");
    url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
    url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
    url.searchParams.set("return", "summary");
    url.searchParams.set("apiKey", key);
    const assessment = assessHereRouteResponse(await hereFetch(url));
    if (assessment.status === "unavailable" || assessment.distanceKm === null ||
        assessment.drivingMinutes === null) {
      return NextResponse.json({ error: "HERE did not provide usable route metrics." }, { status: 502 });
    }

    // The report intentionally models ONE road leg, not a full day.
    // Unknown visit, Mass, lunch, and boarding durations remain null.
    const report = buildRouteFeasibilitySummary({
      day: {
        day,
        visitMinutes: null,
        massMinutes: null,
        lunchMinutes: null,
        operationalBufferMinutes: null,
      },
      segments: [{
        from, to,
        distanceKm: assessment.distanceKm,
        drivingMinutes: assessment.drivingMinutes,
        evidence: "routing-service",
        coachAccess: assessment.status === "critical-restriction"
          ? "restriction-reported" : "unverified",
      }],
    });
    return NextResponse.json({
      report: {
        ...report,
        warnings: [...new Set([
          ...assessment.warnings,
          ...report.warnings,
          "ONE LEG ONLY: other daily road legs and appointments are not included.",
          "HERE car routing is not proof of full-size coach suitability.",
        ])],
      },
      checkedLeg: { from, to, day, provider: "HERE", transportMode: "car" },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Never log request URLs or provider error objects: URLs contain credentials.
    console.error("EPOCH_HERE_ROUTE_CHECK_FAILED", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ error: controller.signal.aborted
      ? "HERE route check timed out." : "HERE could not calculate this road leg. Check the places and server configuration." },
      { status: controller.signal.aborted ? 504 : 502 });
  } finally { clearTimeout(timer); }
}
