import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BookingStatus,
  BookingType,
  PaymentStatus,
  QuoteActivityAction,
  QuoteStatus,
} from "@prisma/client";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ConvertBody = {
  numberOfGuests?: number;
};

type PricingRow = {
  paxCount: number;
  manualSinglePrice: number;
  manualDoubleTwinPrice: number;
  manualTriplePrice: number;
};

function record(
  value: unknown
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

function numberValue(
  value: unknown,
  fallback = 0
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function pricingRows(
  summary: Record<string, unknown> | null
): PricingRow[] {
  if (
    !Array.isArray(
      summary?.paxPricingRows
    )
  ) {
    return [];
  }

  return summary.paxPricingRows
    .map(record)
    .filter(
      (
        row
      ): row is Record<
        string,
        unknown
      > => Boolean(row)
    )
    .map((row) => ({
      paxCount: numberValue(
        row.paxCount
      ),

      manualSinglePrice:
        numberValue(
          row.manualSinglePrice
        ),

      manualDoubleTwinPrice:
        numberValue(
          row.manualDoubleTwinPrice
        ),

      manualTriplePrice:
        numberValue(
          row.manualTriplePrice
        ),
    }))
    .filter(
      (row) =>
        row.paxCount > 0 &&
        row.manualSinglePrice > 0 &&
        row.manualDoubleTwinPrice > 0 &&
        row.manualTriplePrice > 0
    )
    .sort(
      (a, b) =>
        a.paxCount - b.paxCount
    );
}

function selectRateTier(
  rows: PricingRow[],
  payingPax: number
): PricingRow | null {
  const eligible = rows.filter(
    (row) =>
      row.paxCount <= payingPax
  );

  return (
    eligible.at(-1) ??
    rows[0] ??
    null
  );
}

function createBookingReference() {
  const stamp = Date.now()
    .toString()
    .slice(-8);

  const random = Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, "0");

  return `BK-${stamp}${random}`;
}

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
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
      (await req
        .json()
        .catch(() => ({}))) as ConvertBody;

    const quote =
      await db.quote.findUnique({
        where: {
          id,
        },

        include: {
          request: true,

          booking: {
            select: {
              id: true,
              bookingReference: true,
            },
          },

          tour: true,

          departureDate: true,
        },
      });

    if (!quote) {
      return NextResponse.json(
        {
          ok: false,
          error: "Quote not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (quote.booking) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Quote already converted.",
          booking: quote.booking,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Approval is stored in approvedAt.
     * There is no ACCEPTED QuoteStatus.
     */

    if (
      quote.status !==
        QuoteStatus.SENT ||
      !quote.approvedAt
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only an approved quote can be converted to a booking.",
        },
        {
          status: 400,
        }
      );
    }

    if (!quote.tour) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The approved quote must be linked to a tour.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Booking requires an actual DepartureDate.
     */

    if (
      !quote.departureDateId ||
      !quote.departureDate
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The approved quote must be linked to a departure date before conversion.",
        },
        {
          status: 400,
        }
      );
    }

    const tour = quote.tour;
    const departure =
      quote.departureDate;

    const summary = record(
      quote.quoteBuilderSummary
    );

    const rows =
      pricingRows(summary);

    if (!rows.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The quote has no Final NET group-rate tiers.",
        },
        {
          status: 400,
        }
      );
    }

    const complimentaryPax =
      numberValue(
        summary?.freePassengers
      );

    const summaryPayingPax =
      numberValue(
        summary?.payingPassengers ??
          quote.groupSize
      );

    const payingPax = Math.max(
      1,
      body.numberOfGuests ??
        summaryPayingPax
    );

    const totalTravelers =
      payingPax +
      complimentaryPax;

    const selectedTier =
      selectRateTier(
        rows,
        payingPax
      );

    if (!selectedTier) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unable to select a Final NET pricing tier.",
        },
        {
          status: 400,
        }
      );
    }

    const agentId =
      typeof summary?.agentId ===
      "string"
        ? summary.agentId
        : null;

    const bookingUserId =
      quote.request?.userId ??
      agentId;

    if (!bookingUserId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Quote must be linked to a travel-agency user before conversion.",
        },
        {
          status: 400,
        }
      );
    }

    const user =
      await db.user.findUnique({
        where: {
          id: bookingUserId,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Linked travel-agency user not found.",
        },
        {
          status: 400,
        }
      );
    }

    const netDoubleTwin =
      selectedTier.manualDoubleTwinPrice;

    const totalNet =
      netDoubleTwin *
      payingPax;

    const now = new Date();

    const created =
      await db.$transaction(
        async (tx) => {
          const existingBooking =
            await tx.booking.findUnique({
              where: {
                quoteId:
                  quote.id,
              },

              select: {
                id: true,
                bookingReference:
                  true,
              },
            });

          if (existingBooking) {
            throw new Error(
              `ALREADY_CONVERTED:${existingBooking.id}:${existingBooking.bookingReference}`
            );
          }

          let reference =
            createBookingReference();

          for (
            let attempt = 0;
            attempt < 5;
            attempt += 1
          ) {
            const existingReference =
              await tx.booking.findUnique({
                where: {
                  bookingReference:
                    reference,
                },

                select: {
                  id: true,
                },
              });

            if (!existingReference) {
              break;
            }

            reference =
              createBookingReference();
          }

          const booking =
            await tx.booking.create({
              data: {
                bookingReference:
                  reference,

                bookingDisplayCode:
                  reference,

                userId:
                  bookingUserId,

                tourId:
                  tour.id,

                departureDateId:
                  departure.id,

                partnerCompanyId:
                  quote.partnerCompanyId,

                partnerTourAliasId:
                  quote.partnerTourAliasId,

                partnerPackageName:
                  quote.partnerPackageName,

                status:
                  BookingStatus.PENDING,

                paymentStatus:
                  PaymentStatus.UNPAID,

                bookingType:
                  BookingType.GROUP,

                numberOfGuests:
                  totalTravelers,

                estimatedPax:
                  totalTravelers,

                totalPrice:
                  totalNet,

                grossAmount:
                  totalNet,

                commissionRateSnapshot:
                  null,

                payoutPerPaxSnapshot:
                  null,

                commissionAmount: 0,

                netAmount:
                  totalNet,

                currency:
                  quote.currency,

                agentNameSnapshot:
                  quote.agentName ??
                  user.fullName ??
                  null,

                agentEmailSnapshot:
                  user.email,

                agentPhoneSnapshot:
                  user.phone ??
                  null,

                agencyNameSnapshot:
                  quote.request
                    ?.companyName ??
                  user.travelAgency ??
                  null,

                partnerTypeSnapshot:
                  user.partnerType,

                membershipSnapshot:
                  user.membership ??
                  null,

                tourTitleSnapshot:
                  tour.title,

                categorySnapshot:
                  tour.category,

                subcategoriesSnapshot:
                  tour.subcategories,

                tagsSnapshot:
                  tour.tags,

                destinationsSnapshot:
                  tour.destinations,

                durationSnapshot:
                  tour.duration,

                shortDescriptionSnapshot:
                  tour.shortDescription,

                overviewSnapshot:
                  tour.overview,

                brochureUrlSnapshot:
                  tour.brochureUrl,

                mainImageUrlSnapshot:
                  tour.mainImageUrl,

                mapImageUrlSnapshot:
                  tour.mapImageUrl,

                departureDateSnapshot:
                  departure.date,

                seasonSnapshot:
                  departure.season,

                pricePerPersonSnapshot:
                  netDoubleTwin,

                earlyDiscountPercentSnapshot:
                  departure.earlyDiscountPercent,

                earlyDiscountDeadlineSnapshot:
                  departure.earlyDiscountDeadline,

                customerName:
                  quote.request
                    ?.customerName ??
                  quote.clientName,

                customerEmail:
                  quote.request
                    ?.customerEmail ??
                  quote.recipientEmail,

                customerPhone:
                  quote.request
                    ?.customerPhone ??
                  null,

                leadFirstName:
                  quote.request
                    ?.leadFirstName ??
                  null,

                leadLastName:
                  quote.request
                    ?.leadLastName ??
                  null,

                leadEmail:
                  quote.request
                    ?.leadEmail ??
                  null,

                leadPhone:
                  quote.request
                    ?.leadPhone ??
                  null,

                adults:
                  totalTravelers,

                children: 0,

                infants: 0,

                singleRooms:
                  quote.request
                    ?.singleRooms ??
                  0,

                doubleRooms:
                  quote.request
                    ?.doubleRooms ??
                  0,

                twinRooms:
                  quote.request
                    ?.twinRooms ??
                  0,

                tripleRooms:
                  quote.request
                    ?.tripleRooms ??
                  0,

                landOnly:
                  quote.request
                    ?.landOnly ??
                  true,

                needsFlights:
                  quote.request
                    ?.needsFlights ??
                  false,

                notes:
                  quote.clientOfferNotes,

                specialRequests:
                  quote.request
                    ?.specialRequests ??
                  null,

                internalNotes:
                  quote.internalNotes,

                groupLeaderName:
                  quote.request
                    ?.groupLeaderName ??
                  null,

                groupName:
                  quote.request
                    ?.groupName ??
                  quote.title,

                amountDue:
                  totalNet,

                amountPaid: 0,

                quoteId:
                  quote.id,
              },
            });

          await tx.quote.update({
            where: {
              id: quote.id,
            },

            data: {
              status:
                QuoteStatus.CONVERTED,

              convertedAt:
                now,
            },
          });

          await tx.quoteActivity.create({
            data: {
              quoteId:
                quote.id,

              actorId:
                session.user.id,

              action:
                QuoteActivityAction.CONVERTED_TO_BOOKING,

              fromStatus:
                QuoteStatus.SENT,

              toStatus:
                QuoteStatus.CONVERTED,

              message:
                `Approved quote converted to group booking ${reference}.`,

              meta: {
                bookingId:
                  booking.id,

                bookingReference:
                  reference,

                payingPax,

                complimentaryPax,

                totalTravelers,

                selectedTier,
              },
            },
          });

          return booking;
        }
      );

    return NextResponse.json({
      ok: true,

      booking: {
        id: created.id,

        bookingReference:
          created.bookingReference,
      },
    });
  } catch (error) {
    console.error(
      "POST /api/quotes/[id]/convert error",
      error
    );

    if (
      error instanceof Error &&
      error.message.startsWith(
        "ALREADY_CONVERTED:"
      )
    ) {
      const [
        ,
        id,
        bookingReference,
      ] =
        error.message.split(":");

      return NextResponse.json(
        {
          ok: false,

          error:
            "Quote already converted.",

          booking: {
            id,
            bookingReference,
          },
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Failed to convert approved quote to booking.",
      },
      {
        status: 500,
      }
    );
  }
}