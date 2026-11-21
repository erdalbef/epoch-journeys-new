// Proposed tour inclusions are not booked or quoted services.
// Derived only from explicitly reviewed tour-meal decisions and itinerary text.
export type MealDecision = {
  day: number;
  breakfast: "Included" | "Own" | "?";
  lunch: "Included" | "Own" | "?";
  dinner: "Included" | "Own" | "?";
};

export type InclusionProposal = {
  inclusions: string[];
  exclusions: string[];
  warnings: string[];
};

export function proposeTourInclusions(itinerary: string, meals: MealDecision[]): InclusionProposal {
  const text = itinerary.toLowerCase();
  const inclusions: string[] = [];
  const exclusions: string[] = [];
  const warnings: string[] = [];
  const add = (arr: string[], item: string) => { if (!arr.includes(item)) arr.push(item); };
  // A proposed operating policy is not evidence of a supplier booking.
  if (/overnight|hotel|accommodation/.test(text)) add(inclusions, "Hotel accommodation as specified in the itinerary (hotel allocation subject to confirmation)");
  if (meals.length) {
    const includedB = meals.filter(x => x.breakfast === "Included").map(x => x.day);
    const includedD = meals.filter(x => x.dinner === "Included").map(x => x.day);
    const includedL = meals.filter(x => x.lunch === "Included").map(x => x.day);
    const ownL = meals.filter(x => x.lunch === "Own").map(x => x.day);
    const unresolved = meals.filter(x => [x.breakfast, x.lunch, x.dinner].includes("?")).map(x => x.day);
    if (includedB.length) add(inclusions, `Breakfast included (Days ${includedB.join(", ")}; early/boxed breakfast if required)`);
    if (includedD.length) add(inclusions, `Dinner included (Days ${includedD.join(", ")}; hotel or local restaurant as shown in itinerary)`);
    if (includedL.length) add(inclusions, `Lunch included on Days ${includedL.join(", ")} only (arrangements subject to confirmation)`);
    if (ownL.length) add(exclusions, `Lunches at pilgrims' own expense on Days ${ownL.join(", ")}`);
    if (unresolved.length) {
      const days = [...new Set(unresolved)];
      warnings.push(`Unresolved meal status on ${days.length === 1 ? "Day" : "Days"} ${days.join(", ")}. Confirm before publication.`);
    }
    if (includedL.length) warnings.push("Verify every included lunch against the quotation, using an estimated rate when necessary.");
  } else {
    warnings.push("No reviewed daily B/L/D decisions found. Review meal arrangements before applying inclusions.");
  }
  // Only mention operations when they are visibly part of the source program.
  if (/private (?:air.conditioned )?(?:coach|bus)|touring coach/.test(text)) add(inclusions, "Private touring coach as described in the itinerary (subject to supplier confirmation)");
  if (/airport transfer|transfer to the hotel|transfer .* airport/.test(text)) add(inclusions, "Airport transfers as specified in the itinerary");
  if (/boat (?:trip|excursion|cruise)|lunch cruise/.test(text)) {
    warnings.push("Boat excursions are described in the itinerary. Confirm whether tickets and any meals are included in the quotation before adding them to inclusions.");
  }
  if (/\bmass\b/.test(text)) warnings.push("Daily Mass is planned. Check celebrant, church permissions and any related fees; do not label reservations confirmed without evidence.");
  warnings.push("Review airfare, insurance, entrance fees, headsets, porterage, tips and guides separately. The itinerary alone does not establish their commercial inclusion or exclusion.");
  warnings.push("Estimated supplier costs are acceptable in a draft quotation; flag missing costs or contradictions during the final commercial audit.");
  return { inclusions, exclusions, warnings };
}
