/** Epoch Journeys: auditable complimentary-traveler expense allocation.
 * All prices here are supplier NET costs, NOT selling rates.
 * Core coach and other group totals must not be added again for COMPs.
 */
export type CompAccommodation = "SINGLE" | "DOUBLE_TWIN" | "TRIPLE" | "NONE";

export type CompExpenseProfile = {
  accommodation: CompAccommodation;
  extrasPerTraveler: number;
  supplierCreditPerTraveler: number;
};

export type CompExpenseSettings = {
  priestCostProfile?: Partial<CompExpenseProfile>;
  leaderCostProfile?: Partial<CompExpenseProfile>;
  otherCostProfile?: Partial<CompExpenseProfile>;
};

export type CompExpenseLine = {
  category: "PRIEST" | "GROUP_LEADER" | "OTHER";
  travelers: number;
  accommodation: CompAccommodation;
  hotelPerTraveler: number;
  servicesPerTraveler: number;
  extrasPerTraveler: number;
  supplierCreditPerTraveler: number;
  netTotal: number;
};

const positive = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
const count = (v: unknown) => Math.floor(positive(v));
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const allowed = new Set<CompAccommodation>(["SINGLE", "DOUBLE_TWIN", "TRIPLE", "NONE"]);

export function normalizeCompProfile(input?: Partial<CompExpenseProfile>): CompExpenseProfile {
  return {
    accommodation: input?.accommodation && allowed.has(input.accommodation) ? input.accommodation : "DOUBLE_TWIN",
    extrasPerTraveler: positive(input?.extrasPerTraveler),
    supplierCreditPerTraveler: positive(input?.supplierCreditPerTraveler),
  };
}

export function calculateComplimentaryExpenses(input: {
  payingPassengers: number;
  complimentaryPassengers: number;
  priestPassengers: number;
  groupLeaderPassengers: number;
  hotelSinglePerPerson: number;
  hotelDoubleTwinPerPerson: number;
  hotelTriplePerPerson: number;
  otherPerPersonCost: number;
  settings?: CompExpenseSettings;
}) {
  const paying = count(input.payingPassengers);
  const comp = count(input.complimentaryPassengers);
  const priest = Math.min(count(input.priestPassengers), comp);
  const leader = Math.min(count(input.groupLeaderPassengers), comp - priest);
  const other = comp - priest - leader;
  const hotel: Record<CompAccommodation, number> = {
    SINGLE: positive(input.hotelSinglePerPerson),
    DOUBLE_TWIN: positive(input.hotelDoubleTwinPerPerson),
    TRIPLE: positive(input.hotelTriplePerPerson),
    NONE: 0,
  };
  const services = positive(input.otherPerPersonCost);
  const rows: Array<[CompExpenseLine["category"], number, CompExpenseProfile]> = [
    ["PRIEST", priest, normalizeCompProfile(input.settings?.priestCostProfile)],
    ["GROUP_LEADER", leader, normalizeCompProfile(input.settings?.leaderCostProfile)],
    ["OTHER", other, normalizeCompProfile(input.settings?.otherCostProfile)],
  ];
  const lines: CompExpenseLine[] = rows.map(([category, travelers, profile]) => {
    const hotelPerTraveler = hotel[profile.accommodation];
    const gross = hotelPerTraveler + services + profile.extrasPerTraveler;
    // Never let an unverified supplier benefit turn a traveler into a negative expense.
    const credit = Math.min(gross, profile.supplierCreditPerTraveler);
    return {
      category, travelers, accommodation: profile.accommodation,
      hotelPerTraveler: round2(hotelPerTraveler),
      servicesPerTraveler: round2(services),
      extrasPerTraveler: round2(profile.extrasPerTraveler),
      supplierCreditPerTraveler: round2(credit),
      netTotal: round2((gross - credit) * travelers),
    };
  });
  const totalExpense = round2(lines.reduce((sum, line) => sum + line.netTotal, 0));
  return {
    lines,
    complimentaryPassengers: comp,
    payablePassengers: paying,
    totalExpense,
    expensePerPayingPassenger: paying > 0 ? round2(totalExpense / paying) : 0,
    namedCountExceedsComps: count(input.priestPassengers) + count(input.groupLeaderPassengers) > comp,
    unpricedAccommodation: lines.filter(line =>
      line.travelers > 0 && line.accommodation !== "NONE" && line.hotelPerTraveler === 0
    ).map(line => line.category),
  };
}
