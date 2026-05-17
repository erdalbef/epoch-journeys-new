import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;

    const tour = await db.tour.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
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

    if (!tour) {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" + encodeURIComponent("Tour not found."),
          req.url
        )
      );
    }

    const hasDirectBookings = tour.bookings.length > 0;
    const hasDirectQuotes = tour.quotes.length > 0;

    const hasDepartureDependencies = tour.departureDates.some(
      (departure) => departure.bookings.length > 0 || departure.quotes.length > 0
    );

    if (hasDirectBookings || hasDirectQuotes || hasDepartureDependencies) {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" +
            encodeURIComponent(
              "This tour cannot be deleted because it is already linked to bookings, quotes, or departure records in use."
            ),
          req.url
        )
      );
    }

    await db.agentTourCommission.deleteMany({
      where: { tourId: id },
    });

    await db.expense.deleteMany({
      where: { tourId: id },
    });

    await db.pricingTier.deleteMany({
      where: { tourId: id },
    });

    await db.tourSeasonalPrice.deleteMany({
      where: { tourId: id },
    });

    await db.departureDate.deleteMany({
      where: { tourId: id },
    });

    await db.tour.delete({
      where: { id },
    });

    return NextResponse.redirect(
      new URL(
        "/admin/tours?success=" +
          encodeURIComponent(`"${tour.title}" deleted.`),
        req.url
      )
    );
  } catch (error) {
    console.error("DELETE_TOUR_ROUTE_ERROR", error);

    return NextResponse.redirect(
      new URL(
        "/admin/tours?error=" +
          encodeURIComponent("Failed to delete tour."),
        req.url
      )
    );
  }
}