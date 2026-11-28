import type { FixedCostRow } from "@/components/quotes/create/FixedCostsSection";
import type { OperationalCostCategory } from "@/components/quotes/create/OperationalCostsSection";
import { itineraryDays } from "@/lib/epoch-ai/hotelStayCities";
import type { QuotePreparationFerry } from "./epochQuotePreparation";

type OperationalDraft = { category: OperationalCostCategory; label: string; numberOfDays: number };
type DailyService = { category: OperationalCostCategory; label: string };

const serviceLabels: Record<string, OperationalCostCategory> = {
  coach: "BUS", bus: "BUS", transfer: "TRANSFER", transfers: "TRANSFER",
  guide: "TOUR_GUIDE", "local guide": "TOUR_GUIDE", "tour manager": "TOUR_MANAGER",
};

const pending = /\b(?:optional|own expense|if time permits|to be decided|no service|not included|none|TBC)\b/i;

export function prepareItineraryQuoteServices(
  itinerary: string | null | undefined,
  startDate: string,
  endDate: string,
  ferries: readonly QuotePreparationFerry[],
  includedHotelDinners: ReadonlySet<string> = new Set(),
) {
  const days = itineraryDays(itinerary, startDate || undefined).filter(({date}) => !date || !endDate || date <= endDate);
  const fixed: FixedCostRow[] = [];
  const operational: OperationalDraft[] = [];
  const lunchDays: number[] = [];
  const dinnerDays: number[] = [];
  const mass: string[] = [];
  const tourManagerDays = new Set<number>();
  const tourManagerNotes = new Set<string>();
  const ferryDates = new Set(ferries.flatMap(ferry => ferry.checkIn ? [ferry.checkIn] : []));
  const ferryDays = new Set(ferries.filter(ferry => !ferry.checkIn).map(ferry => ferry.day));

  for (const {day, date, heading, block} of days) {
    if (/\b(?:depart(?: from)? (?:the )?(?:USA|US|United States)|outbound flight|overnight flight to)\b/i.test(heading)) continue;
    const mealLine = block.match(/^[ \t]*Meals:[ \t]*([^\r\n]+)/im)?.[1] ?? "";
    const arrival = day === days[0]?.day || /\barriv(?:e|al)\b/i.test(heading);
    const departing = day === days.at(-1)?.day || Boolean(endDate && date === endDate);
    if (!arrival && !departing && /(?:^|\|)\s*L✓/i.test(mealLine)) lunchDays.push(day);
    if (!departing && !ferryDays.has(day) && (!date || (!includedHotelDinners.has(date) && !ferryDates.has(date))) &&
        /(?:^|\|)\s*D✓/i.test(mealLine) && !/\bdinner (?:at|in) (?:the |your )?hotel\b/i.test(block)) dinnerDays.push(day);

    const daily = new Map<string, DailyService>();
    for (const [, head, text] of block.matchAll(/^[ \t]*(Coach|Bus|Transfers?|Guide|Local guide|Tour manager|Entrance(?: fees?)?|Admissions?|Mass|Mass offering):[ \t]*([^\r\n]+)/gim)) {
      const key = head.toLowerCase();
      const detail = text.trim();
      if (!detail || pending.test(detail)) continue;
      const label = `Day ${day} · ${detail}`;
      if (key === "mass") {
        if (!/^no mass\b/i.test(detail)) mass.push(label);
      } else if (key === "mass offering" || /^(entrance|admission)/.test(key)) {
        fixed.push({category: key === "mass offering" ? "MASS_CHURCH" : "ENTRANCE", label, quantity: 1, unitCost: 0});
      } else if (key === "tour manager") {
        tourManagerDays.add(day);
        tourManagerNotes.add(label);
      } else {
        daily.set(`${serviceLabels[key]}:${detail.toLowerCase()}`, {category: serviceLabels[key], label});
      }
    }
    const narrativeCoach = block.match(/(?:^|[.!?\n])\s*((?:travel|continue|drive) by (?:private )?(?:coach|bus)\b[^.!?\n]*)/i)?.[1];
    if (narrativeCoach && !pending.test(narrativeCoach) && ![...daily.values()].some(service => service.category === "BUS")) {
      daily.set("coach-narrative", {category: "BUS", label: `Day ${day} · ${narrativeCoach.trim()}`});
    }
    operational.push(...[...daily.values()].map(service => ({...service, numberOfDays: 1})));
  }
  if (lunchDays.length) fixed.push({category: "LUNCH", label: "Itinerary lunches", quantity: lunchDays.length, unitCost: 0});
  if (dinnerDays.length) fixed.push({category: "DINNER", label: "Itinerary dinners", quantity: dinnerDays.length, unitCost: 0});
  if (tourManagerDays.size) {
    operational.push({category: "TOUR_MANAGER", label: "Itinerary tour manager", numberOfDays: tourManagerDays.size});
  }
  operational.push(...ferries.map(ferry => ({
    category: "FERRY" as const, label: [ferry.label, ferry.checkIn].filter(Boolean).join(" · "), numberOfDays: 1,
  })));
  const notes = [
    lunchDays.length ? `Planned lunches to price: days ${lunchDays.join(", ")}.` : "",
    dinnerDays.length ? `Planned dinners to price: days ${dinnerDays.join(", ")}.` : "",
    ...(mass.length ? ["Mass arrangements:", ...mass] : []),
    ...(tourManagerNotes.size ? ["Tour manager itinerary notes:", ...tourManagerNotes] : []),
  ].filter(Boolean);
  return {fixed, operational, notes};
}

/** Replace only untouched rows from the previous proposal, and keep existing same-service entries. */
export function mergeItineraryDraftRows<T extends {label: string; category: string}>(
  rows: T[], previous: readonly T[], drafts: T[],
) {
  const remaining = rows.filter(row => !previous.includes(row));
  const key = (row: T) => ["LUNCH", "DINNER", "TOUR_MANAGER"].includes(row.category)
    ? row.category : `${row.category}:${row.label.trim().toLowerCase()}`;
  const existing = new Set(remaining.map(key));
  const added = drafts.filter(row => {
    const identity = key(row);
    if (existing.has(identity)) return false;
    existing.add(identity);
    return true;
  });
  return {rows: [...remaining, ...added], added};
}
