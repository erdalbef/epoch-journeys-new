/** Shared, side-effect-free validation for the independent attraction catalogue. */
export type AttractionInput = {
  name: string;
  country: string;
  city: string;
  admissionFee: number | null;
  currency: string;
  isActive: boolean;
  notes: string | null;
};

export type AttractionCatalogueItem = AttractionInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

type ParseResult = { ok: true; data: AttractionInput } | { ok: false; error: string };

type DbAttraction = {
  id: string;
  name: string;
  country: string;
  city: string;
  admissionFee: { toString(): string } | number | null;
  currency: string;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function cleanText(value: unknown, limit: number): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export function attractionLookupKey(name: string, country: string, city: string): string {
  return [country, city, name]
    .map(value => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase())
    .join("|");
}

export function parseAttractionInput(payload: unknown): ParseResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Invalid attraction details." };
  }
  const input = payload as Record<string, unknown>;
  const name = cleanText(input.name, 180);
  const country = cleanText(input.country, 100);
  const city = cleanText(input.city, 100);
  const currency = cleanText(input.currency, 12).toUpperCase() || "EUR";
  const notes = cleanText(input.notes, 2000) || null;
  if (!name || !country) {
    return { ok: false, error: "Attraction name and country are required." };
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "Currency must be a three-letter ISO currency code." };
  }
  let admissionFee: number | null = null;
  if (input.admissionFee !== "" && input.admissionFee !== null && input.admissionFee !== undefined) {
    if (typeof input.admissionFee !== "number" && typeof input.admissionFee !== "string") {
      return { ok: false, error: "Admission fee must be numeric." };
    }
    const raw = String(input.admissionFee).trim();
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(raw)) {
      return { ok: false, error: "Admission fee must be a positive amount with at most two decimals." };
    }
    admissionFee = Number(raw);
    if (!Number.isFinite(admissionFee) || admissionFee > 9999999999.99) {
      return { ok: false, error: "Admission fee is out of range." };
    }
  }
  return {
    ok: true,
    data: {
      name, country, city, admissionFee, currency,
      isActive: input.isActive !== false,
      notes,
    },
  };
}

export function toAttractionDto(row: DbAttraction): AttractionCatalogueItem {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    city: row.city,
    admissionFee: row.admissionFee === null ? null : Number(row.admissionFee.toString()),
    currency: row.currency,
    isActive: row.isActive,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
