import type {
  FormState,
  FixedCostItem,
  VariableCostItem,
  FlightCostItem,
  QuoteLineType as FeatureQuoteLineType,
} from "@/features/quotes/types";
import type {
  NormalizedRow,
  QuoteLineType as NormalizedQuoteLineType,
} from "@/lib/quotes/types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getOccupancyValue(
  item: FixedCostItem,
  occupancy: "single" | "doubleTwin" | "triple"
): number {
  return typeof item.perPersonByOccupancy?.[occupancy] === "number"
    ? item.perPersonByOccupancy?.[occupancy] ?? 0
    : 0;
}

function hasOccupancyPricing(item: FixedCostItem): boolean {
  return (
    typeof item.perPersonByOccupancy?.single === "number" ||
    typeof item.perPersonByOccupancy?.doubleTwin === "number" ||
    typeof item.perPersonByOccupancy?.triple === "number"
  );
}

function getFixedCostByType(
  items: FixedCostItem[],
  type: FixedCostItem["type"]
): FixedCostItem | undefined {
  return items.find((item) => item.type === type);
}

function getVariableTotalPerPerson(item: VariableCostItem): number {
  return typeof item.costPerPerson === "number" ? item.costPerPerson : 0;
}

function getFlightPerPerson(item: FlightCostItem): number {
  return typeof item.costPerPerson === "number" ? item.costPerPerson : 0;
}

function mapToNormalizedSourceType(
  type: FeatureQuoteLineType
): NormalizedQuoteLineType {
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

    // feature-only values mapped to closest supported normalized type
    case "TRANSPORT":
      return "GUIDE";
    case "FLIGHT":
      return "PASSENGER_FLIGHT";
    case "CUSTOM":
      return "CUSTOM";

    default:
      return "CUSTOM";
  }
}

export function formStateToNormalizedRows(form: FormState): NormalizedRow[] {
  const rows: NormalizedRow[] = [];

  const totalPassengers = Math.max(form.group.groupSize || 0, 0);
  const payingPassengers = Math.max(form.group.payingPax || 0, 0);
  const safePassengerDivisor = Math.max(totalPassengers, 1);

  const nights = 0;

  for (const item of form.fixedCosts) {
    if (hasOccupancyPricing(item)) {
      rows.push({
        id: item.id,
        sourceType: mapToNormalizedSourceType(item.type),
        section: "FIXED",
        bucket: "OCCUPANCY_FIXED",
        totalCost: null,
        uniformPerPerson: null,
        perPersonByOccupancy: {
          doubleTwin: round2(getOccupancyValue(item, "doubleTwin")),
          single: round2(getOccupancyValue(item, "single")),
          triple: round2(getOccupancyValue(item, "triple")),
        },
        divisorUsed: null,
      });

      continue;
    }

    const totalCost = round2(item.totalCost || 0);

    rows.push({
      id: item.id,
      sourceType: mapToNormalizedSourceType(item.type),
      section: "FIXED",
      bucket: "UNIFORM_FIXED",
      totalCost,
      uniformPerPerson:
        totalPassengers > 0 ? round2(totalCost / safePassengerDivisor) : 0,
      perPersonByOccupancy: null,
      divisorUsed: totalPassengers || null,
    });
  }

  const hotelItem = getFixedCostByType(form.fixedCosts, "HOTEL");
  const accommodationTaxItem = getFixedCostByType(
    form.fixedCosts,
    "ACCOMMODATION_TAX"
  );

  if (hotelItem && hasOccupancyPricing(hotelItem)) {
    rows.push({
      id: "hotel-occupancy",
      sourceType: "HOTEL",
      section: "FIXED",
      bucket: "OCCUPANCY_FIXED",
      totalCost: null,
      uniformPerPerson: null,
      perPersonByOccupancy: {
        doubleTwin: round2(
          getOccupancyValue(hotelItem, "doubleTwin") +
            getOccupancyValue(accommodationTaxItem ?? hotelItem, "doubleTwin")
        ),
        single: round2(
          getOccupancyValue(hotelItem, "single") +
            getOccupancyValue(accommodationTaxItem ?? hotelItem, "single")
        ),
        triple: round2(
          getOccupancyValue(hotelItem, "triple") +
            getOccupancyValue(accommodationTaxItem ?? hotelItem, "triple")
        ),
      },
      divisorUsed: null,
    });
  }

  for (const item of form.variableCosts) {
    const costPerPerson = getVariableTotalPerPerson(item);
    const divisor =
      item.appliesTo === "PAYING_ONLY"
        ? Math.max(payingPassengers, 1)
        : safePassengerDivisor;

    const passengerCount =
      item.appliesTo === "PAYING_ONLY" ? payingPassengers : totalPassengers;

    rows.push({
      id: item.id,
      sourceType: mapToNormalizedSourceType(item.type),
      section: "VARIABLE",
      bucket: "VARIABLE_SHARED",
      totalCost: round2(costPerPerson * passengerCount),
      uniformPerPerson: round2(costPerPerson),
      perPersonByOccupancy: null,
      divisorUsed: divisor,
    });
  }

  form.flightCosts.forEach((item, index) => {
    const costPerPerson = getFlightPerPerson(item);
    const rowId = item.id || `flight-${index + 1}`;

    rows.push({
      id: rowId,
      sourceType: "PASSENGER_FLIGHT",
      section: "FLIGHT",
      bucket: "PASSENGER_FLIGHT",
      totalCost: round2(costPerPerson * totalPassengers),
      uniformPerPerson: round2(costPerPerson),
      perPersonByOccupancy: null,
      divisorUsed: totalPassengers || null,
    });
  });

  const cityTaxItem = getFixedCostByType(form.fixedCosts, "CITY_TAX");
  if (cityTaxItem && nights > 0) {
    rows.push({
      id: `${cityTaxItem.id}-derived`,
      sourceType: "CITY_TAX",
      section: "FIXED",
      bucket: "UNIFORM_FIXED",
      totalCost: round2(cityTaxItem.totalCost),
      uniformPerPerson:
        totalPassengers > 0
          ? round2(cityTaxItem.totalCost / safePassengerDivisor)
          : 0,
      perPersonByOccupancy: null,
      divisorUsed: totalPassengers || null,
    });
  }

  return rows;
}