import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function stringValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function decimalValue(
  value: FormDataEntryValue | null,
  required = false,
): Prisma.Decimal | null {
  const text = stringValue(value);

  if (!text) {
    if (required) throw new Error("Required amount is missing.");
    return null;
  }

  const amount = new Prisma.Decimal(text);

  if (amount.isNegative()) {
    throw new Error("Amounts cannot be negative.");
  }

  return amount;
}

function dateValue(value: FormDataEntryValue | null) {
  const text = stringValue(value);
  if (!text) return null;

  const result = new Date(`${text}T12:00:00`);
  if (Number.isNaN(result.getTime())) throw new Error("Invalid date.");

  return result;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const form = await request.formData();

    const supplierId = stringValue(form.get("supplierId"));
    const serviceId = stringValue(form.get("serviceId"));
    const rateId = stringValue(form.get("rateId"));

    const title = stringValue(form.get("title"));
    const currency = stringValue(form.get("currency"))?.toUpperCase() || "EUR";

    if (!supplierId || !title) {
      return NextResponse.json(
        { error: "Supplier and title are required." },
        { status: 400 },
      );
    }

    const approvedAmount = decimalValue(form.get("approvedAmount"), true);
    if (!approvedAmount || approvedAmount.lte(0)) {
      return NextResponse.json(
        { error: "Approved amount must be greater than zero." },
        { status: 400 },
      );
    }

    const contractedAmount = decimalValue(form.get("contractedAmount"));
    const creditAmount = decimalValue(form.get("creditAmount")) ?? new Prisma.Decimal(0);

    if (creditAmount.gt(approvedAmount)) {
      return NextResponse.json(
        { error: "Credit amount cannot exceed the approved amount." },
        { status: 400 },
      );
    }

    const supplier = await db.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    }

    const service = serviceId
      ? await db.supplierService.findFirst({
          where: { id: serviceId, supplierId },
          select: { id: true, name: true },
        })
      : null;

    if (serviceId && !service) {
      return NextResponse.json(
        { error: "Selected service does not belong to this supplier." },
        { status: 400 },
      );
    }

    const rate = rateId
      ? await db.supplierRate.findFirst({
          where: { id: rateId, supplierId },
          select: { id: true, name: true, serviceId: true },
        })
      : null;

    if (rateId && !rate) {
      return NextResponse.json(
        { error: "Selected rate does not belong to this supplier." },
        { status: 400 },
      );
    }

    if (rate?.serviceId && serviceId && rate.serviceId !== serviceId) {
      return NextResponse.json(
        { error: "Selected rate does not match the selected service." },
        { status: 400 },
      );
    }

    const tourId = stringValue(form.get("tourId"));
    const departureDateId = stringValue(form.get("departureDateId"));
    const bookingId = stringValue(form.get("bookingId"));

    if (departureDateId) {
      const departure = await db.departureDate.findUnique({
        where: { id: departureDateId },
        select: { tourId: true },
      });

      if (!departure) {
        return NextResponse.json(
          { error: "Departure not found." },
          { status: 404 },
        );
      }

      if (tourId && departure.tourId !== tourId) {
        return NextResponse.json(
          { error: "Departure does not belong to the selected tour." },
          { status: 400 },
        );
      }
    }

    if (bookingId) {
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        select: { id: true },
      });

      if (!booking) {
        return NextResponse.json(
          { error: "Booking not found." },
          { status: 404 },
        );
      }
    }

    const balance = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      approvedAmount.minus(creditAmount),
    );

    const submitForApproval =
      stringValue(form.get("submitForApproval")) === "true";

    const payable = await db.supplierPayable.create({
      data: {
        supplierId,
        serviceId: service?.id ?? null,
        rateId: rate?.id ?? null,

        tourId,
        departureDateId,
        bookingId,

        createdById: session.user.id,

        title,
        description: stringValue(form.get("description")),

        supplierInvoiceNumber: stringValue(form.get("supplierInvoiceNumber")),
        supplierReference: stringValue(form.get("supplierReference")),
        invoiceDate: dateValue(form.get("invoiceDate")),
        dueDate: dateValue(form.get("dueDate")),

        currency,
        contractedAmount,
        approvedAmount,
        creditAmount,
        amountPaid: new Prisma.Decimal(0),
        balance,

        approvalStatus: submitForApproval ? "PENDING_APPROVAL" : "DRAFT",
        paymentStatus: "UNPAID",

        documentUrl: stringValue(form.get("documentUrl")),
        internalNotes: stringValue(form.get("internalNotes")),

        supplierNameSnapshot: supplier.name,
        serviceNameSnapshot: service?.name ?? null,
        rateNameSnapshot: rate?.name ?? null,
      },
    });

    return NextResponse.json({ success: true, payable }, { status: 201 });
  } catch (error) {
    console.error("CREATE_SUPPLIER_PAYABLE_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create supplier payable.",
      },
      { status: 400 },
    );
  }
}
