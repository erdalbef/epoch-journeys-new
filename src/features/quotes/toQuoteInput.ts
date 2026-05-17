import type { QuoteInput, QuoteLineItemInput } from "@/lib/quotes/types";
import type { FormState, FixedCostItem, VariableCostItem } from "./types";

function isPositive(value: number | null | undefined): value is number {
  return typeof value === "number" && value > 0;
}

function pushIfMeaningful(
  items: QuoteLineItemInput[],
  item: QuoteLineItemInput
) {
  const hasDirectOccupancy =
    isPositive(item.perPersonDoubleTwin) ||
    isPositive(item.perPersonSingle) ||
    isPositive(item.perPersonTriple);

  const hasNumericValue =
    isPositive(item.totalCost) ||
    isPositive(item.unitCost) ||
    isPositive(item.quantity) ||
    isPositive(item.days) ||
    isPositive(item.nights);

  if (hasDirectOccupancy || hasNumericValue) {
    items.push(item);
  }
}

function mapFixedType(type: FixedCostItem["type"]): QuoteLineItemInput["type"] {
  switch (type) {
    case "HOTEL":
      return "HOTEL";
    case "ENTRANCE":
      return "ENTRANCE";
    case "LUNCH":
      return "LUNCH";
    case "DINNER":
      return "DINNER";
    case "WHISPER_SET":
      return "WHISPER_SET";
    case "CITY_TAX":
      return "CITY_TAX";
    case "ACCOMMODATION_TAX":
      return "ACCOMMODATION_TAX";
    case "GUIDE":
      return "GUIDE";
    case "TRANSPORT":
      return "BUS";
    case "FLIGHT":
      return "PASSENGER_FLIGHT";
    case "CUSTOM":
      return "GUIDE";
    default:
      return "GUIDE";
  }
}

function mapVariableType(type: VariableCostItem["type"]): QuoteLineItemInput["type"] {
  switch (type) {
    case "GUIDE":
      return "GUIDE";
    case "TRANSPORT":
      return "BUS";
    case "LUNCH":
      return "LUNCH";
    case "DINNER":
      return "DINNER";
    case "ENTRANCE":
      return "ENTRANCE";
    case "WHISPER_SET":
      return "WHISPER_SET";
    case "CITY_TAX":
      return "CITY_TAX";
    case "ACCOMMODATION_TAX":
      return "ACCOMMODATION_TAX";
    case "FLIGHT":
      return "PASSENGER_FLIGHT";
    case "HOTEL":
      return "HOTEL";
    case "CUSTOM":
      return "GUIDE";
    default:
      return "GUIDE";
  }
}

function mapFlightType(index: number): QuoteLineItemInput["type"] {
  if (index === 0) return "PASSENGER_FLIGHT";
  if (index === 1) return "GUIDE_FLIGHT";
  if (index === 2) return "TOUR_MANAGER_FLIGHT";
  return "STAFF_FLIGHT";
}

export function toQuoteInput(form: FormState): QuoteInput {
  const items: QuoteLineItemInput[] = [];

  for (const fixed of form.fixedCosts) {
    const hasOccupancy =
      fixed.perPersonByOccupancy &&
      (
        isPositive(fixed.perPersonByOccupancy.single) ||
        isPositive(fixed.perPersonByOccupancy.doubleTwin) ||
        isPositive(fixed.perPersonByOccupancy.triple)
      );

    if (hasOccupancy) {
      pushIfMeaningful(items, {
        id: fixed.id,
        section: "FIXED",
        type: mapFixedType(fixed.type),
        title: fixed.description || fixed.type.replaceAll("_", " "),
        calculationMethod: "PER_OCCUPANCY_DIRECT",
        perPersonSingle: fixed.perPersonByOccupancy?.single ?? 0,
        perPersonDoubleTwin: fixed.perPersonByOccupancy?.doubleTwin ?? 0,
        perPersonTriple: fixed.perPersonByOccupancy?.triple ?? 0,
      });
    } else {
      pushIfMeaningful(items, {
        id: fixed.id,
        section: "FIXED",
        type: mapFixedType(fixed.type),
        title: fixed.description || fixed.type.replaceAll("_", " "),
        calculationMethod: "FLAT_TOTAL",
        totalCost: fixed.totalCost,
      });
    }
  }

  for (const variable of form.variableCosts) {
    pushIfMeaningful(items, {
      id: variable.id,
      section: "VARIABLE",
      type: mapVariableType(variable.type),
      title: variable.description || variable.type.replaceAll("_", " "),
      calculationMethod: "PER_PERSON",
      unitCost: variable.costPerPerson,
      divisorBasis:
        variable.appliesTo === "PAYING_ONLY"
          ? "PAYING_PASSENGERS"
          : "TOTAL_PASSENGERS",
    });
  }

  for (const [index, flight] of form.flightCosts.entries()) {
    pushIfMeaningful(items, {
      id: flight.id,
      section: "FLIGHT",
      type: mapFlightType(index),
      title: flight.description || "Flight",
      calculationMethod: "PER_PERSON",
      unitCost: flight.costPerPerson,
    });
  }

  return {
    totalPassengers: form.group.groupSize,
    payingPassengers: form.group.payingPax,
    freePassengers: Math.max(form.group.groupSize - form.group.payingPax, 0),
    doubleTwinPassengers: form.group.doubleCount,
    singlePassengers: form.group.singleCount,
    triplePassengers: form.group.tripleCount,
    nights: 0,
    durationDays: 0,
    pricingMode: form.group.pricingMode,
    freeEnabled: form.freePolicy.enabled,
    freeCalculationMethod: form.freePolicy.method,
    agencyCommissionPercent: form.pricing.commissionPercent,
    epochMarkupPercent: form.pricing.markupPercent,
    lineItems: items,
  };
}