import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { authorizeHotelResearchUrl, authorizedHotelResearchPages } from "@/lib/epoch-ai/hotelOfficialRetrievalPolicy";
import { fetchHotelPublicPage } from "@/lib/epoch-ai/hotelSecurePageFetch";
import { extractHotelOfficialPage } from "@/lib/epoch-ai/hotelOfficialPageExtraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 1024;

const respond = (data: Record<string, unknown>, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });

async function readLimitedJson(request: Request): Promise<unknown> {
  if (!request.body) throw new Error("Missing request body");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;

      bytes += result.value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        throw new Error("Request too large");
      }

      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(bytes);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(combined));
}

function validSelection(
  value: unknown
): value is { hotelName: string; purpose: "contact" | "facilities" } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    Object.keys(data).length === 2 &&
    typeof data.hotelName === "string" &&
    data.hotelName.trim().length > 0 &&
    data.hotelName.length <= 120 &&
    (data.purpose === "contact" || data.purpose === "facilities")
  );
}

/**
 * Read-only, Admin-only hotel webpage research.
 *
 * The caller cannot supply a URL. The destination must match a
 * previously reviewed property-specific server-side policy entry.
 *
 * Retrieval remains disabled unless explicitly enabled on the server.
 * No supplier record, quotation or email is changed.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return respond({ error: "Same-origin request required" }, 403);
  }

  if (!/^application\/json(?:\s*;|$)/i.test(
    request.headers.get("content-type") || ""
  )) {
    return respond({ error: "JSON request required" }, 415);
  }

  const declaredLength = Number(
    request.headers.get("content-length") || 0
  );

  if (
    !Number.isFinite(declaredLength) ||
    declaredLength > MAX_REQUEST_BYTES ||
    declaredLength < 0
  ) {
    return respond({ error: "Request too large" }, 413);
  }

  let value: unknown;

  try {
    value = await readLimitedJson(request);
  } catch {
    return respond({ error: "Invalid or oversized request" }, 400);
  }

  if (!validSelection(value)) {
    return respond({
      error: "Valid hotel name and page purpose required"
    }, 400);
  }

  const approved = authorizedHotelResearchPages(value.hotelName)
    .find(page => page.purpose === value.purpose);

  if (
    !approved ||
    !authorizeHotelResearchUrl(value.hotelName, approved.url)
  ) {
    return respond({ error: "Hotel webpage not authorized" }, 403);
  }

  if (process.env.HOTEL_OFFICIAL_PAGE_RETRIEVAL_ENABLED !== "true") {
    return respond({
      error: "Official hotel website retrieval is not enabled"
    }, 503);
  }

  try {
    const page = await fetchHotelPublicPage(approved.url);
    const extracted = extractHotelOfficialPage(
      page.html,
      page.sourceUrl
    );

    return respond({
      hotelName: approved.hotelName,
      purpose: approved.purpose,
      sourceUrl: approved.url,
      status: "requires-admin-verification",
      extraction: extracted
    });
  } catch (error) {
    console.warn(
      "HOTEL_OFFICIAL_PAGE_RETRIEVAL_FAILED",
      error instanceof Error ? error.message : "unknown"
    );

    return respond({
      error: "Official hotel webpage could not be retrieved; no data changed"
    }, 502);
  }
}