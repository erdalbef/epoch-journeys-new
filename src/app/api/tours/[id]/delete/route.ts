import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const session =
      await getServerSession(authOptions);

    const user = session?.user as
      | {
          role?: string;
        }
      | undefined;

    if (
      !user ||
      user.role !== "ADMIN"
    ) {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" +
            encodeURIComponent(
              "Unauthorized action.",
            ),
          req.url,
        ),
      );
    }

    const { id } =
      await context.params;

    const tour =
      await db.tour.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          title: true,

          bookings: {
            select: {
              id: true,
            },
            take: 1,
          },

          quotes: {
            select: {
              id: true,
            },
            take: 1,
          },

          departureDates: {
            select: {
              id: true,

              bookings: {
                select: {
                  id: true,
                },
                take: 1,
              },

              quotes: {
                select: {
                  id: true,
                },
                take: 1,
              },
            },
          },
        },
      });

    if (!tour) {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" +
            encodeURIComponent(
              "Tour not found.",
            ),
          req.url,
        ),
      );
    }

    /*
     * ============================================================
     * PROTECTED COMMERCIAL RECORDS
     * ============================================================
     *
     * A tour with bookings or quotations must NOT be permanently
     * deleted.
     *
     * Finance-only links are different:
     * those records will be preserved and unlinked from the tour.
     */

    const hasDirectBookings =
      tour.bookings.length > 0;

    const hasDirectQuotes =
      tour.quotes.length > 0;

    const hasDepartureDependencies =
      tour.departureDates.some(
        (departure) =>
          departure.bookings.length >
            0 ||
          departure.quotes.length > 0,
      );

    if (
      hasDirectBookings ||
      hasDirectQuotes ||
      hasDepartureDependencies
    ) {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" +
            encodeURIComponent(
              "This tour cannot be deleted because it is linked to bookings or quotations. Archive the tour instead.",
            ),
          req.url,
        ),
      );
    }

    const departureIds =
      tour.departureDates.map(
        (departure) =>
          departure.id,
      );

    /*
     * ============================================================
     * DELETE TOUR
     * ============================================================
     *
     * IMPORTANT:
     *
     * Finance history is preserved.
     *
     * Finance records linked only to this test/obsolete tour are
     * changed to:
     *
     *   tourId = null
     *   departureDateId = null (where applicable)
     *
     * This prevents deletion of a test tour from deleting genuine
     * accounting history.
     */

    await db.$transaction(
      async (tx) => {
        /*
         * --------------------------------------------------------
         * FINANCE DOCUMENTS
         * --------------------------------------------------------
         */

        await tx.financeDocument.updateMany(
          {
            where: {
              OR: [
                {
                  tourId: id,
                },

                ...(departureIds.length >
                0
                  ? [
                      {
                        departureDateId:
                          {
                            in: departureIds,
                          },
                      },
                    ]
                  : []),
              ],
            },

            data: {
              tourId: null,
              departureDateId: null,
            },
          },
        );

        /*
         * --------------------------------------------------------
         * SUPPLIER PAYABLES
         * --------------------------------------------------------
         */

        await tx.supplierPayable.updateMany(
          {
            where: {
              OR: [
                {
                  tourId: id,
                },

                ...(departureIds.length >
                0
                  ? [
                      {
                        departureDateId:
                          {
                            in: departureIds,
                          },
                      },
                    ]
                  : []),
              ],
            },

            data: {
              tourId: null,
              departureDateId: null,
            },
          },
        );

        /*
         * --------------------------------------------------------
         * ADDITIONAL EXPENSES
         * --------------------------------------------------------
         *
         * Do NOT delete them.
         * They may already be part of Finance / Accounting.
         */

        await tx.expense.updateMany(
          {
            where: {
              OR: [
                {
                  tourId: id,
                },

                ...(departureIds.length >
                0
                  ? [
                      {
                        departureDateId:
                          {
                            in: departureIds,
                          },
                      },
                    ]
                  : []),
              ],
            },

            data: {
              tourId: null,
              departureDateId: null,
            },
          },
        );

        /*
         * --------------------------------------------------------
         * FINANCE ENTRIES
         * --------------------------------------------------------
         */

        await tx.financeEntry.updateMany(
          {
            where: {
              tourId: id,
            },

            data: {
              tourId: null,
            },
          },
        );

        /*
         * --------------------------------------------------------
         * BANK TRANSACTIONS
         * --------------------------------------------------------
         *
         * Ledger transactions stay untouched financially.
         * Only Tour / Departure references are removed.
         */

        await tx.bankTransaction.updateMany(
          {
            where: {
              OR: [
                {
                  tourId: id,
                },

                ...(departureIds.length >
                0
                  ? [
                      {
                        departureDateId:
                          {
                            in: departureIds,
                          },
                      },
                    ]
                  : []),
              ],
            },

            data: {
              tourId: null,
              departureDateId: null,
            },
          },
        );

        /*
         * --------------------------------------------------------
         * CASH TRANSACTIONS
         * --------------------------------------------------------
         */

        await tx.cashTransaction.updateMany(
          {
            where: {
              OR: [
                {
                  tourId: id,
                },

                ...(departureIds.length >
                0
                  ? [
                      {
                        departureDateId:
                          {
                            in: departureIds,
                          },
                      },
                    ]
                  : []),
              ],
            },

            data: {
              tourId: null,
              departureDateId: null,
            },
          },
        );

        /*
         * --------------------------------------------------------
         * CUSTOMER PAYMENTS
         * --------------------------------------------------------
         *
         * Standalone customer receipts can be linked directly to a
         * Tour / Package. Preserve the payment and remove only the
         * obsolete tour connection.
         */

        await tx.payment.updateMany({
          where: {
            tourId: id,
          },

          data: {
            tourId: null,
          },
        });

        /*
         * --------------------------------------------------------
         * MASS ARRANGEMENTS
         * --------------------------------------------------------
         *
         * Keep historical Mass arrangements, but detach them from
         * the deleted test tour/departure.
         */

        await tx.massArrangement.updateMany(
          {
            where: {
              OR: [
                {
                  tourId: id,
                },

                ...(departureIds.length >
                0
                  ? [
                      {
                        departureDateId:
                          {
                            in: departureIds,
                          },
                      },
                    ]
                  : []),
              ],
            },

            data: {
              tourId: null,
              departureDateId: null,
            },
          },
        );

        /*
         * --------------------------------------------------------
         * CUSTOM REQUEST LINKS
         * --------------------------------------------------------
         */

        await tx.customTourRequest.updateMany(
          {
            where: {
              tourId: id,
            },

            data: {
              tourId: null,
            },
          },
        );

        /*
         * --------------------------------------------------------
         * RESOURCE LINKS
         * --------------------------------------------------------
         *
         * Keep uploaded resources, but they no longer point to the
         * deleted tour.
         */

        await tx.resource.updateMany({
          where: {
            tourId: id,
          },

          data: {
            tourId: null,
          },
        });

        /*
         * --------------------------------------------------------
         * TOUR CONTROL
         * --------------------------------------------------------
         */

        await tx.tourControl.deleteMany({
          where: {
            tourId: id,
          },
        });

        /*
         * --------------------------------------------------------
         * TOUR-SPECIFIC COMMERCIAL CONFIGURATION
         * --------------------------------------------------------
         */

        await tx.agentTourCommission.deleteMany(
          {
            where: {
              tourId: id,
            },
          },
        );

        await tx.pricingTier.deleteMany(
          {
            where: {
              tourId: id,
            },
          },
        );

        await tx.tourSeasonalPrice.deleteMany(
          {
            where: {
              tourId: id,
            },
          },
        );

        /*
         * Private group pricing has cascading child seasons/bands.
         */

        await tx.privateGroupPricingPlan.deleteMany(
          {
            where: {
              tourId: id,
            },
          },
        );

        /*
         * Partner aliases belong to the deleted tour.
         */

        await tx.partnerTourAlias.deleteMany(
          {
            where: {
              tourId: id,
            },
          },
        );

        /*
         * --------------------------------------------------------
         * DEPARTURES
         * --------------------------------------------------------
         *
         * We already verified that these departures have no booking
         * or quote dependencies.
         */

        await tx.departureDate.deleteMany(
          {
            where: {
              tourId: id,
            },
          },
        );

        /*
         * --------------------------------------------------------
         * TOUR
         * --------------------------------------------------------
         */

        await tx.tour.delete({
          where: {
            id,
          },
        });
      },
    );

    return NextResponse.redirect(
      new URL(
        "/admin/tours?success=" +
          encodeURIComponent(
            `"${tour.title}" deleted. Linked finance history was preserved and unlinked from the tour.`,
          ),
        req.url,
      ),
    );
  } catch (error) {
    console.error(
      "DELETE_TOUR_ROUTE_ERROR",
      error,
    );

    return NextResponse.redirect(
      new URL(
        "/admin/tours?error=" +
          encodeURIComponent(
            error instanceof Error
              ? error.message
              : "Failed to delete tour.",
          ),
        req.url,
      ),
    );
  }
}