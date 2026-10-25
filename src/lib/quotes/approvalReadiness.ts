/**
 * Epoch Journeys quotation approval preflight (read-only).
 * Reads the SAVED quotation snapshot; never creates or recalculates supplier rates.
 * Blockers stop finalization/approval. Warnings require an operator's attention
 * but do not silently discard valid or deliberately overlapping tour services.
 */
import { buildGroupFinancialSummary } from "./groupFinancialSummary";
import { validateMealQuantities, type MealHotelRow } from "./mealQuantityValidation";

export type ApprovalReadiness = {
  ready: boolean;
  errors: string[];
  warnings: string[];
};

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord : null;
const rows = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.map(record).filter((item): item is JsonRecord => item !== null) : [];
const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const money = (value: unknown): number => number(value) ?? 0;
const count = (value: unknown): number => {
  const n = number(value);
  return n === null || n < 0 || !Number.isInteger(n) ? 0 : n;
};
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";

export function checkQuoteApprovalReadiness(input: {
  quoteBuilderSummary: unknown;
  recipientEmail?: string | null;
}): ApprovalReadiness {
  const errors: string[] = [];
  const warnings: string[] = [];
  const addError = (value: string) => { if (!errors.includes(value)) errors.push(value); };
  const addWarning = (value: string) => { if (!warnings.includes(value)) warnings.push(value); };
  const summary = record(input.quoteBuilderSummary);
  if (!summary) {
    return { ready: false, errors: ["No saved quotation cost breakdown. Reopen, review and save the quotation before finalization or approval."], warnings };
  }
  if (!input.recipientEmail?.trim()) addError("Recipient email is required before finalization or approval.");
  const paying = count(summary.payingPassengers);
  const comps = count(summary.freePassengers);
  const total = count(summary.totalPassengers);
  if (paying < 1) addError("At least one paying traveler is required.");
  if (total !== paying + comps) addError("Traveler counts do not reconcile: total must equal paying travelers plus COMPs.");
  const startDate = text(summary.startDate);
  const endDate = text(summary.endDate);
  if (!startDate || !endDate) {
    addWarning("Tour start/end dates are missing; hotel nights cannot yet be checked against the travel calendar.");
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
             !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
             !Number.isFinite(Date.parse(startDate)) ||
             !Number.isFinite(Date.parse(endDate)) || endDate < startDate) {
    addError("Tour dates are invalid or the end date precedes the start date.");
  }
  const hotelRows = rows(summary.hotels);
  const coreHotels = hotelRows.filter(h => h.stayType === "CORE" && money(h.nights) > 0 && (text(h.hotelName) || text(h.destination) || text(h.supplierRateId) || money(h.doubleTwinPerPerson) > 0));
  if (!coreHotels.length) addError("Enter actual core hotel stays and nights; a blank placeholder is not a hotel booking.");
  for (const hotel of coreHotels) {
    const label = text(hotel.hotelName) || text(hotel.destination) || "Unnamed core hotel";
    if (!Number.isInteger(number(hotel.nights)) || money(hotel.nights) < 1) {
      addError(`${label}: hotel nights must be a positive whole number.`);
    }
    // This reference quote uses Double/Twin as the group costing basis.
    // Do NOT demand Single/Triple unless that occupancy is explicitly used.
    if (money(hotel.doubleTwinPerPerson) <= 0) {
      addError(`${label}: Double/Twin accommodation cost is missing.`);
    }
    if (hotel.supplierRateRequiresReconfirmation === true || hotel.supplierRateValidity === "EXPIRED_ESTIMATE") {
      addWarning(`${label}: supplier rate requires reconfirmation before the quote is commercially committed.`);
    }
    if (hotel.supplierDinnerSelected === true && hotel.supplierDinnerIncluded !== true && hotel.supplierSelectedMealBasis !== "HB") {
      // The current quote serializer does not always persist dinner amount.
      // Never infer a zero rate from an omitted field; the selected expense
      // is already reflected in the saved costing snapshot.
      if (number(hotel.supplierDinnerAmount) === null) {
        addWarning(`${label}: selected hotel dinner price is not itemized in the saved hotel record. Verify the supplier rate and saved hotel total.`);
      } else if (money(hotel.supplierDinnerAmount) <= 0) {
        addError(`${label}: a chargeable hotel dinner is selected at a zero supplier rate.`);
      }
    }
    if (hotel.supplierPorterageSelected === true && hotel.supplierPorterageIncluded !== true && money(hotel.supplierPorterageAmount) <= 0) {
      addError(`${label}: chargeable porterage is selected without a supplier price.`);
    }
    if (hotel.supplierBeverageSelected === true && hotel.supplierBeveragePackageIncluded !== true && money(hotel.supplierBeveragePackageAmount) <= 0) {
      addError(`${label}: chargeable drinks are selected without a supplier price.`);
    }
  }
  const serviceRows = rows(summary.fixedCostRows);
  const meals = validateMealQuantities({
    services: serviceRows.map(r => ({category: text(r.category), quantity: money(r.quantity), label: text(r.label)})),
    hotels: hotelRows.map(r => ({
      stayType: (r.stayType === "PRE" || r.stayType === "POST" ? r.stayType : "CORE") as MealHotelRow["stayType"],
      nights: money(r.nights), hotelName: text(r.hotelName), destination: text(r.destination),
      supplierId: text(r.supplierId), supplierServiceId: text(r.supplierServiceId), supplierRateId: text(r.supplierRateId),
      singlePerPerson: money(r.singlePerPerson), doubleTwinPerPerson: money(r.doubleTwinPerPerson), triplePerPerson: money(r.triplePerPerson),
      supplierDinnerSelected: r.supplierDinnerSelected === true, supplierDinnerMeals: money(r.supplierDinnerMeals),
      supplierDinnerIncluded: r.supplierDinnerIncluded === true, supplierMealBasis: text(r.supplierMealBasis),
      supplierSelectedMealBasis: r.supplierSelectedMealBasis === "HB" ? "HB" : r.supplierSelectedMealBasis === "BB" ? "BB" : undefined,
    })),
    startDate, endDate,
  });
  for (const message of meals.errors) addError(message);
  for (const message of meals.warnings) addWarning(message);
  for (const service of serviceRows) {
    if (text(service.label) && money(service.quantity) > 0 && money(service.unitCost) < 0) {
      addError(`${text(service.label)}: service cost cannot be negative.`);
    }
    if (text(service.label) && money(service.quantity) > 0 && money(service.unitCost) === 0) {
      addWarning(`${text(service.label)}: zero-priced service; confirm that it is included or intentionally complimentary.`);
    }
  }
  if (serviceRows.some(r => text(r.category) === "PORTERAGE" && money(r.quantity) > 0) &&
      coreHotels.some(h => h.supplierPorterageIncluded === true || h.supplierPorterageSelected === true)) {
    addWarning("Porterage appears in Per-Person Services and in hotel inclusions/extras. Confirm these are not the same service.");
  }
  const comp = record(summary.complimentarySetup);
  if (comp) {
    const priest = comp.priestComplimentary === true ? count(comp.priestCount) : 0;
    const leader = comp.groupLeaderComplimentary === true ? count(comp.groupLeaderCount) : 0;
    if (priest + leader > comps) addError("Named complimentary travelers exceed the total COMP traveler count.");
  }
  const snapshot = record(summary.costingSnapshot);
  if (!snapshot || snapshot.version !== "GROUP_NET_V2") {
    addError("A current GROUP_NET_V2 costing snapshot is missing. Reopen, recalculate and save the quotation before approval.");
  } else {
    const perPaxCost = record(snapshot.costPerPayingPax);
    const perPaxSelling = record(snapshot.netSellingPerPayingPax);
    const cost = money(perPaxCost?.doubleTwin);
    const selling = money(perPaxSelling?.doubleTwin);
    if (cost <= 0 || number(perPaxCost?.doubleTwin) === null) addError("Saved Double/Twin NET cost per paying traveler is missing or invalid.");
    if (selling <= 0 || number(perPaxSelling?.doubleTwin) === null) addError("Saved Double/Twin selling rate per paying traveler is missing or invalid.");
    const compLines = rows(snapshot.complimentaryExpenseLines);
    for (const compLine of compLines) {
      if (count(compLine.travelers) === 0 || compLine.accommodation === "NONE") continue;
      const occupancy = text(compLine.accommodation);
      const key = occupancy === "SINGLE" ? "singlePerPerson" : occupancy === "TRIPLE" ? "triplePerPerson" : "doubleTwinPerPerson";
      for (const hotel of coreHotels) {
        if (money(hotel[key]) <= 0) addError(`${text(compLine.category) || "COMP"}: ${text(hotel.hotelName) || text(hotel.destination) || "core hotel"} has no ${occupancy} rate for a traveler using that occupancy.`);
      }
    }
    const unpriced = snapshot.unpricedCompAccommodations;
    if (Array.isArray(unpriced) && unpriced.length) {
      addWarning("The saved quote reports unpriced COMP accommodation. Review the selected occupancy and hotel rates before approval.");
    }
    const financialValues = [
      "hotelDoubleTwinPerPayingPax", "otherPerPayingPax", "coreGroupOperationalTotal",
      "groupLeaderAllowanceTotal", "complimentaryExpenseTotal",
    ];
    for (const key of financialValues) {
      if (number(snapshot[key]) === null || money(snapshot[key]) < 0) {
        addError(`Saved financial component '${key}' is missing or invalid.`);
      }
    }
    if (paying > 0 && cost > 0) {
      const financial = buildGroupFinancialSummary({
        payingPassengers: paying, freePassengers: comps,
        hotelPerPayingPax: money(snapshot.hotelDoubleTwinPerPayingPax),
        otherPerPayingPax: money(snapshot.otherPerPayingPax),
        coreOperationalGroupTotal: money(snapshot.coreGroupOperationalTotal),
        groupLeaderAllowanceTotal: money(snapshot.groupLeaderAllowanceTotal),
        complimentaryExpenseTotal: money(snapshot.complimentaryExpenseTotal),
        costPerPayingPax: cost,
        netSellingPerPayingPax: selling,
      });
      if (!financial.reconciles) addError(`NET group cost does not reconcile with saved expenses (difference EUR ${financial.reconciliationDifference.toFixed(2)}).`);
      if (financial.projectedProfit < 0) addWarning("Selling below estimated NET cost: the quotation projects a loss.");
    }
  }
  if (rows(summary.paxPricingRows).length === 0) addError("At least one group-size pricing tier is required.");
  return { ready: errors.length === 0, errors, warnings };
}
