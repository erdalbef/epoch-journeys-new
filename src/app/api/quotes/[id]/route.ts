import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  Prisma,
  QuotePurpose,
} from "@prisma/client";

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

  totalPassengers?: number;
  freePassengers?: number;
  payingPassengers?: number;

  complimentarySetup?: Prisma.JsonObject;

  groupLeaderAllowanceTotal?: number;

  markupMode?: MarkupMode;

  epochMarkupPercent?: number;
  epochMarkupPerPerson?: number;

  agentCommissionPercent?: number;

  pricingMode?: PricingMode;

  paxPricingRows?: Prisma.JsonArray;
  hotels?: Prisma.JsonArray;
  fixedCostRows?: Prisma.JsonArray;
  operationalCostRows?: Prisma.JsonArray;

  entranceRows?: Prisma.JsonArray;
  tipRows?: Prisma.JsonArray;
  otherFixedRows?: Prisma.JsonArray;
  variableCostRows?: Prisma.JsonArray;
  tourManagerRows?: Prisma.JsonArray;
  guideRows?: Prisma.JsonArray;
  driverRows?: Prisma.JsonArray;

  clientDocumentTitle?: string;

  clientSinglePrice?: number;
  clientDoubleTwinPrice?: number;
  clientTriplePrice?: number;

  clientIncludes?: string;
  clientExcludes?: string;

  paymentPolicy?: string;
  cancellationPolicy?: string;

  clientOfferNotes?: string;

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

async function requireAdmin() {
  const session =
    await getServerSession(
      authOptions
    );

  return Boolean(
    session?.user &&
      session.user.role ===
        "ADMIN"
  );
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
          error:
            "Unauthorized.",
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
              sortOrder:
                "asc",
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
          error:
            "Unauthorized.",
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
      existing.status !==
      "DRAFT"
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

    const agentId =
      body.agentId?.trim() ||
      null;

    const agentMaster = agentId
      ? await db.user.findFirst({
          where: {
            id: agentId,
            role: "AGENT",
            status: "ACTIVE",
          },

          select: {
            id: true,
            agentCode: true,
            fullName: true,
            email: true,
            phone: true,
            travelAgency: true,
            website: true,
            billingCompanyName:
              true,
            billingCompanyRegNo:
              true,
            billingTaxNumber:
              true,
            billingVatNumber:
              true,
            billingAddress:
              true,
            billingCity:
              true,
            billingState:
              true,
            billingPostalCode:
              true,
            billingCountry:
              true,
            billingContactName:
              true,
            billingEmail:
              true,
            billingEmailSecondary:
              true,
            billingPhone:
              true,
          },
        })
      : null;

    if (
      agentId &&
      !agentMaster
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Selected agent could not be found or is not active.",
        },
        {
          status: 400,
        }
      );
    }

    const agentSnapshot:
      Prisma.JsonObject =
      agentMaster
        ? {
            id:
              agentMaster.id,

            agentCode:
              agentMaster.agentCode,

            fullName:
              agentMaster.fullName,

            email:
              agentMaster.email,

            phone:
              agentMaster.phone,

            travelAgency:
              agentMaster.travelAgency,

            website:
              agentMaster.website,

            billingCompanyName:
              agentMaster.billingCompanyName,

            billingCompanyRegNo:
              agentMaster.billingCompanyRegNo,

            billingTaxNumber:
              agentMaster.billingTaxNumber,

            billingVatNumber:
              agentMaster.billingVatNumber,

            billingAddress:
              agentMaster.billingAddress,

            billingCity:
              agentMaster.billingCity,

            billingState:
              agentMaster.billingState,

            billingPostalCode:
              agentMaster.billingPostalCode,

            billingCountry:
              agentMaster.billingCountry,

            billingContactName:
              agentMaster.billingContactName,

            billingEmail:
              agentMaster.billingEmail,

            billingEmailSecondary:
              agentMaster.billingEmailSecondary,

            billingPhone:
              agentMaster.billingPhone,
          }
        : {};

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

      markupMode,

      epochMarkupPercent,

      epochMarkupPerPerson,

      agentCommissionPercent:
        0,

      pricingMode,

      pricingPolicy:
        body.pricingPolicy ??
        "B2B_NET_AGENT_MARKUP",

      agentSnapshot,

      agentCompany:
        agentMaster?.billingCompanyName?.trim() ||
        agentMaster?.travelAgency?.trim() ||
        body.agentCompany?.trim() ||
        "",

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

      availabilityNotes:
        body.availabilityNotes?.trim() ||
        "",

      nextStepNotes:
        body.nextStepNotes?.trim() ||
        "",
    };

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

          agentId,

          agentName:
            agentMaster?.billingCompanyName?.trim() ||
            agentMaster?.travelAgency?.trim() ||
            body.agentCompany?.trim() ||
            null,

          title:
            body.title?.trim() ||
            "Untitled Quote",

          recipientName:
            body.recipientName?.trim() ||
            agentMaster?.billingContactName?.trim() ||
            agentMaster?.fullName?.trim() ||
            null,

          recipientEmail:
            body.recipientEmail?.trim() ||
            agentMaster?.billingEmail?.trim() ||
            agentMaster?.email?.trim() ||
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

          agentId:
            true,

          agentName:
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
          error:
            "Unauthorized.",
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
      existing.status !==
      "DRAFT"
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
