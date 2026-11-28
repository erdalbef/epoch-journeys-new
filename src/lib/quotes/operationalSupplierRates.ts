import type { SupplierRateUnit, SupplierServiceType } from "@prisma/client";
import { z } from "zod";

export const operationalCategoryLabels = {
  BUS: "Bus / Coach",
  TOUR_GUIDE: "Tour Guide",
  TOUR_MANAGER: "Tour Manager",
  ASSISTANT: "Assistant",
  TRANSFERMAN: "Transferman",
  DRIVER: "Driver",
  FERRY: "Ferry",
  TRANSFER: "Transportation / Transfer",
  ADDITIONAL_SERVICE: "Additional Service",
} as const;

export type OperationalCostCategory = keyof typeof operationalCategoryLabels;
export type OperationalCostScope = "CORE" | "PRE" | "POST";

export function isOperationalCostCategory(value: string): value is OperationalCostCategory {
  return Object.hasOwn(operationalCategoryLabels, value);
}

export const operationalSupplierTypes: Record<OperationalCostCategory, SupplierServiceType[]> = {
  BUS: ["TRANSPORT", "DMC_SERVICE", "OTHER"],
  TOUR_GUIDE: ["GUIDE", "DMC_SERVICE", "OTHER"],
  TOUR_MANAGER: ["TOUR_MANAGER", "DMC_SERVICE", "OTHER"],
  ASSISTANT: ["GUIDE", "TOUR_MANAGER", "DMC_SERVICE", "OTHER"],
  TRANSFERMAN: ["TRANSPORT", "DMC_SERVICE", "OTHER"],
  DRIVER: ["TRANSPORT", "DMC_SERVICE", "OTHER"],
  FERRY: ["FERRY", "TRANSPORT", "DMC_SERVICE", "OTHER"],
  TRANSFER: ["TRANSPORT", "RAIL", "DMC_SERVICE", "OTHER"],
  ADDITIONAL_SERVICE: [],
};

const namedServices: Record<Exclude<OperationalCostCategory, "ADDITIONAL_SERVICE">, RegExp> = {
  BUS: /\b(?:bus|buses|coach(?:es)?|mini[ -]?bus(?:es)?|motorcoach)\b/i,
  TOUR_GUIDE: /\b(?:local |tour |licensed )?guid(?:e|es|ing)\b/i,
  TOUR_MANAGER: /\b(?:tour manager|tour director|tour escort)s?\b/i,
  ASSISTANT: /\b(?:assistant|assistants|tour support)\b/i,
  TRANSFERMAN: /\b(?:transfer[ -]?(?:man|person|assistant|staff)|meet[ &-]+(?:and[ -]+)?greet)\b/i,
  DRIVER: /\b(?:driver|drivers|chauffeur|chauffeurs)\b/i,
  FERRY: /\b(?:ferry|ferries)\b/i,
  TRANSFER: /\b(?:transfer|transfers|shuttle|transport(?:ation)?)\b/i,
};

const staffCategories = ["TRANSFERMAN", "ASSISTANT", "DRIVER"] as const;
const vehicle = /\b(?:vehicle|shuttle|van|minivan|sedan|car hire)\b/i;

function standaloneStaffService(name: string) {
  if (namedServices.BUS.test(name) || vehicle.test(name) || /\b(?:with|including)\b/i.test(name)) return undefined;
  return staffCategories.find(category => namedServices[category].test(name));
}

export function matchesOperationalSupplierService(
  category: OperationalCostCategory,
  service: {type: SupplierServiceType; name: string},
  rate: {name: string; description?: string | null},
) {
  if (category === "ADDITIONAL_SERVICE") return service.type !== "ACCOMMODATION";
  if (!operationalSupplierTypes[category].includes(service.type)) return false;
  const staff = standaloneStaffService(rate.name) ?? standaloneStaffService(service.name);
  if (staff) return category === staff;
  if (category === "DRIVER" || category === "TRANSFERMAN" || category === "ASSISTANT") return false;
  if ((category === "TOUR_GUIDE" && service.type === "GUIDE") ||
      (category === "TOUR_MANAGER" && service.type === "TOUR_MANAGER") ||
      (category === "FERRY" && service.type === "FERRY") ||
      (category === "TRANSFER" && service.type === "RAIL")) return true;
  const name = `${rate.name} ${service.name}`;
  if (category === "TRANSFER" && service.type === "TRANSPORT") return !namedServices.FERRY.test(name);
  return namedServices[category].test(name) ||
    (category !== "BUS" && namedServices[category].test(rate.description ?? ""));
}

const operationalUnits = {
  PER_GROUP: ["TOTAL", "GROUP_TOTAL", "per group"],
  FLAT_RATE: ["TOTAL", "GROUP_TOTAL", "flat rate"],
  PER_PERSON: ["DAILY", "PER_PERSON", "per person"],
  PER_PERSON_PER_DAY: ["DAILY", "PER_PERSON", "per person per day"],
  PER_PERSON_PER_NIGHT: ["DAILY", "PER_PERSON", "per person per night"],
  PER_DAY: ["DAILY", "GROUP_TOTAL", "per day"],
  PER_HALF_DAY: ["DAILY", "GROUP_TOTAL", "per half day"],
  PER_HOUR: ["DAILY", "GROUP_TOTAL", "per hour"],
  PER_TRANSFER: ["DAILY", "PER_SERVICE", "per transfer"],
  PER_VEHICLE: ["DAILY", "PER_VEHICLE", "per vehicle"],
  PER_MEAL: ["DAILY", "PER_PERSON", "per meal"],
  PER_TICKET: ["DAILY", "PER_PERSON", "per ticket"],
} as const satisfies Partial<Record<SupplierRateUnit, readonly [string, string, string]>>;

export type OperationalSupplierUnit = keyof typeof operationalUnits;
export const operationalSupplierUnits = Object.keys(operationalUnits) as OperationalSupplierUnit[];

export type OperationalRateDates = {startDate: string; endDate: string};

export function validOperationalRateDates({startDate, endDate}: OperationalRateDates) {
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  return validDate(startDate) && validDate(endDate) && startDate <= endDate;
}

export type OperationalSupplierRate = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  unit: OperationalSupplierUnit;
  validFrom: string;
  validTo: string;
  minPax: number | null;
  maxPax: number | null;
  lastVerifiedAt: string | null;
};

export type OperationalSupplierService = {
  supplier: {id: string; name: string};
  service: {id: string; name: string; city: string | null; country: string | null};
  rates: OperationalSupplierRate[];
};

export type OperationalRateSource = {
  supplierId: string;
  supplierName: string;
  serviceId: string;
  serviceName: string;
  rate: OperationalSupplierRate;
  dates: OperationalRateDates;
  quoteDates: OperationalRateDates;
  scope: OperationalCostScope;
};

const datesSchema = z.object({startDate: z.string(), endDate: z.string()});
const rateSourceSchema = z.object({
  supplierId: z.string(), supplierName: z.string(), serviceId: z.string(), serviceName: z.string(),
  rate: z.object({
    id: z.string(), name: z.string(), amount: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/i),
    unit: z.enum(operationalSupplierUnits), validFrom: z.string(), validTo: z.string(),
    minPax: z.number().nullable(), maxPax: z.number().nullable(), lastVerifiedAt: z.string().nullable(),
  }),
  dates: datesSchema.refine(validOperationalRateDates), quoteDates: datesSchema,
  scope: z.enum(["CORE", "PRE", "POST"]),
});

export function readOperationalRateSource(value: unknown): OperationalRateSource | undefined {
  const parsed = rateSourceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function operationalRateUnitLabel(unit: OperationalSupplierUnit) {
  return operationalUnits[unit]?.[2] ?? unit;
}

export function operationalDisplayBasis<T extends string>(row: {
  pricingBasis?: T; costMode?: string; numberOfDays?: number; supplierOperationalRate?: unknown;
}) {
  if (row.supplierOperationalRate && row.costMode === "DAILY" && row.numberOfDays !== 1 &&
      (row.pricingBasis === "PER_VEHICLE" || row.pricingBasis === "PER_SERVICE")) return "GROUP_TOTAL";
  return row.pricingBasis;
}

export function applyOperationalSupplierRate(
  service: OperationalSupplierService,
  rate: OperationalSupplierRate,
  dates: OperationalRateDates,
  quoteDates: OperationalRateDates,
  scope: OperationalCostScope,
) {
  const [costMode, pricingBasis] = operationalUnits[rate.unit];
  const nights = (Date.parse(dates.endDate) - Date.parse(dates.startDate)) / 86_400_000;
  const numberOfDays = rate.unit === "PER_PERSON_PER_NIGHT" ? nights
    : rate.unit === "PER_DAY" || rate.unit === "PER_PERSON_PER_DAY" ? nights + 1 : 1;
  const {id, name, amount, currency, unit, validFrom, validTo, minPax, maxPax, lastVerifiedAt} = rate;
  return {
    label: standaloneStaffService(rate.name) ? rate.name : service.service.name,
    scope,
    costMode,
    pricingBasis,
    totalContractCost: costMode === "TOTAL" ? rate.amount : 0,
    dailyRate: costMode === "DAILY" ? rate.amount : 0,
    numberOfDays,
    supplierOperationalRate: {
      supplierId: service.supplier.id, supplierName: service.supplier.name,
      serviceId: service.service.id, serviceName: service.service.name,
      rate: {id, name, amount, currency, unit, validFrom, validTo, minPax, maxPax, lastVerifiedAt},
      dates, quoteDates, scope,
    } satisfies OperationalRateSource,
  };
}

export function operationalRateSnapshotIssue(
  source: OperationalRateSource, currency: string, totalTravelers: number, quoteDates: OperationalRateDates,
) {
  if (source.rate.currency.toUpperCase() !== currency.toUpperCase()) return "The quote currency has changed. Choose a CRM rate in the new currency.";
  if ((source.rate.minPax != null && totalTravelers < source.rate.minPax) ||
      (source.rate.maxPax != null && totalTravelers > source.rate.maxPax)) {
    return "The group size is outside this CRM rate’s limits.";
  }
  if (source.quoteDates.startDate !== quoteDates.startDate || source.quoteDates.endDate !== quoteDates.endDate) {
    return "The quote dates have changed. Check the CRM rate against the new service dates.";
  }
  return null;
}
