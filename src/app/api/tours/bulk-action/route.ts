import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type BulkActionType = "archive" | "republish" | "delete";

function isBulkActionType(value: string): value is BulkActionType {
  return value === "archive" || value === "republish" || value === "delete";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;

    if (!user || user.role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" +
            encodeURIComponent("Unauthorized action."),
          req.url
        )
      );
    }

    const formData = await req.formData();
    const actionTypeRaw = formData.get("actionType")?.toString() ?? "";
    const tourIds = formData
      .getAll("tourIds")
      .map((value) => value.toString())
      .filter(Boolean);

    if (!isBulkActionType(actionTypeRaw)) {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" +
            encodeURIComponent("Invalid bulk action."),
          req.url
        )
      );
    }

    if (tourIds.length === 0) {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" +
            encodeURIComponent("No tours selected."),
          req.url
        )
      );
    }

    if (actionTypeRaw === "archive") {
      await db.tour.updateMany({
        where: {
          id: { in: tourIds },
        },
        data: {
          isPublished: false,
          featured: false,
        },
      });

      return NextResponse.redirect(
        new URL(
          "/admin/tours?success=" +
            encodeURIComponent(`Archived ${tourIds.length} tour(s).`),
          req.url
        )
      );
    }

    if (actionTypeRaw === "republish") {
      await db.tour.updateMany({
        where: {
          id: { in: tourIds },
        },
        data: {
          isPublished: true,
        },
      });

      return NextResponse.redirect(
        new URL(
          "/admin/tours?success=" +
            encodeURIComponent(`Republished ${tourIds.length} tour(s).`),
          req.url
        )
      );
    }

    const tours = await db.tour.findMany({
      where: {
        id: { in: tourIds },
      },
      select: {
        id: true,
        bookings: {
          select: { id: true },
          take: 1,
        },
        quotes: {
          select: { id: true },
          take: 1,
        },
        departureDates: {
          select: {
            id: true,
            bookings: {
              select: { id: true },
              take: 1,
            },
            quotes: {
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });

    const deletableIds = tours
      .filter((tour) => {
        const hasDirectBookings = tour.bookings.length > 0;
        const hasDirectQuotes = tour.quotes.length > 0;
        const hasDepartureDependencies = tour.departureDates.some(
          (departure) =>
            departure.bookings.length > 0 || departure.quotes.length > 0
        );

        return !hasDirectBookings && !hasDirectQuotes && !hasDepartureDependencies;
      })
      .map((tour) => tour.id);

    if (deletableIds.length === 0) {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" +
            encodeURIComponent(
              "None of the selected tours can be deleted because they are already in use."
            ),
          req.url
        )
      );
    }

    await db.agentTourCommission.deleteMany({
      where: { tourId: { in: deletableIds } },
    });

    await db.expense.deleteMany({
      where: { tourId: { in: deletableIds } },
    });

    await db.pricingTier.deleteMany({
      where: { tourId: { in: deletableIds } },
    });

    await db.tourSeasonalPrice.deleteMany({
      where: { tourId: { in: deletableIds } },
    });

    await db.departureDate.deleteMany({
      where: { tourId: { in: deletableIds } },
    });

    await db.tour.deleteMany({
      where: { id: { in: deletableIds } },
    });

    const skippedCount = tourIds.length - deletableIds.length;
    const message =
      skippedCount > 0
        ? `Deleted ${deletableIds.length} tour(s). Skipped ${skippedCount} in-use tour(s).`
        : `Deleted ${deletableIds.length} tour(s).`;

    return NextResponse.redirect(
      new URL(
        "/admin/tours?success=" + encodeURIComponent(message),
        req.url
      )
    );
  } catch (error) {
    console.error("BULK_TOUR_ACTION_ERROR", error);

    return NextResponse.redirect(
      new URL(
        "/admin/tours?error=" +
          encodeURIComponent("Failed to apply bulk action."),
        req.url
      )
    );
  }
}