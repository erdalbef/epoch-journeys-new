import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  Prisma,
  QuotePurpose,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type GeneratedQuoteItemType =
  | "SERVICE"
  | "ACCOMMODATION"
  | "TRANSPORT"
  | "GUIDE"
  | "ACTIVITY"
  | "FLIGHT"
  | "FEE"
  | "DISCOUNT"
  | "CUSTOM";

type MarkupMode =
  | "PERCENTAGE"
  | "FIXED_PER_PERSON";

type PricingMode =
  | "CALCULATED"
  | "MANUAL";

type QuoteItemInput = {
  title: string;
  description?: string | null;
  itemType: GeneratedQuoteItemType;
  optional: boolean;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  sortOrder: number;
};

type QuotePayload = {
  templateId?: string | null;

  purpose?: string;

  tourId?: string | null;
  departureDateId?: string | null;

  title?: string;

  recipientName?: string;
  recipientEmail?: string;

  internalNotes?: string;
  termsAndNotes?: string;

  currency?: string;

  agentId?: string | null;
  agentCompany?: string | null;

  pricingPolicy?: string | null;

  startDate?: string | null;
  endDate?: string | null;

  briefItinerary?: string | null;

  /*
   * Passenger structure
   */
  totalPassengers?: number;
  freePassengers?: number;
  payingPassengers?: number;

  /*
   * Complimentary traveler structure
   */
  complimentarySetup?: Prisma.JsonObject;

  groupLeaderAllowanceTotal?: number;

  /*
   * Pricing / markup
   */
  markupMode?: MarkupMode;

  epochMarkupPercent?: number;
  epochMarkupPerPerson?: number;

  /*
   * Retained only for backward/API compatibility.
   * Epoch currently uses B2B NET pricing rather
   * than calculating agent commission.
   */
  agentCommissionPercent?: number;

  pricingMode?: PricingMode;

  /*
   * Current quote-builder structures
   */
  paxPricingRows?: Prisma.JsonArray;

  hotels?: Prisma.JsonArray;

  fixedCostRows?: Prisma.JsonArray;

  operationalCostRows?: Prisma.JsonArray;

  /*
   * Legacy structures retained so old quote
   * payloads can still be handled if necessary.
   */
  entranceRows?: Prisma.JsonArray;
  tipRows?: Prisma.JsonArray;
  otherFixedRows?: Prisma.JsonArray;
  variableCostRows?: Prisma.JsonArray;
  tourManagerRows?: Prisma.JsonArray;
  guideRows?: Prisma.JsonArray;
  driverRows?: Prisma.JsonArray;

  /*
   * Client-facing offer
   */
  clientDocumentTitle?: string;

  clientSinglePrice?: number;
  clientDoubleTwinPrice?: number;
  clientTriplePrice?: number;

  clientIncludes?: string;
  clientExcludes?: string;

  paymentPolicy?: string;
  cancellationPolicy?: string;

  clientOfferNotes?: string;

  /*
   * Quotation validity / acceptance wording
   */
  availabilityNotes?: string;
  nextStepNotes?: string;

  validUntil?: string | null;

  items?: QuoteItemInput[];
};

function toNumber(
  value: unknown
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

function normalizeMarkupMode(
  value: unknown
): MarkupMode {
  return value === "FIXED_PER_PERSON"
    ? "FIXED_PER_PERSON"
    : "PERCENTAGE";
}

function normalizePricingMode(
  value: unknown
): PricingMode {
  return value === "MANUAL"
    ? "MANUAL"
    : "CALCULATED";
}

function normalizeJsonObject(
  value: unknown
): Prisma.JsonObject {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Prisma.JsonObject;
  }

  return {};
}

function normalizeJsonArray(
  value: unknown
): Prisma.JsonArray {
  return Array.isArray(value)
    ? (value as Prisma.JsonArray)
    : [];
}

function generateQuoteNumber() {
  const now = new Date();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  const random =
    Math.floor(
      Math.random() * 9000
    ) + 1000;

  return Number(
    `${month}${day}${random}`
  );
}

export async function POST(
  req: Request
) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (
      !session?.user ||
      session.user.role !==
        "ADMIN"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await req.json()) as QuotePayload;

    const currency =
      body.currency || "EUR";

    const items =
      Array.isArray(body.items)
        ? body.items
        : [];

    const totalAmount =
      items.reduce(
        (
          sum,
          item
        ) =>
          sum +
          toNumber(
            item.total
          ),
        0
      );

    const quoteNumber =
      generateQuoteNumber();

    const markupMode =
      normalizeMarkupMode(
        body.markupMode
      );

    const pricingMode =
      normalizePricingMode(
        body.pricingMode
      );

    const epochMarkupPercent =
      markupMode ===
      "PERCENTAGE"
        ? Math.max(
            toNumber(
              body.epochMarkupPercent
            ),
            0
          )
        : 0;

    const epochMarkupPerPerson =
      markupMode ===
      "FIXED_PER_PERSON"
        ? Math.max(
            toNumber(
              body.epochMarkupPerPerson
            ),
            0
          )
        : 0;

    const totalPassengers =
      Math.max(
        Math.floor(
          toNumber(
            body.totalPassengers
          )
        ),
        0
      );

    const freePassengers =
      Math.max(
        Math.floor(
          toNumber(
            body.freePassengers
          )
        ),
        0
      );

    const payingPassengers =
      Math.max(
        Math.floor(
          toNumber(
            body.payingPassengers
          )
        ),
        0
      );

    /*
     * Everything needed to reopen and edit the
     * quote builder is stored in this JSON object.
     */
    const quoteBuilderSummary:
      Prisma.JsonObject = {
      startDate:
        body.startDate ??
        null,

      endDate:
        body.endDate ??
        null,

      briefItinerary:
        body.briefItinerary?.trim() ||
        "",

      totalPassengers,

      freePassengers,

      payingPassengers,

      complimentarySetup:
        normalizeJsonObject(
          body.complimentarySetup
        ),

      groupLeaderAllowanceTotal:
        Math.max(
          toNumber(
            body.groupLeaderAllowanceTotal
          ),
          0
        ),

      /*
       * New flexible Epoch markup system
       */
      markupMode,

      epochMarkupPercent,

      epochMarkupPerPerson,

      /*
       * Retained for compatibility only.
       */
      agentCommissionPercent:
        0,

      pricingMode,

      pricingPolicy:
        body.pricingPolicy ??
        "B2B_NET_AGENT_MARKUP",

      /*
       * Current builder data
       */
      paxPricingRows:
        normalizeJsonArray(
          body.paxPricingRows
        ),

      hotels:
        normalizeJsonArray(
          body.hotels
        ),

      fixedCostRows:
        normalizeJsonArray(
          body.fixedCostRows
        ),

      operationalCostRows:
        normalizeJsonArray(
          body.operationalCostRows
        ),

      /*
       * Legacy builder structures
       */
      entranceRows:
        normalizeJsonArray(
          body.entranceRows
        ),

      tipRows:
        normalizeJsonArray(
          body.tipRows
        ),

      otherFixedRows:
        normalizeJsonArray(
          body.otherFixedRows
        ),

      variableCostRows:
        normalizeJsonArray(
          body.variableCostRows
        ),

      tourManagerRows:
        normalizeJsonArray(
          body.tourManagerRows
        ),

      guideRows:
        normalizeJsonArray(
          body.guideRows
        ),

      driverRows:
        normalizeJsonArray(
          body.driverRows
        ),

      /*
       * Client-facing validity / acceptance wording.
       * Stored in quoteBuilderSummary so these fields can
       * be reopened and edited without requiring new
       * Quote model columns.
       */
      availabilityNotes:
        body.availabilityNotes?.trim() ||
        "",

      nextStepNotes:
        body.nextStepNotes?.trim() ||
        "",
    };

    const quote =
      await db.quote.create({
        data: {
          quoteNumber,

          quoteReference:
            `Q-${quoteNumber}`,

          templateId:
            body.templateId ??
            null,

          purpose:
            body.purpose ===
            "TOUR_SETUP"
              ? QuotePurpose.TOUR_SETUP
              : QuotePurpose.CUSTOM_REQUEST,

          tourId:
            body.tourId ||
            null,

          departureDateId:
            body.departureDateId ||
            null,

          title:
            body.title?.trim() ||
            "Untitled Quote",

          recipientName:
            body.recipientName?.trim() ||
            null,

          recipientEmail:
            body.recipientEmail?.trim() ||
            null,

          internalNotes:
            body.internalNotes?.trim() ||
            null,

          termsAndNotes:
            body.termsAndNotes?.trim() ||
            null,

          currency,

          totalAmount,

          status:
            "DRAFT",

          quoteBuilderSummary,

          clientDocumentTitle:
            body.clientDocumentTitle?.trim() ||
            null,

          clientSinglePrice:
            toNumber(
              body.clientSinglePrice
            ),

          clientDoubleTwinPrice:
            toNumber(
              body.clientDoubleTwinPrice
            ),

          clientTriplePrice:
            toNumber(
              body.clientTriplePrice
            ),

          clientIncludes:
            body.clientIncludes?.trim() ||
            null,

          clientExcludes:
            body.clientExcludes?.trim() ||
            null,

          paymentPolicy:
            body.paymentPolicy?.trim() ||
            null,

          cancellationPolicy:
            body.cancellationPolicy?.trim() ||
            null,

          clientOfferNotes:
            body.clientOfferNotes?.trim() ||
            null,

          validUntil:
            body.validUntil
              ? new Date(
                  body.validUntil
                )
              : null,

          items: {
            create:
              items.map(
                (
                  item,
                  index
                ) => ({
                  title:
                    item.title,

                  description:
                    item.description ||
                    null,

                  itemType:
                    item.itemType,

                  optional:
                    item.optional,

                  quantity:
                    toNumber(
                      item.quantity
                    ),

                  unitPrice:
                    toNumber(
                      item.unitPrice
                    ),

                  discountAmount:
                    toNumber(
                      item.discountAmount
                    ),

                  taxAmount:
                    toNumber(
                      item.taxAmount
                    ),

                  total:
                    toNumber(
                      item.total
                    ),

                  currency,

                  sortOrder:
                    item.sortOrder ??
                    index,
                })
              ),
          },
        },

        select: {
          id: true,

          quoteReference:
            true,

          quoteNumber:
            true,
        },
      });

    return NextResponse.json({
      ok: true,
      quote,
    });
  } catch (
    error
  ) {
    console.error(
      "CREATE_QUOTE_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to create quote.",
      },
      {
        status: 500,
      }
    );
  }
}