import { Prisma, Role, SupplierRateUnit } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { isReferencedBySavedQuotation } from "@/lib/suppliers/quoteReferences";

type Context = { params: Promise<{ id: string; rateId: string }> };
const has = (input: Record<string, unknown>, field: string) => Object.prototype.hasOwnProperty.call(input, field);
const stringValue = (value: unknown) => typeof value === "string" ? value.trim() : "";
const optionalString = (value: unknown) => value === null || value === "" ? null : stringValue(value);
const numeric = (value: unknown) => typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
const allowedUnits = Object.values(SupplierRateUnit) as string[];

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user && session.user.role === Role.ADMIN);
}

export async function PATCH(request: Request, context: Context) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id: supplierId, rateId } = await context.params;
  const existing = await db.supplierRate.findFirst({ where: { id: rateId, supplierId }, select: { id: true, roomType: true, minPax: true, maxPax: true, validFrom: true, validTo: true } });
  if (!existing) return NextResponse.json({ error: "Supplier rate not found." }, { status: 404 });
  let input: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("Invalid payload");
    input = value as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON object." }, { status: 400 });
  }

  // Update only explicitly supplied fields. Never replace a whole historical rate snapshot.
  const data: Record<string, unknown> = {};
  const requiredStrings = ["name", "currency"] as const;
  const optionalStrings = ["description", "mealBasis", "dinnerNotes", "beveragePackageDescription", "notes", "rateRestrictions", "internalRateNotes", "supplierReference"] as const;
  const monetaryFields = ["amount", "dinnerAmount", "cityTaxAmount", "porterageAmount", "beveragePackageAmount", "taxRate", "depositAmount", "depositPercent", "singleSupplement", "tripleReduction", "childRate", "extraBedRate"] as const;
  const integerFields = ["minPax", "maxPax"] as const;
  const booleanFields = ["breakfastIncluded", "dinnerIncluded", "cityTaxIncluded", "porterageAvailable", "porterageIncluded", "beveragePackageIncluded", "isActive"] as const;
  const unitFields = ["unit", "dinnerUnit", "cityTaxUnit", "porterageUnit", "beveragePackageUnit"] as const;
  const dateFields = ["validFrom", "validTo"] as const;
  const supported = new Set<string>([...requiredStrings, ...optionalStrings, ...monetaryFields, ...integerFields, ...booleanFields, ...unitFields, ...dateFields, "serviceId"]);
  if (!Object.keys(input).length || Object.keys(input).some((key) => !supported.has(key))) {
    return NextResponse.json({ error: "Unsupported or empty rate update." }, { status: 400 });
  }
  for (const key of requiredStrings) if (has(input, key)) {
    const text = stringValue(input[key]);
    if (!text || (key === "currency" && !/^[A-Z]{3}$/.test(text.toUpperCase()))) return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
    data[key] = key === "currency" ? text.toUpperCase() : text;
  }
  for (const key of optionalStrings) if (has(input, key)) {
    if (input[key] !== null && typeof input[key] !== "string") return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
    data[key] = optionalString(input[key]);
  }
  for (const key of monetaryFields) if (has(input, key)) {
    if (input[key] === null || input[key] === "") {
      if (key === "amount") return NextResponse.json({ error: "Rate amount is required." }, { status: 400 });
      data[key] = null;
    } else {
      const amount = numeric(input[key]);
      if (!Number.isFinite(amount) || amount < 0 || ((key === "depositPercent" || key === "taxRate") && amount > 100)) {
        return NextResponse.json({ error: `Invalid non-negative ${key}.` }, { status: 400 });
      }
      data[key] = amount;
    }
  }
  for (const key of integerFields) if (has(input, key)) {
    if (input[key] === null || input[key] === "") data[key] = null;
    else {
      const value = numeric(input[key]);
      if (!Number.isSafeInteger(value) || value < 0) return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
      data[key] = value;
    }
  }
  for (const key of booleanFields) if (has(input, key)) {
    if (typeof input[key] !== "boolean") return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
    data[key] = input[key];
  }
  for (const key of unitFields) if (has(input, key)) {
    const value = input[key];
    if (value === null || value === "") {
      if (key === "unit") return NextResponse.json({ error: "Rate unit is required." }, { status: 400 });
      data[key] = null;
    } else if (typeof value !== "string" || !allowedUnits.includes(value)) return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
    else data[key] = value;
  }
  for (const key of dateFields) if (has(input, key)) {
    if (typeof input[key] !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input[key])) return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
    const value = new Date(`${input[key]}T00:00:00.000Z`);
    if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== input[key]) return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
    data[key] = value;
  }
  if (has(input, "serviceId")) {
    const serviceId = stringValue(input.serviceId) || null;
    if (serviceId) {
      const service = await db.supplierService.findFirst({ where: { id: serviceId, supplierId }, select: { id: true, type: true, isActive: true } });
      if (!service || !service.isActive || (existing.roomType && service.type !== "ACCOMMODATION")) {
        return NextResponse.json({ error: "Choose an active, compatible service belonging to this supplier." }, { status: 400 });
      }
    }
    data.serviceId = serviceId;
  }
  // Room type is deliberately immutable: each hotel Single/Double/Triple price is a separate record.
  const resultingMin = data.minPax !== undefined ? data.minPax as number | null : existing.minPax;
  const resultingMax = data.maxPax !== undefined ? data.maxPax as number | null : existing.maxPax;
  if (resultingMin != null && resultingMax != null && resultingMax < resultingMin) {
    return NextResponse.json({ error: "Maximum pax cannot be less than minimum pax." }, { status: 400 });
  }
  const resultingFrom = data.validFrom instanceof Date ? data.validFrom : existing.validFrom;
  const resultingTo = data.validTo instanceof Date ? data.validTo : existing.validTo;
  if (resultingTo < resultingFrom) return NextResponse.json({ error: "Valid To cannot precede Valid From." }, { status: 400 });
  if (existing.roomType && data.unit && data.unit !== SupplierRateUnit.PER_ROOM_PER_NIGHT && data.unit !== SupplierRateUnit.PER_PERSON_PER_NIGHT) {
    return NextResponse.json({ error: "Hotel room rates must be per room per night or per person per night." }, { status: 400 });
  }
  try {
    const rate = await db.supplierRate.update({ where: { id: existing.id }, data: data as unknown as Prisma.SupplierRateUncheckedUpdateInput });
    return NextResponse.json({ success: true, rate: { id: rate.id } });
  } catch (error) {
    console.error("SUPPLIER_RATE_UPDATE_ERROR", error);
    return NextResponse.json({ error: "Could not update the supplier rate." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id: supplierId, rateId } = await context.params;
  const rate = await db.supplierRate.findFirst({ where: { id: rateId, supplierId }, select: { id: true } });
  if (!rate) return NextResponse.json({ error: "Supplier rate not found." }, { status: 404 });
  const quoted = await isReferencedBySavedQuotation(rate.id);
  if (quoted) return NextResponse.json({ error: "This rate is referenced by a saved quotation. Deactivate it instead to preserve its quote history." }, { status: 409 });
  const payables = await db.supplierPayable.count({ where: { rateId: rate.id } });
  if (payables) return NextResponse.json({ error: "This rate is linked to supplier payables. Deactivate it instead to preserve accounting history." }, { status: 409 });
  try {
    await db.supplierRate.delete({ where: { id: rate.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SUPPLIER_RATE_DELETE_PROTECTED", error);
    return NextResponse.json({ error: "This rate may still be referenced by another record. Deactivate it instead." }, { status: 409 });
  }
}
