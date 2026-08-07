import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role, SupplierStatus, SupplierType } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

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

    const supplier = await db.supplier.create({
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

    return NextResponse.json({ success: true, supplier }, { status: 201 });
  } catch (error) {
    console.error("CREATE_SUPPLIER_ERROR", error);
    return NextResponse.json(
      { error: "Could not create supplier. Check that the supplier code is unique." },
      { status: 500 },
    );
  }
}
