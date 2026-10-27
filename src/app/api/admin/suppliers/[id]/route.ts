import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role, SupplierStatus, SupplierType } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { isReferencedBySavedQuotation } from "@/lib/suppliers/quoteReferences";

type Context = { params: Promise<{ id: string }> };

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const name = text(body.name);
    const type = text(body.type);

    if (!name || !type || !Object.values(SupplierType).includes(type as SupplierType)) {
      return NextResponse.json(
        { error: "Supplier name and a valid supplier type are required." },
        { status: 400 },
      );
    }

    const status =
      typeof body.status === "string" &&
      Object.values(SupplierStatus).includes(body.status as SupplierStatus)
        ? (body.status as SupplierStatus)
        : SupplierStatus.ACTIVE;

    const rating =
      typeof body.rating === "number" && Number.isFinite(body.rating)
        ? Math.min(5, Math.max(1, Math.round(body.rating)))
        : null;

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        name,
        legalName: text(body.legalName),
        code: text(body.code),
        type: type as SupplierType,
        status,
        country: text(body.country),
        city: text(body.city),
        address: text(body.address),
        postalCode: text(body.postalCode),
        website: text(body.website),
        email: text(body.email),
        phone: text(body.phone),
        emergencyPhone: text(body.emergencyPhone),
        defaultCurrency: text(body.defaultCurrency) || "EUR",
        taxNumber: text(body.taxNumber),
        paymentTerms: text(body.paymentTerms),
        cancellationTerms: text(body.cancellationTerms),
        preferred: Boolean(body.preferred),
        rating,
        notes: text(body.notes),
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error) {
    console.error("UPDATE_SUPPLIER_ERROR", error);
    return NextResponse.json(
      { error: "Could not update supplier. Check that the supplier code is unique." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const supplier = await db.supplier.findUnique({
    where: { id },
    select: {
      _count: { select: { contacts: true, services: true, rates: true, contracts: true, massArrangements: true } },
    },
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });

  const quoted = await isReferencedBySavedQuotation(id);
  if (quoted) return NextResponse.json({ error: "Supplier appears in a saved quotation. Mark it INACTIVE instead to preserve quote history." }, { status: 409 });
  const payables = await db.supplierPayable.count({ where: { supplierId: id } });
  const linked = Object.values(supplier._count).reduce((total, value) => total + value, 0) + payables;
  if (linked > 0) {
    return NextResponse.json({
      error: "Supplier has contacts, services, rates, contracts, Mass arrangements, or payables. Delete unused children first; otherwise mark the supplier INACTIVE to preserve history.",
    }, { status: 409 });
  }
  try {
    await db.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SUPPLIER_DELETE_PROTECTED", error);
    return NextResponse.json({ error: "Supplier is referenced by another record. Mark it INACTIVE instead." }, { status: 409 });
  }
}
