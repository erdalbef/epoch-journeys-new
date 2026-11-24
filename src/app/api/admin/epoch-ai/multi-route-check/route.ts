import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/authOptions";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { isTrustedEpochAiOrigin } from "@/lib/security/epochAiTrustedOrigin";
import { assessHereRouteResponse } from "@/lib/epoch-ai/hereRouteAdapter";
import { buildRouteFeasibilitySummary } from "@/lib/epoch-ai/routeFeasibilitySummary";
import type { RoadSegmentInput } from "@/lib/epoch-ai/roadSegmentReview";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  day: z.number().int().min(1).max(30),
  stops: z.array(z.string().trim().min(2).max(120)).min(2).max(7),
  // Unspecified appointments remain unknown; no fake default durations.
  visitMinutes: z.number().int().min(0).max(1440).nullable(),
  massMinutes: z.number().int().min(0).max(1440).nullable(),
  lunchMinutes: z.number().int().min(0).max(1440).nullable(),
  operationalBufferMinutes: z.number().int().min(0).max(1440).nullable(),
  fixedAppointments: z.boolean(),
}).strict();

type Position = { lat: number; lng: number };
function positionFrom(value: unknown): Position | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as { lat?: unknown; lng?: unknown };
  return typeof obj.lat === "number" && Number.isFinite(obj.lat) && Math.abs(obj.lat) <= 90 &&
    typeof obj.lng === "number" && Number.isFinite(obj.lng) && Math.abs(obj.lng) <= 180
    ? { lat: obj.lat, lng: obj.lng } : null;
}

export async function POST(request: Request) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  if (!isTrustedEpochAiOrigin(request.headers.get("origin"), process.env.NODE_ENV ?? "development", process.env.EPOCH_ALLOWED_ORIGINS ?? "")) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limit = checkRateLimit(`epoch-ai-multi-route:${session.user.id}`, 4, 10 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Route-check limit reached; try later." }, { status: 429 });
  const key = (process.env.HERE_ROUTING_API_KEY || process.env.HERE_API_KEY)?.trim();
  if (!key) return NextResponse.json({ error: "HERE routing key is not configured on the server." }, { status: 503 });

  let raw: string;
  try {
    raw = await request.text();
    if (raw.length > 1800) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  } catch { return NextResponse.json({ error: "Cannot read request." }, { status: 400 }); }
  let body: unknown;
  try { body = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid route stops or time allowances." }, { status: 400 });
  const input = parsed.data;
  if (input.stops.some((stop, i) => i > 0 && stop.toLocaleLowerCase() === input.stops[i - 1].toLocaleLowerCase())) {
    return NextResponse.json({ error: "Consecutive stops must differ." }, { status: 400 });
  }
  // Keep the number of external HERE calls bounded: at most 7 geocodes + 6 routes.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  const hereFetch = async (url: URL): Promise<unknown> => {
    const result = await fetch(url.toString(), { method: "GET", cache: "no-store", signal: controller.signal });
    if (!result.ok) throw new Error(`HERE HTTP ${result.status}`);
    return result.json() as Promise<unknown>;
  };

  try {
    const positions = new Map<string, Position>();
    for (const stop of input.stops) {
      const normalized = stop.toLocaleLowerCase();
      if (positions.has(normalized)) continue;
      const url = new URL("https://geocode.search.hereapi.com/v1/geocode");
      url.searchParams.set("q", stop);
      url.searchParams.set("limit", "1");
      url.searchParams.set("apiKey", key);
      const response = await hereFetch(url) as { items?: Array<{ position?: unknown }> };
      const position = positionFrom(response?.items?.[0]?.position);
      if (!position) throw new Error("Geocoding unavailable");
      positions.set(normalized, position);
    }

    const segments: RoadSegmentInput[] = [];
    const providerWarnings: string[] = [];
    const legs: Array<{ from: string; to: string; distanceKm: number; drivingMinutes: number; coachAccess: "unverified" | "restriction-reported" }> = [];
    for (let i = 0; i < input.stops.length - 1; i++) {
      const from = input.stops[i], to = input.stops[i + 1];
      const origin = positions.get(from.toLocaleLowerCase())!;
      const destination = positions.get(to.toLocaleLowerCase())!;
      const url = new URL("https://router.hereapi.com/v8/routes");
      url.searchParams.set("transportMode", "car");
      url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
      url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
      url.searchParams.set("return", "summary");
      url.searchParams.set("apiKey", key);
      const assessment = assessHereRouteResponse(await hereFetch(url));
      if (assessment.status === "unavailable" || assessment.distanceKm === null || assessment.drivingMinutes === null) {
        throw new Error("Incomplete route assessment");
      }
      const coachAccess = assessment.status === "critical-restriction" ? "restriction-reported" : "unverified";
      segments.push({ from, to, distanceKm: assessment.distanceKm, drivingMinutes: assessment.drivingMinutes, evidence: "routing-service", coachAccess });
      legs.push({ from, to, distanceKm: assessment.distanceKm, drivingMinutes: assessment.drivingMinutes, coachAccess });
      providerWarnings.push(...assessment.warnings.map(w => `Leg ${i + 1}: ${w}`));
    }

    const report = buildRouteFeasibilitySummary({
      day: { day: input.day, visitMinutes: input.visitMinutes, massMinutes: input.massMinutes,
        lunchMinutes: input.lunchMinutes, operationalBufferMinutes: input.operationalBufferMinutes,
        fixedAppointments: input.fixedAppointments },
      segments,
    });
    return NextResponse.json({
      legs,
      report: {
        ...report,
        // This is only the declared set of legs; never assert the day is complete.
        warnings: [...new Set([...providerWarnings, ...report.warnings,
          "Only the entered stops were calculated; confirm all daily stops and transfers are included.",
          "HERE car routing does not verify full-size coach access, legal driving hours, or stop facilities."])],
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Provider URLs include the secret key: never log errors or request URLs.
    console.error("EPOCH_HERE_MULTI_ROUTE_FAILED", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ error: controller.signal.aborted
      ? "HERE route review timed out. Use fewer stops." : "HERE could not calculate all legs. No partial day total was accepted." },
      { status: controller.signal.aborted ? 504 : 502 });
  } finally { clearTimeout(timer); }
}
