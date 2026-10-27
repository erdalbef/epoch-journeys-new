import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role, SupplierServiceType } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { isReferencedBySavedQuotation } from "@/lib/suppliers/quoteReferences";

type Context = { params: Promise<{ id: string; serviceId: string }> };

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: supplierId, serviceId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const allowed = ["name", "type", "description", "country", "city", "notes", "isActive"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) {
    return NextResponse.json({ error: "Unsupported service field." }, { status: 400 });
  }
  if (Object.keys(input).length === 0) {
    return NextResponse.json({ error: "No changes supplied." }, { status: 400 });
  }

  const changes: {
    name?: string;
    type?: SupplierServiceType;
    description?: string | null;
    country?: string | null;
    city?: string | null;
    notes?: string | null;
    isActive?: boolean;
  } = {};

  if ("type" in input) {
    if (typeof input.type !== "string" || !Object.values(SupplierServiceType).includes(input.type as SupplierServiceType)) {
      return NextResponse.json({ error: "Invalid service type." }, { status: 400 });
    }
    changes.type = input.type as SupplierServiceType;
  }
  if ("name" in input) {
    const name = optionalText(input.name);
    if (!name) return NextResponse.json({ error: "Service name is required." }, { status: 400 });
    changes.name = name;
  }
  for (const key of ["description", "country", "city", "notes"] as const) {
    if (key in input) {
      if (input[key] !== null && typeof input[key] !== "string") {
        return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
      }
      changes[key] = optionalText(input[key]);
    }
  }
  if ("isActive" in input) {
    if (typeof input.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean." }, { status: 400 });
    }
    changes.isActive = input.isActive;
  }

  const existing = await db.supplierService.findFirst({
    where: { id: serviceId, supplierId },
    select: { id: true, type: true },
  });
  if (!existing) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  if (changes.type && changes.type !== existing.type) {
    const [rates, payables] = await Promise.all([
      db.supplierRate.count({ where: { serviceId: existing.id } }),
      db.supplierPayable.count({ where: { serviceId: existing.id } }),
    ]);
    const quoted = await isReferencedBySavedQuotation(existing.id);
    if (rates || payables || quoted) return NextResponse.json({ error: "This service has linked rates, payables, or saved quotations. Create a new service instead of changing its type." }, { status: 409 });
  }
  const service = await db.supplierService.update({
    where: { id: existing.id },
    data: changes,
  });
  return NextResponse.json({ success: true, service });
}

export async function DELETE(_request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id: supplierId, serviceId } = await context.params;
  const service = await db.supplierService.findFirst({ where: { id: serviceId, supplierId }, select: { id: true } });
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });
  const quoted = await isReferencedBySavedQuotation(serviceId);
  if (quoted) return NextResponse.json({ error: "This service is referenced by a saved quotation. Deactivate it instead." }, { status: 409 });
  const [rates, payables] = await Promise.all([
    db.supplierRate.count({ where: { serviceId } }),
    db.supplierPayable.count({ where: { serviceId } }),
  ]);
  if (rates || payables) return NextResponse.json({
    error: `Service has ${rates} linked rate(s) and ${payables} payable(s). Deactivate it instead; linked records must be preserved.`,
  }, { status: 409 });
  try {
    await db.supplierService.delete({ where: { id: service.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SUPPLIER_SERVICE_DELETE_PROTECTED", error);
    return NextResponse.json({ error: "Service is referenced by another record. Deactivate it instead." }, { status: 409 });
  }
}
