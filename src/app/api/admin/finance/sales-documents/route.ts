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

type ItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
};

type SalesDocumentInput = {
  type: SalesDocumentType;
  bookingId?: string | null;
  billToProfileKey?: string | null;
  saveBillingProfile?: boolean;
  recipientName: string;
  recipientCompany?: string | null;
  recipientEmail?: string | null;
  recipientEmailSecondary?: string | null;
  recipientAddress?: string | null;
  recipientCity?: string | null;
  recipientPostalCode?: string | null;
  recipientCountry?: string | null;
  recipientTaxNumber?: string | null;
  recipientVatNumber?: string | null;
  dueDate?: string | null;
  amountPaid?: number;
  serviceDescriptionEn?: string;
  serviceDescriptionBg?: string;
  vatEn?: string;
  vatBg?: string;
  paymentEn?: string;
  paymentBg?: string;
  additionalNotes?: string | null;
  items: ItemInput[];
};

function clean(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

async function saveBillingProfile(body: SalesDocumentInput) {
  if (!body.saveBillingProfile || !body.billToProfileKey) return;

  const [kind, id] = body.billToProfileKey.split(":");
  if (!id) return;

  const data = {
    billingContactName: clean(body.recipientName),
    billingCompanyName: clean(body.recipientCompany),
    billingAddress: clean(body.recipientAddress),
    billingCity: clean(body.recipientCity),
    billingPostalCode: clean(body.recipientPostalCode),
    billingCountry: clean(body.recipientCountry),
    billingTaxNumber: clean(body.recipientTaxNumber),
    billingVatNumber: clean(body.recipientVatNumber),
    billingEmail: clean(body.recipientEmail),
    billingEmailSecondary: clean(body.recipientEmailSecondary),
  };

  if (kind === "USER") {
    await db.user.update({ where: { id }, data });
  } else if (kind === "PARTNER") {
    await db.partnerCompany.update({ where: { id }, data });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SalesDocumentInput;

    if (
      !Object.values(SalesDocumentType).includes(body.type) ||
      !body.recipientName?.trim() ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        { error: "Document type, recipient and at least one item are required." },
        { status: 400 },
      );
    }

    const booking = body.bookingId
      ? await db.booking.findUnique({
          where: { id: body.bookingId },
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

    const items = body.items.map((item, index) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const taxRate = Number(item.taxRate || 0);

      if (
        !Number.isFinite(quantity) ||
        quantity < 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        !Number.isFinite(taxRate) ||
        taxRate < 0
      ) {
        throw new Error("Invalid line-item amount.");
      }

      const taxType = taxRate > 0 ? FinanceTaxType.VAT : FinanceTaxType.NONE;
      const calculated = calculateLine({
        quantity,
        unitPrice,
        taxRate,
        taxType,
      });

      return {
        description: String(item.description || "Service").trim() || "Service",
        quantity,
        unitPrice,
        discountAmount: 0,
        taxType,
        taxRate: taxRate || null,
        taxAmount: calculated.taxAmount,
        netAmount: calculated.netAmount,
        grossAmount: calculated.grossAmount,
        sortOrder: index,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.netAmount, 0);
    const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.grossAmount, 0);

    const manualAmountPaid = Number(body.amountPaid || 0);
    const amountPaid = booking
      ? booking.amountPaid
      : Number.isFinite(manualAmountPaid)
        ? Math.max(0, manualAmountPaid)
        : 0;

    await saveBillingProfile(body);

    const doc = await db.salesDocument.create({
      data: {
        type: body.type,
        bookingId: body.bookingId || null,
        createdById: session.user.id,
        currency: booking?.currency || "EUR",
        dueDate: body.dueDate ? new Date(`${body.dueDate}T12:00:00Z`) : null,
        subtotal,
        taxTotal,
        totalAmount,
        amountPaid,
        balance: Math.max(0, totalAmount - amountPaid),

        recipientName: body.recipientName.trim(),
        recipientCompany: clean(body.recipientCompany),
        recipientEmail: clean(body.recipientEmail),
        recipientEmailSecondary: clean(body.recipientEmailSecondary),
        recipientAddress: clean(body.recipientAddress),
        recipientCity: clean(body.recipientCity),
        recipientPostalCode: clean(body.recipientPostalCode),
        recipientCountry: clean(body.recipientCountry),
        recipientTaxNumber: clean(body.recipientTaxNumber),
        recipientVatNumber: clean(body.recipientVatNumber),

        issuerName: SALES_DOCUMENT_DEFAULTS.issuerName,
        issuerLegalName: SALES_DOCUMENT_DEFAULTS.issuerLegalName,
        issuerAddress: SALES_DOCUMENT_DEFAULTS.issuerAddress,
        issuerCountry: SALES_DOCUMENT_DEFAULTS.issuerCountry,
        issuerVatNumber: SALES_DOCUMENT_DEFAULTS.issuerVatNumber,

        bankName: SALES_DOCUMENT_DEFAULTS.bankName,
        bankAccountName: SALES_DOCUMENT_DEFAULTS.bankAccountName,
        iban: SALES_DOCUMENT_DEFAULTS.iban,
        swiftBic: SALES_DOCUMENT_DEFAULTS.swiftBic,

        bookingReferenceSnapshot: booking?.bookingReference || null,
        tourTitleSnapshot: booking?.tourTitleSnapshot || null,
        departureDateSnapshot: booking?.departureDateSnapshot || null,
        groupNameSnapshot: booking?.groupName || null,

        paymentTerms: `${body.serviceDescriptionEn || ""}\n---BG---\n${body.serviceDescriptionBg || ""}`,
        footerNotes: `${body.vatEn || ""}\n---BG---\n${body.vatBg || ""}`,
        notes: [
          clean(body.additionalNotes),
          `PAYMENT_EN:${body.paymentEn || SALES_DOCUMENT_DEFAULTS.paymentEn}`,
          `PAYMENT_BG:${body.paymentBg || SALES_DOCUMENT_DEFAULTS.paymentBg}`,
        ]
          .filter(Boolean)
          .join("\n\n"),

        items: { create: items },
      },
    });

    return NextResponse.json({ id: doc.id });
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
