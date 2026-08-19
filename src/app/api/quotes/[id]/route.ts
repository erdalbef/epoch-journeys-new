import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, QuotePurpose } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
   * Group setup
   */
  totalPassengers?: number;
  freePassengers?: number;
  payingPassengers?: number;

  /*
   * Complimentary travelers
   */
  complimentarySetup?: Prisma.JsonObject;

  groupLeaderAllowanceTotal?: number;

  /*
   * Epoch pricing
   */
  markupMode?: MarkupMode;

  epochMarkupPercent?: number;
  epochMarkupPerPerson?: number;

  /*
   * Retained for backward compatibility.
   * Epoch is using NET pricing rather than
   * calculating agent commission.
   */
  agentCommissionPercent?: number;

  pricingMode?: PricingMode;

  /*
   * Current calculator rows
   */
  paxPricingRows?: Prisma.JsonArray;

  hotels?: Prisma.JsonArray;

  fixedCostRows?: Prisma.JsonArray;

  operationalCostRows?: Prisma.JsonArray;

  /*
   * Legacy calculator rows
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

function toNumber(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

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

function buildQuoteBuilderSummary(
  body: QuotePayload
): Prisma.JsonObject {
  const markupMode =
    normalizeMarkupMode(
      body.markupMode
    );

  const pricingMode =
    normalizePricingMode(
      body.pricingMode
    );

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

  const epochMarkupPercent =
    markupMode === "PERCENTAGE"
      ? Math.max(
          toNumber(
            body.epochMarkupPercent
          ),
          0
        )
      : 0;

  const epochMarkupPerPerson =
    markupMode === "FIXED_PER_PERSON"
      ? Math.max(
          toNumber(
            body.epochMarkupPerPerson
          ),
          0
        )
      : 0;

  return {
    startDate:
      body.startDate ??
      null,

    endDate:
      body.endDate ??
      null,

    briefItinerary:
      body.briefItinerary?.trim() ||
      "",

    /*
     * Group structure
     */
    totalPassengers,

    freePassengers,

    payingPassengers,

    /*
     * Complimentary travelers
     */
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
     * Epoch NET pricing
     */
    markupMode,

    epochMarkupPercent,

    epochMarkupPerPerson,

    /*
     * Agent commission is no longer part
     * of the Epoch pricing calculation.
     */
    agentCommissionPercent: 0,

    pricingMode,

    pricingPolicy:
      body.pricingPolicy ??
      "B2B_NET_AGENT_MARKUP",

    /*
     * Current calculator structures
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
     * Legacy structures retained so
     * older saved quotes remain compatible.
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
     * Stored in quoteBuilderSummary so no new
     * Prisma columns are required.
     */
    availabilityNotes:
      body.availabilityNotes?.trim() ||
      "",

    nextStepNotes:
      body.nextStepNotes?.trim() ||
      "",
  };
}

async function requireAdmin() {
  const session =
    await getServerSession(
      authOptions
    );

  if (
    !session?.user ||
    session.user.role !== "ADMIN"
  ) {
    return false;
  }

  return true;
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const isAdmin =
      await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await context.params;

    const quote =
      await db.quote.findUnique({
        where: {
          id,
        },

        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });

    if (!quote) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Quote not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      quote,
    });
  } catch (error) {
    console.error(
      "GET_QUOTE_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Failed to load quote.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const isAdmin =
      await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await context.params;

    const body =
      (await req.json()) as QuotePayload;

    const existing =
      await db.quote.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Quote not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      existing.status !== "DRAFT"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only draft quotes can be edited.",
        },
        {
          status: 400,
        }
      );
    }

    const currency =
      body.currency ||
      "EUR";

    const items =
      Array.isArray(
        body.items
      )
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

    const quoteBuilderSummary =
      buildQuoteBuilderSummary(
        body
      );

    const quote =
      await db.quote.update({
        where: {
          id,
        },

        data: {
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

          quoteBuilderSummary,

          /*
           * Client-facing document
           */
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

          /*
           * Replace quote items with
           * the current builder version.
           */
          items: {
            deleteMany: {},

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
  } catch (error) {
    console.error(
      "UPDATE_QUOTE_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to update quote.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const isAdmin =
      await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await context.params;

    const existing =
      await db.quote.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Quote not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      existing.status !== "DRAFT"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only draft quotes can be deleted.",
        },
        {
          status: 400,
        }
      );
    }

    await db.quote.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "DELETE_QUOTE_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Delete failed.",
      },
      {
        status: 500,
      }
    );
  }
}