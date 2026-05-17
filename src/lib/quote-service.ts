import {
  PartnerType,
  QuoteActivityAction,
  QuoteItemType,
  QuotePurpose,
  QuoteStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { calculateQuoteTotals, generateQuoteReference } from "@/lib/quote-utils";

type CreateQuoteItemInput = {
  itemType?: QuoteItemType;
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  currency?: string;
  optional?: boolean;
  sortOrder?: number;
};

type CreateQuoteInput = {
  requestId?: string | null;
  tourId?: string | null;
  departureDateId?: string | null;

  purpose: QuotePurpose;

  title?: string;
  clientMessage?: string;
  internalNotes?: string;
  termsAndNotes?: string;
  validityNotes?: string;

  recipientName?: string;
  recipientEmail?: string;
  recipientType?: PartnerType | null;

  currency?: string;
  expiresAt?: Date | null;

  items: CreateQuoteItemInput[];
  actorId?: string | null;

  agentName?: string;
  clientName?: string;
  destination?: string;
  travelDates?: string;
  validUntil?: Date | null;
  groupSize?: number | null;

  subtotal?: number;
  totalAmount?: number;

  quoteBuilderPayload?: Record<string, unknown>;
  quoteBuilderSummary?: Record<string, unknown>;
  calculationVersion?: string;
};

export async function createQuote(input: CreateQuoteInput) {
  const totals = calculateQuoteTotals(
    input.items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount || 0,
      taxAmount: item.taxAmount || 0,
    }))
  );

  const created = await db.quote.create({
    data: {
      requestId: input.requestId ?? null,
      tourId: input.tourId ?? null,
      departureDateId: input.departureDateId ?? null,
      purpose: input.purpose,
      status: QuoteStatus.DRAFT,

      title: input.title,
      clientMessage: input.clientMessage,
      internalNotes: input.internalNotes,
      termsAndNotes: input.termsAndNotes,
      validityNotes: input.validityNotes,

      recipientName: input.recipientName,
      recipientEmail: input.recipientEmail,
      recipientType: input.recipientType ?? null,

      currency: input.currency || "EUR",

      agentName: input.agentName,
      clientName: input.clientName,
      destination: input.destination,
      travelDates: input.travelDates,
      validUntil: input.validUntil ?? null,
      groupSize: input.groupSize ?? null,

      subtotal: input.subtotal ?? totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      totalAmount: input.totalAmount ?? totals.totalAmount,

      expiresAt: input.expiresAt ?? null,

      quoteBuilderPayload: input.quoteBuilderPayload ? JSON.parse(JSON.stringify(input.quoteBuilderPayload)) : null,
      quoteBuilderSummary: input.quoteBuilderSummary ? JSON.parse(JSON.stringify(input.quoteBuilderSummary)) : null,
      calculationVersion: input.calculationVersion,

      items: {
        create: input.items.map((item) => ({
          itemType: item.itemType ?? QuoteItemType.SERVICE,
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount || 0,
          taxRate: item.taxRate ?? null,
          taxAmount: item.taxAmount || 0,
          total: item.total,
          currency: item.currency || "EUR",
          optional: item.optional || false,
          sortOrder: item.sortOrder || 0,
        })),
      },

      activities: {
        create: {
          actorId: input.actorId ?? null,
          action: QuoteActivityAction.CREATED,
          toStatus: QuoteStatus.DRAFT,
          message: "Quote created",
        },
      },
    },
    include: {
      items: true,
    },
  });

  if (!created.quoteReference) {
    const quoteReference = generateQuoteReference(created.quoteNumber);

    return db.quote.update({
      where: { id: created.id },
      data: { quoteReference },
      include: {
        items: true,
        activities: true,
        tour: true,
        departureDate: true,
      },
    });
  }

  return db.quote.findUniqueOrThrow({
    where: { id: created.id },
    include: {
      items: true,
      activities: true,
      tour: true,
      departureDate: true,
    },
  });
}

export async function finalizeQuote(
  quoteId: string,
  actorId: string,
  pdfUrl: string
) {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: { items: true },
  });

  if (!quote) {
    throw new Error("Quote not found.");
  }

  if (quote.status !== QuoteStatus.DRAFT) {
    throw new Error("Only draft quotes can be finalized.");
  }

  return db.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.FINALIZED,
      finalizedAt: new Date(),
      finalizedById: actorId,
      pdfUrl,
      pdfGeneratedAt: new Date(),
      activities: {
        create: [
          {
            actorId,
            action: QuoteActivityAction.EXPORTED_PDF,
            fromStatus: QuoteStatus.DRAFT,
            toStatus: QuoteStatus.DRAFT,
            message: "Quote PDF generated",
            meta: { pdfUrl },
          },
          {
            actorId,
            action: QuoteActivityAction.FINALIZED,
            fromStatus: QuoteStatus.DRAFT,
            toStatus: QuoteStatus.FINALIZED,
            message: "Quote finalized",
          },
        ],
      },
    },
    include: {
      items: true,
      activities: true,
      tour: true,
      departureDate: true,
    },
  });
}

export async function sendQuote(quoteId: string, actorId: string) {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: { items: true },
  });

  if (!quote) {
    throw new Error("Quote not found.");
  }

  if (quote.status !== QuoteStatus.FINALIZED) {
    throw new Error("Only finalized quotes can be sent.");
  }

  if (!quote.recipientEmail) {
    throw new Error("Recipient email is required before sending.");
  }

  return db.quote.update({
    where: { id: quoteId },
    data: {
      status: QuoteStatus.SENT,
      sentAt: new Date(),
      sentById: actorId,
      activities: {
        create: {
          actorId,
          action: QuoteActivityAction.SENT,
          fromStatus: QuoteStatus.FINALIZED,
          toStatus: QuoteStatus.SENT,
          message: "Quote sent manually by admin",
          meta: {
            recipientEmail: quote.recipientEmail,
          },
        },
      },
    },
    include: {
      items: true,
      activities: true,
      tour: true,
      departureDate: true,
    },
  });
}