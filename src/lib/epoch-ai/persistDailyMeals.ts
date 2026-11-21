/** Round-trip daily meal decisions through the existing Tour.itinerary text field.
 * No schema migration or second record is required. An explicit Tour save is still necessary.
 */
import type { PilgrimageStoryDraft } from "./pilgrimageStoryDraft";
import { formatMealLine } from "./pilgrimageMealPolicy";

type DailyMeal = PilgrimageStoryDraft["dailyMeals"][number];
type Status = DailyMeal["breakfast"];

const heading = /^\s*Day\s+0*(\d{1,3})\b/i;
const marker = /^\s*Meals:\s*B([✓*?])\s*\|\s*L([✓*?])\s*\|\s*D([✓*?])/i;

function asStatus(symbol: string): Status {
  return symbol === "✓" ? "Included" : symbol === "*" ? "Own" : "?";
}

export function readDailyMealsFromItinerary(itinerary: string): DailyMeal[] {
  const lines = itinerary.split(/\r?\n/);
  const found = new Map<number, DailyMeal>();
  let currentDay: number | null = null;
  for (const line of lines) {
    const dayMatch = heading.exec(line);
    if (dayMatch) currentDay = Number(dayMatch[1]);
    if (currentDay === null) continue;
    const match = marker.exec(line);
    if (match) {
      found.set(currentDay, {
        day: currentDay,
        breakfast: asStatus(match[1]),
        lunch: asStatus(match[2]),
        dinner: asStatus(match[3]),
      });
    }
  }
  return Array.from(found.values()).sort((a, b) => a.day - b.day);
}

export function missingMealDayHeadings(itinerary: string, meals: DailyMeal[]): number[] {
  const found = new Set<number>();
  for (const line of itinerary.split(/\r?\n/)) {
    const match = heading.exec(line);
    if (match) found.add(Number(match[1]));
  }
  return meals.map((meal) => meal.day).filter((day) => !found.has(day));
}

export function mergeDailyMealsIntoItinerary(itinerary: string, meals: DailyMeal[]): string {
  if (meals.length === 0) return itinerary;
  const byDay = new Map(meals.map((meal) => [meal.day, meal]));
  const lines = itinerary.split(/\r?\n/);
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    result.push(line);
    const match = heading.exec(line);
    if (!match) continue;
    const meal = byDay.get(Number(match[1]));
    if (!meal) continue;
    // Replace an existing generated marker instead of accumulating copies.
    if (i + 1 < lines.length && marker.test(lines[i + 1])) i++;
    result.push(formatMealLine(meal));
  }
  return result.join(itinerary.includes("\r\n") ? "\r\n" : "\n");
}
