import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  FinanceTaxType,
  Role,
  SalesDocumentType,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import {
  calculateLine,
  SALES_DOCUMENT_DEFAULTS,
} from "@/lib/sales-documents";

type CreateSalesDocumentItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number | null;
};

type CreateSalesDocumentBody = {
  type: SalesDocumentType;
  bookingId?: string | null;
  dueDate?: string | null;

  recipientName: string;
  recipientCompany?: string | null;
  recipientEmail?: string | null;
  recipientAddress?: string | null;
  recipientCity?: string | null;
  recipientPostalCode?: string | null;
  recipientCountry?: string | null;
  recipientTaxNumber?: string | null;
  recipientVatNumber?: string | null;

  serviceDescriptionEn?: string | null;
  serviceDescriptionBg?: string | null;
  vatEn?: string | null;
  vatBg?: string | null;
  paymentEn?: string | null;
  paymentBg?: string | null;
  notes?: string | null;

  items: CreateSalesDocumentItemInput[];
};

type CalculatedItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxType: FinanceTaxType;
  taxRate: number | null;
  taxAmount: number;
  netAmount: number;
  grossAmount: number;
  sortOrder: number;
};

function optionalText(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as CreateSalesDocumentBody;

    const validDocumentType = Object.values(
      SalesDocumentType,
    ).includes(body.type);

    if (
      !validDocumentType ||
      !body.recipientName?.trim() ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Document type, recipient and at least one item are required.",
        },
        { status: 400 },
      );
    }

    const booking = body.bookingId
      ? await db.booking.findUnique({
          where: {
            id: body.bookingId,
          },
          select: {
            bookingReference: true,
            tourTitleSnapshot: true,
            departureDateSnapshot: true,
            groupName: true,
            currency: true,
            amountPaid: true,
          },
        })
      : null;

    const items: CalculatedItem[] = body.items.map(
      (item, index) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const taxRate = Number(item.taxRate ?? 0);

        if (
          !Number.isFinite(quantity) ||
          quantity <= 0 ||
          !Number.isFinite(unitPrice) ||
          unitPrice < 0 ||
          !Number.isFinite(taxRate) ||
          taxRate < 0
        ) {
          throw new Error("Invalid sales document line item.");
        }

        const taxType =
          taxRate > 0
            ? FinanceTaxType.VAT
            : FinanceTaxType.NONE;

        const calculated = calculateLine({
          quantity,
          unitPrice,
          taxRate,
          taxType,
        });

        return {
          description:
            item.description?.trim() || "Service",
          quantity,
          unitPrice,
          discountAmount: 0,
          taxType,
          taxRate: taxRate > 0 ? taxRate : null,
          taxAmount: calculated.taxAmount,
          netAmount: calculated.netAmount,
          grossAmount: calculated.grossAmount,
          sortOrder: index,
        };
      },
    );

    const subtotal = items.reduce(
      (sum: number, item: CalculatedItem) =>
        sum + item.netAmount,
      0,
    );

    const taxTotal = items.reduce(
      (sum: number, item: CalculatedItem) =>
        sum + item.taxAmount,
      0,
    );

    const totalAmount = items.reduce(
      (sum: number, item: CalculatedItem) =>
        sum + item.grossAmount,
      0,
    );

    const amountPaid = booking?.amountPaid ?? 0;

    const serviceDescriptionEn =
      optionalText(body.serviceDescriptionEn) ?? "";

    const serviceDescriptionBg =
      optionalText(body.serviceDescriptionBg) ?? "";

    const vatEn =
      optionalText(body.vatEn) ??
      SALES_DOCUMENT_DEFAULTS.vatEn;

    const vatBg =
      optionalText(body.vatBg) ??
      SALES_DOCUMENT_DEFAULTS.vatBg;

    const paymentEn =
      optionalText(body.paymentEn) ??
      SALES_DOCUMENT_DEFAULTS.paymentEn;

    const paymentBg =
      optionalText(body.paymentBg) ??
      SALES_DOCUMENT_DEFAULTS.paymentBg;

    const notes = [
      optionalText(body.notes),
      `PAYMENT_EN:${paymentEn}`,
      `PAYMENT_BG:${paymentBg}`,
    ]
      .filter((value): value is string => Boolean(value))
      .join("\n\n");

    const document = await db.salesDocument.create({
      data: {
        type: body.type,
        bookingId: body.bookingId || null,
        createdById: session.user.id,

        currency: booking?.currency || "EUR",

        dueDate: body.dueDate
          ? new Date(`${body.dueDate}T12:00:00.000Z`)
          : null,

        subtotal,
        discountTotal: 0,
        taxTotal,
        totalAmount,
        amountPaid,
        balance: Math.max(0, totalAmount - amountPaid),

        recipientName: body.recipientName.trim(),
        recipientCompany: optionalText(
          body.recipientCompany,
        ),
        recipientEmail: optionalText(body.recipientEmail),
        recipientAddress: optionalText(body.recipientAddress),
        recipientCity: optionalText(body.recipientCity),
        recipientPostalCode: optionalText(
          body.recipientPostalCode,
        ),
        recipientCountry: optionalText(
          body.recipientCountry,
        ),
        recipientTaxNumber: optionalText(
          body.recipientTaxNumber,
        ),
        recipientVatNumber: optionalText(
          body.recipientVatNumber,
        ),

        issuerName: SALES_DOCUMENT_DEFAULTS.issuerName,
        issuerLegalName:
          SALES_DOCUMENT_DEFAULTS.issuerLegalName,
        issuerAddress:
          SALES_DOCUMENT_DEFAULTS.issuerAddress,
        issuerCountry:
          SALES_DOCUMENT_DEFAULTS.issuerCountry,
        issuerVatNumber:
          SALES_DOCUMENT_DEFAULTS.issuerVatNumber,

        bankName: SALES_DOCUMENT_DEFAULTS.bankName,
        bankAccountName:
          SALES_DOCUMENT_DEFAULTS.bankAccountName,
        iban: SALES_DOCUMENT_DEFAULTS.iban,
        swiftBic: SALES_DOCUMENT_DEFAULTS.swiftBic,

        bookingReferenceSnapshot:
          booking?.bookingReference || null,
        tourTitleSnapshot:
          booking?.tourTitleSnapshot || null,
        departureDateSnapshot:
          booking?.departureDateSnapshot || null,
        groupNameSnapshot: booking?.groupName || null,

        paymentTerms: `${serviceDescriptionEn}\n---BG---\n${serviceDescriptionBg}`,
        footerNotes: `${vatEn}\n---BG---\n${vatBg}`,
        notes,

        items: {
          create: items,
        },
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      id: document.id,
    });
  } catch (error) {
    console.error("CREATE_SALES_DOCUMENT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create sales document.",
      },
      { status: 500 },
    );
  }
}
