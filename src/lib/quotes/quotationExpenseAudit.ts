/**
 * Read-only audit of the data already saved in quoteBuilderSummary.
 * It does not recalculate quotations or change any supplier data.
 */
export type OperationalAuditLine = {
  label: string;
  category: string;
  categoryDisplay: string;
  labelCategoryMismatch: boolean;
  serviceSubtotal: number | null;
  staffAccommodation: number | null;
  staffTransportation: number | null;
  staffMeals: number | null;
  staffOther: number | null;
  breakdownDifference: number | null;
  scope: "CORE" | "PRE" | "POST";
  basis: string;
  groupTotal: number | null;
  perPayingPassenger: number | null;
};

export type PerPersonAuditLine = {
  label: string;
  category: string;
  quantity: number;
  unitCost: number;
  perTraveler: number;
  allTravelersTotal: number;
};

export type PorterageAudit = {
  hotelIncluded: string[];
  hotelExtrasSelected: string[];
  perPersonEntries: Array<{ label: string; perTraveler: number }>;
  possibleOverlap: boolean;
};

export type QuoteExpenseAudit = {
  lines: OperationalAuditLine[];
  coreLines: OperationalAuditLine[];
  optionalLines: OperationalAuditLine[];
  coreTotalFromRows: number;
  coreTotalFromSummary: number | null;
  coreDifference: number | null;
  missingOperationalTotals: number;
  perPersonLines: PerPersonAuditLine[];
  perPersonTotal: number;
  perPersonSnapshot: number | null;
  porterage: PorterageAudit;
};

function record(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function entries(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map(record).filter((v): v is Record<string, unknown> => v !== null);
}

function txt(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nonnegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

function scopeOf(value: unknown): OperationalAuditLine["scope"] {
  return value === "PRE" || value === "POST" ? value : "CORE";
}

/**
 * The saved operationalCostRows[].totalCost is computed by the EXISTING form
 * using operationalDisplayTotal(). This preserves per-person service basis,
 * total travelers and ancillary staff cost rules without guessing them here.
 */
export function auditQuotationExpenses(summary: unknown): QuoteExpenseAudit {
  const data = record(summary) ?? {};
  const snapshot = record(data.costingSnapshot);
  const paying = nonnegativeNumber(snapshot?.payingPassengers ?? data.payingPassengers) ?? 0;

  const totalTravelers = (nonnegativeNumber(snapshot?.totalTravelers) ?? nonnegativeNumber(data.totalPassengers) ?? paying);
  const perPersonLines: PerPersonAuditLine[] = entries(data.fixedCostRows)
    .map((row): PerPersonAuditLine => {
      const quantity = nonnegativeNumber(row.quantity) ?? 0;
      const unitCost = nonnegativeNumber(row.unitCost) ?? 0;
      const perTraveler = quantity * unitCost;
      return {
        label: txt(row.label) || txt(row.category) || "Per-person service",
        category: txt(row.category) || "OTHER",
        quantity, unitCost, perTraveler,
        allTravelersTotal: perTraveler * totalTravelers,
      };
    });
  const perPersonTotal = perPersonLines.reduce((sum, line) => sum + line.perTraveler, 0);
  const perPersonSnapshot = nonnegativeNumber(snapshot?.otherPerPayingPax);
  const displayCategories: Record<string, string> = {
    BUS: "Bus / Coach", TOUR_GUIDE: "Local / Tour Guide", TOUR_MANAGER: "Tour Manager",
    ASSISTANT: "Assistant", TRANSFERMAN: "Transferman", DRIVER: "Driver",
    FERRY: "Ferry", TRANSFER: "Transportation / Transfer", OTHER: "Other",
  };
  const lines = entries(data.operationalCostRows).map((row, index): OperationalAuditLine => {
    const scope = scopeOf(row.scope);
    const category = txt(row.category);
    const categoryDisplay = displayCategories[category] || category.replaceAll("_", " ") || `Operational item ${index + 1}`;
    const label = txt(row.label);
    const groupTotal = nonnegativeNumber(row.totalCost);
    const rate = nonnegativeNumber(row.dailyRate);
    const quantity = nonnegativeNumber(row.numberOfDays);
    const contract = nonnegativeNumber(row.totalContractCost);
    const serviceAmount = row.costMode === "TOTAL" ? contract :
      row.costMode === "DAILY" && rate !== null && quantity !== null ? rate * quantity : null;
    const serviceSubtotal = serviceAmount === null ? null :
      txt(row.pricingBasis) === "PER_PERSON" && scope === "CORE" ? serviceAmount * totalTravelers : serviceAmount;
    const hotelRate = nonnegativeNumber(row.hotelPerNight);
    const hotelNights = nonnegativeNumber(row.hotelNights);
    const staffAccommodation = hotelRate === null || hotelNights === null ? null : hotelRate * hotelNights;
    const staffTransportation = nonnegativeNumber(row.airfareTransport);
    const mealsPerDay = nonnegativeNumber(row.mealsPerDay);
    const mealDays = nonnegativeNumber(row.mealDays);
    const staffMeals = mealsPerDay === null || mealDays === null ? null : mealsPerDay * mealDays;
    const staffOther = nonnegativeNumber(row.otherExpenses);
    const components = [serviceSubtotal, staffAccommodation, staffTransportation, staffMeals, staffOther];
    const breakdownDifference = groupTotal === null || components.some((value) => value === null)
      ? null : groupTotal - components.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const labelCategoryMismatch = Boolean(label) &&
      normalized(label) !== normalized(categoryDisplay) &&
      normalized(label) === normalized("Bus / Coach") && category !== "BUS";
    return {
      label: label || categoryDisplay,
      category, categoryDisplay, labelCategoryMismatch,
      serviceSubtotal, staffAccommodation, staffTransportation, staffMeals, staffOther,
      breakdownDifference,
      scope,
      basis: txt(row.pricingBasis).replaceAll("_", " ") || "Not specified",
      groupTotal,
      perPayingPassenger: scope === "CORE" && groupTotal !== null && paying > 0
        ? groupTotal / paying : null,
    };
  });
  const coreLines = lines.filter(line => line.scope === "CORE");
  const optionalLines = lines.filter(line => line.scope !== "CORE");
  const coreTotalFromRows = coreLines.reduce((sum, line) => sum + (line.groupTotal ?? 0), 0);
  const summaryTotal = nonnegativeNumber(snapshot?.coreGroupOperationalTotal)
    ?? (() => {
      const perPayer = nonnegativeNumber(snapshot?.groupOperationalPerPayingPax);
      return perPayer !== null && paying > 0 ? perPayer * paying : null;
    })();
  const missingOperationalTotals = coreLines.filter(line => line.groupTotal === null).length;
  const coreDifference = summaryTotal === null || missingOperationalTotals > 0 || coreLines.length === 0
    ? null : coreTotalFromRows - summaryTotal;

  const hotels = entries(data.hotels).filter(h => txt(h.stayType) === "CORE" || !txt(h.stayType));
  const hotelIncluded = hotels
    .filter(h => h.supplierPorterageIncluded === true)
    .map(h => txt(h.hotelName) || "Unnamed hotel");
  const hotelExtrasSelected = hotels
    .filter(h => h.supplierPorterageIncluded !== true && h.supplierPorterageSelected === true)
    .map(h => txt(h.hotelName) || "Unnamed hotel");
  const perPersonEntries = entries(data.fixedCostRows)
    .filter(r => txt(r.category).toUpperCase() === "PORTERAGE")
    .map((r) => ({
      label: txt(r.label) || "Porterage (per-person)",
      perTraveler: (nonnegativeNumber(r.quantity) ?? 0) * (nonnegativeNumber(r.unitCost) ?? 0),
    }))
    .filter(r => r.perTraveler > 0);
  return {
    lines,
    coreLines,
    optionalLines,
    coreTotalFromRows,
    coreTotalFromSummary: summaryTotal,
    coreDifference,
    missingOperationalTotals,
    perPersonLines,
    perPersonTotal,
    perPersonSnapshot,
    porterage: {
      hotelIncluded,
      hotelExtrasSelected,
      perPersonEntries,
      possibleOverlap: perPersonEntries.length > 0 &&
        (hotelIncluded.length > 0 || hotelExtrasSelected.length > 0),
    },
  };
}
