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
  days: z.array(z.object({
    day: z.number().int().min(1).max(30),
    stops: z.array(z.string().trim().min(2).max(120)).min(2).max(5),
  }).strict()).min(1).max(3),
}).strict();
type Point = { lat: number; lng: number };
function position(value: unknown): Point | null {
  if (typeof value !== "object" || !value) return null;
  const p = value as { lat?: unknown; lng?: unknown };
  return typeof p.lat === "number" && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 &&
    typeof p.lng === "number" && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180
    ? { lat: p.lat, lng: p.lng } : null;
}

export async function POST(request: Request) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  if (!isTrustedEpochAiOrigin(request.headers.get("origin"), process.env.NODE_ENV ?? "development", process.env.EPOCH_ALLOWED_ORIGINS ?? "")) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limit = checkRateLimit(`epoch-ai-full-route:${session.user.id}`, 12, 10 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Full-route check limit reached; retry later." }, { status: 429 });
  const key = (process.env.HERE_ROUTING_API_KEY || process.env.HERE_API_KEY)?.trim();
  if (!key) return NextResponse.json({ error: "HERE key is unavailable." }, { status: 503 });
  let input: z.infer<typeof requestSchema>;
  try {
    const text = await request.text();
    if (text.length > 2500) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    input = requestSchema.parse(JSON.parse(text));
  } catch { return NextResponse.json({ error: "Invalid route request." }, { status: 400 }); }
  if (new Set(input.days.map(d => d.day)).size !== input.days.length ||
    input.days.some(d => d.stops.some((s, i) => i > 0 && s.toLocaleLowerCase() === d.stops[i - 1].toLocaleLowerCase()))) {
    return NextResponse.json({ error: "Duplicate days or consecutive stops." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 48_000);
  const fetchHere = async (url: URL): Promise<unknown> => {
    const response = await fetch(url.toString(), { method: "GET", cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HERE HTTP ${response.status}`);
    return response.json() as Promise<unknown>;
  };
  try {
    const cache = new Map<string, Point>();
    async function geocode(place: string): Promise<Point> {
      const token = place.toLocaleLowerCase();
      const cached = cache.get(token);
      if (cached) return cached;
      const url = new URL("https://geocode.search.hereapi.com/v1/geocode");
      url.searchParams.set("q", place); url.searchParams.set("limit", "1"); url.searchParams.set("apiKey", key!);
      const result = await fetchHere(url) as { items?: Array<{ position?: unknown }> };
      const point = position(result?.items?.[0]?.position);
      if (!point) throw new Error("Geocoding unavailable");
      cache.set(token, point);
      return point;
    }
    const output = [];
    for (const day of input.days) {
      const segments: RoadSegmentInput[] = [];
      const legs = [];
      let critical = false;
      for (let i = 1; i < day.stops.length; i++) {
        const from = day.stops[i - 1], to = day.stops[i];
        const a = await geocode(from), b = await geocode(to);
        const url = new URL("https://router.hereapi.com/v8/routes");
        url.searchParams.set("transportMode", "car");
        url.searchParams.set("origin", `${a.lat},${a.lng}`);
        url.searchParams.set("destination", `${b.lat},${b.lng}`);
        url.searchParams.set("return", "summary");
        url.searchParams.set("apiKey", key);
        const assessment = assessHereRouteResponse(await fetchHere(url));
        if (assessment.distanceKm === null || assessment.drivingMinutes === null || assessment.status === "unavailable") {
          throw new Error("Route incomplete");
        }
        const coachAccess = assessment.status === "critical-restriction" ? "restriction-reported" : "unverified";
        if (coachAccess === "restriction-reported") critical = true;
        segments.push({ from, to, distanceKm: assessment.distanceKm, drivingMinutes: assessment.drivingMinutes,
          evidence: "routing-service", coachAccess });
        legs.push({ from, to, distanceKm: assessment.distanceKm, drivingMinutes: assessment.drivingMinutes });
      }
      const report = buildRouteFeasibilitySummary({
        day: { day: day.day, visitMinutes: null, massMinutes: null, lunchMinutes: null,
          operationalBufferMinutes: null, fixedAppointments: true },
        segments,
      });
      output.push({ day: day.day, legs,
        distanceKm: report.distanceKm, drivingMinutes: report.drivingMinutes,
        estimatedBreaks: report.recommendedBreakCount, critical,
        warnings: report.warnings,
        status: critical ? "critical-review" : "incomplete-review" });
    }
    return NextResponse.json({ days: output, disclaimer: "Provisional HERE car routes for explicitly reviewed stops only. Mass, visits, lunch, coach suitability, stop facilities and omitted transfers remain unverified." },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Never log HERE URLs: they contain an API credential.
    console.error("EPOCH_FULL_ROUTE_CHECK_FAILED", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ error: controller.signal.aborted ?
      "HERE request timed out. Try reviewing fewer days." : "Could not validate the selected route batch. No partial totals accepted." },
      { status: controller.signal.aborted ? 504 : 502 });
  } finally { clearTimeout(timer); }
}
