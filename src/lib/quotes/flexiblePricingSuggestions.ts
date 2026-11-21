/** Admin-only drafts based on NET rates already calculated and saved with a quote.
 * These are NOT published or automatically approved. No supplier costing is exposed.
 * Mirrors the quote builder's complimentary policy for each PAYING pilgrim tier.
 */
export type SuggestedTier = {
  payingPilgrims: number;
  complimentaryPilgrims: number;
  single: number;
  doubleTwin: number;
  triple: number | null;
  roomArrangements: string;
  note: string;
};

type RecordLike = Record<string, unknown>;
const obj = (input: unknown): RecordLike => input && typeof input === "object" && !Array.isArray(input) ? input as RecordLike : {};
const positiveInt = (v: unknown): number => Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0;
const positiveRate = (v: unknown): number => Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0;

export function suggestedComplimentaryCount(paying: number, setupValue: unknown): number {
  const s = obj(setupValue);
  if (s.complimentaryMode === "MANUAL") return positiveInt(s.manualComplimentaryPassengers);
  const ratio = s.useFreePlaceRule === true && positiveInt(s.freePlaceRatio) > 0
    ? Math.floor(paying / positiveInt(s.freePlaceRatio)) : 0;
  const spiritual = s.priestComplimentary === true ? positiveInt(s.priestCount) : 0;
  const leader = s.groupLeaderComplimentary === true ? positiveInt(s.groupLeaderCount) : 0;
  const pool = (s.priestComplimentaryBasis === "USES_FREE_PLACE" ? spiritual : 0)
    + (s.groupLeaderComplimentaryBasis === "USES_FREE_PLACE" ? leader : 0);
  const extra = (s.priestComplimentaryBasis === "ADDITIONAL" ? spiritual : 0)
    + (s.groupLeaderComplimentaryBasis === "ADDITIONAL" ? leader : 0);
  return ratio + Math.max(0, pool - ratio) + extra + positiveInt(s.additionalFreePassengers);
}

function roomName(v: unknown): string {
  switch (v) {
    case "SINGLE": return "Single";
    case "TRIPLE": return "Triple";
    case "NONE": return "no hotel accommodation";
    default: return "Double/Twin";
  }
}
function suggestedRooms(count: number, setupValue: unknown): string {
  if (count < 1) return "No complimentary pilgrims";
  const s = obj(setupValue);
  const entries: string[] = [];
  const spiritual = Math.min(count, s.priestComplimentary === true ? positiveInt(s.priestCount) : 0);
  const leader = Math.min(count - spiritual, s.groupLeaderComplimentary === true ? positiveInt(s.groupLeaderCount) : 0);
  const other = Math.max(0, count - spiritual - leader);
  if (spiritual) entries.push(`Spiritual Leader: ${spiritual} × ${roomName(obj(s.priestCostProfile).accommodation)}`);
  if (leader) entries.push(`Group Leader: ${leader} × ${roomName(obj(s.leaderCostProfile).accommodation)}`);
  if (other) entries.push(`Other complimentary pilgrims: ${other} × ${roomName(obj(s.otherCostProfile).accommodation)}`);
  return entries.join("; ");
}

export function getSavedCalculatedSuggestions(summaryValue: unknown): SuggestedTier[] {
  const summary = obj(summaryValue);
  const rows = summary.paxPricingRows;
  if (!Array.isArray(rows)) return [];
  const current = positiveInt(summary.payingPassengers);
  const mode = summary.pricingMode === "MANUAL" ? "MANUAL" : "CALCULATED";
  const unique = new Set<number>();
  const result: SuggestedTier[] = [];
  for (const item of rows) {
    const row = obj(item);
    const paying = positiveInt(row.paxCount);
    if (paying < 1 || paying === current || unique.has(paying)) continue;
    const rate = (calculatedKey: string, manualKey: string) => {
      const manual = positiveRate(row[manualKey]);
      return mode === "MANUAL" && manual > 0 ? manual : positiveRate(row[calculatedKey]);
    };
    const single = rate("calculatedSinglePrice", "manualSinglePrice");
    const doubleTwin = rate("calculatedDoubleTwinPrice", "manualDoubleTwinPrice");
    if (single <= 0 || doubleTwin <= 0) continue;
    const tripleValue = rate("calculatedTriplePrice", "manualTriplePrice");
    const comps = suggestedComplimentaryCount(paying, summary.complimentarySetup);
    result.push({
      payingPilgrims: paying,
      complimentaryPilgrims: comps,
      single,
      doubleTwin,
      triple: tripleValue > 0 ? tripleValue : null,
      roomArrangements: suggestedRooms(comps, summary.complimentarySetup),
      note: "",
    });
    unique.add(paying);
    if (result.length === 12) break;
  }
  return result.sort((a, b) => a.payingPilgrims - b.payingPilgrims);
}
