import type { PilgrimageStoryDraft } from "./pilgrimageStoryDraft";

type Meal = PilgrimageStoryDraft["dailyMeals"][number];

export function summarizeMealPlan(days: Meal[]): string {
  if (!days.length) return "Breakfast and dinner planned as standard where applicable; lunch included only on approved days. Confirm arrival/departure meal arrangements.";
  const includedLunch = days.filter((day) => day.lunch === "Included").map((day) => day.day);
  const ownLunch = days.filter((day) => day.lunch === "Own").map((day) => day.day);
  const pending = days.filter((day) => day.breakfast === "?" || day.lunch === "?" || day.dinner === "?").map((day) => day.day);
  return [
    "Breakfast and dinner planned as standard on applicable days (subject to flight and hotel timings).",
    includedLunch.length ? `Included lunches on Day(s) ${includedLunch.join(", ")} — approved for planning, supplier arrangements and costs still to be confirmed.` : "No included lunches selected.",
    ownLunch.length ? `Lunch at pilgrims' own expense on Day(s) ${ownLunch.join(", ")}.` : "",
    pending.length ? `Meal arrangements require review on Day(s) ${pending.join(", ")}.` : "",
  ].filter(Boolean).join(" ");
}

export function formatMealLine(day: Meal): string {
  const symbol = (status: Meal["breakfast"]) => status === "Included" ? "✓" : status === "Own" ? "*" : "?";
  return `Meals: B${symbol(day.breakfast)} | L${symbol(day.lunch)} | D${symbol(day.dinner)} (✓ planned included, * own expense, ? review)`;
}
