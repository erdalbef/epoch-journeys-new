/** Epoch's *standard* per-traveler costs; not a fake Supplier CRM. */
export const SERVICE_CATEGORIES = [
  "LUNCH", "DINNER", "DRINKS", "BOTTLED_WATER", "FLIGHT", "CRUISE", "TIPS", "PORTERAGE",
  "HEADSETS", "MASS_CHURCH", "LOCAL_TRANSPORT", "OTHER",
] as const;
export type StandardServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_UNITS = ["PER_PERSON", "PER_DAY", "PER_MEAL", "PER_STAY", "PER_TICKET", "PER_ITEM"] as const;
export type StandardServiceUnit = (typeof SERVICE_UNITS)[number];

export const SERVICE_CATEGORY_LABELS: Record<StandardServiceCategory, string> = {
  LUNCH: "Lunch", DINNER: "Dinner", DRINKS: "Drinks / Beverages", BOTTLED_WATER: "Bottled Water", FLIGHT: "Flight Ticket (per traveler)",
  CRUISE: "Boat / Ferry Ticket (per traveler)", TIPS: "Tips / Gratuities", PORTERAGE: "Porterage",
  HEADSETS: "Headsets", MASS_CHURCH: "Church / Mass Cost", LOCAL_TRANSPORT: "Rail / Local Ticket (per traveler)", OTHER: "Other Service",
};
export const SERVICE_UNIT_LABELS: Record<StandardServiceUnit, string> = {
  PER_PERSON: "Per traveler", PER_DAY: "Per traveler / day", PER_MEAL: "Per traveler / meal",
  PER_STAY: "Per traveler / stay", PER_TICKET: "Per traveler / ticket", PER_ITEM: "Per traveler / item",
};

export type StandardServiceInput = {
  name: string; category: StandardServiceCategory; unit: StandardServiceUnit;
  price: number | null; currency: string; isActive: boolean; notes: string | null;
};
export type StandardServiceItem = StandardServiceInput & {
  id: string; createdAt: string; updatedAt: string;
};
export type StandardServiceSnapshot = {
  serviceId: string; serviceName: string; category: StandardServiceCategory;
  unit: StandardServiceUnit; currency: string; price: number; catalogueUpdatedAt: string;
};
export type SupplierServiceSnapshot = {
  supplierId: string; supplierName: string; supplierServiceId: string; supplierServiceName: string;
  supplierRateId: string; supplierRateName: string; supplierRateUnit: string;
  currency: string; price: number; verifiedAt: string | null;
};
export type ParseResult = { ok: true; data: StandardServiceInput } | { ok: false; error: string };

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function standardServiceLookupKey(category: string, unit: string, name: string): string {
  return [category, unit, name].map(part => part.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase()).join("|");
}
export function parseStandardServiceInput(input: unknown): ParseResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid service details." };
  }
  const data = input as Record<string, unknown>;
  const name = text(data.name, 180);
  const category = text(data.category, 50).toUpperCase();
  const unit = text(data.unit, 50).toUpperCase();
  const currency = (text(data.currency, 12) || "EUR").toUpperCase();
  const notes = text(data.notes, 2000) || null;
  if (!name) return { ok: false, error: "Service name is required." };
  if (!(SERVICE_CATEGORIES as readonly string[]).includes(category)) {
    return { ok: false, error: "Choose a supported per-person service category." };
  }
  if (!(SERVICE_UNITS as readonly string[]).includes(unit)) {
    return { ok: false, error: "Choose a supported per-person unit." };
  }
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Use a three-letter currency code." };
  let price: number | null = null;
  if (data.price !== undefined && data.price !== null && data.price !== "") {
    if (typeof data.price !== "number" && typeof data.price !== "string") {
      return { ok: false, error: "Price must be numeric." };
    }
    const raw = String(data.price).trim();
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(raw)) {
      return { ok: false, error: "Price must be nonnegative, with at most two decimals." };
    }
    price = Number(raw);
    if (!Number.isFinite(price) || price > 9999999999.99) {
      return { ok: false, error: "Price is out of range." };
    }
  }
  if (typeof data.isActive !== "boolean") {
    return { ok: false, error: "Active status must be true or false." };
  }
  return {
    ok: true,
    data: { name, category: category as StandardServiceCategory, unit: unit as StandardServiceUnit,
      price, currency, isActive: data.isActive, notes },
  };
}

type DbRow = {
  id: string; name: string; category: string; unit: string; price: { toString(): string } | number | null;
  currency: string; isActive: boolean; notes: string | null; createdAt: Date; updatedAt: Date;
};
export function toStandardServiceDto(row: DbRow): StandardServiceItem {
  return {
    id: row.id, name: row.name, category: row.category as StandardServiceCategory,
    unit: row.unit as StandardServiceUnit, price: row.price === null ? null : Number(row.price.toString()),
    currency: row.currency, isActive: row.isActive, notes: row.notes,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

export const SUPPLIER_SERVICE_TYPES_BY_CATEGORY: Record<StandardServiceCategory, string[]> = {
  LUNCH: ["MEAL"], DINNER: ["MEAL"], DRINKS: ["MEAL", "OTHER", "DMC_SERVICE"], BOTTLED_WATER: ["OTHER", "DMC_SERVICE"],
  FLIGHT: ["FLIGHT", "TICKET"], CRUISE: ["CRUISE", "FERRY"], TIPS: ["OTHER"],
  PORTERAGE: ["OTHER", "DMC_SERVICE"], HEADSETS: ["OTHER", "DMC_SERVICE"],
  MASS_CHURCH: ["MASS_ARRANGEMENT", "CHURCH_RESERVATION"],
  LOCAL_TRANSPORT: ["TRANSPORT", "RAIL", "FERRY"], OTHER: ["OTHER", "TICKET", "INSURANCE", "DMC_SERVICE"],
};

export function supplierServiceRateIssue(
  rate: { amount: number | null; currency: string; unit: string; taxIncluded: boolean; minPax?: number | null;
    maxPax?: number | null; validFrom?: string; validTo?: string; },
  currency: string, totalTravelers: number,
): string | null {
  const unit = rate.unit.toUpperCase();
  if (!(SERVICE_UNITS as readonly string[]).includes(unit)) return `Supplier unit ${rate.unit} is not a per-person rate.`;
  if (rate.currency.toUpperCase() !== currency.toUpperCase()) return `Currency ${rate.currency} differs from quotation ${currency}.`;
  if (rate.amount === null || !Number.isFinite(rate.amount) || rate.amount < 0) return "Price is missing or invalid.";
  if (!rate.taxIncluded) return "Tax-inclusive price must be confirmed before selection.";
  if ((rate.minPax != null || rate.maxPax != null) && totalTravelers <= 0) return "Set group size before using a restricted supplier rate.";
  if (totalTravelers > 0 && ((rate.minPax != null && totalTravelers < rate.minPax) ||
    (rate.maxPax != null && totalTravelers > rate.maxPax))) return "Group size is outside supplier rate limits.";
  // Supplier-contract validity is different from the independently maintained standard catalogue.
  // Without an explicit service date, do not silently select a supplier rate that is not currently valid.
  const today = new Date().toISOString().slice(0, 10);
  if (rate.validFrom && rate.validFrom.slice(0, 10) > today) return "Supplier rate is not yet effective; verify the applicable tour rate.";
  if (rate.validTo && rate.validTo.slice(0, 10) < today) return "Supplier rate has expired; verify the applicable tour rate.";
  return null;
}
