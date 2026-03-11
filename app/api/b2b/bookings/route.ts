import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

type BookingRequestBody = {
  tourId: string;
  departureDateId: string;

  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

  leadFirstName?: string;
  leadLastName?: string;
  leadEmail?: string;
  leadPhone?: string;

  adults?: number;
  children?: number;
  infants?: number;

  singleRooms?: number;
  doubleRooms?: number;
  twinRooms?: number;

  landOnly?: boolean;
  needsFlights?: boolean;

  notes?: string;
  specialRequests?: string;
};

function generateBookingReference(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `BK-${year}${month}${day}-${random}`;
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        approved: true,
        status: true,
        fullName: true,
        phone: true,
        travelAgency: true,
        partnerType: true,
        membership: true,
        commissionRate: true,
        payoutPerPax: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.role !== "AGENT") {
      return NextResponse.json(
        { error: "Only approved agents can create bookings." },
        { status: 403 }
      );
    }

    if (!user.approved) {
      return NextResponse.json(
        { error: "Your account is not approved." },
        { status: 403 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account is not active." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as BookingRequestBody;

    if (!body.tourId || !body.departureDateId) {
      return NextResponse.json(
        { error: "Tour and departure are required." },
        { status: 400 }
      );
    }

    const adults = toNumber(body.adults, 1);
    const children = toNumber(body.children, 0);
    const infants = toNumber(body.infants, 0);

    const singleRooms = toNumber(body.singleRooms, 0);
    const doubleRooms = toNumber(body.doubleRooms, 0);
    const twinRooms = toNumber(body.twinRooms, 0);

    if (adults < 0 || children < 0 || infants < 0) {
      return NextResponse.json(
        { error: "Guest counts cannot be negative." },
        { status: 400 }
      );
    }

    if (singleRooms < 0 || doubleRooms < 0 || twinRooms < 0) {
      return NextResponse.json(
        { error: "Room counts cannot be negative." },
        { status: 400 }
      );
    }

    const numberOfGuests = adults + children + infants;

    if (numberOfGuests <= 0) {
      return NextResponse.json(
        { error: "At least 1 guest is required." },
        { status: 400 }
      );
    }

    const departure = await prisma.departureDate.findUnique({
      where: { id: body.departureDateId },
      include: {
        tour: {
          select: {
            id: true,
            title: true,
            slug: true,
            category: true,
            subcategories: true,
            tags: true,
            destinations: true,
            duration: true,
            shortDescription: true,
            overview: true,
            brochureUrl: true,
            mainImageUrl: true,
            mapImageUrl: true,
            isPublished: true,
            requiresQuote: true,
          },
        },
      },
    });

    if (!departure) {
      return NextResponse.json(
        { error: "Departure not found." },
        { status: 404 }
      );
    }

    if (departure.tourId !== body.tourId) {
      return NextResponse.json(
        { error: "Tour and departure do not match." },
        { status: 400 }
      );
    }

    if (!departure.tour.isPublished) {
      return NextResponse.json(
        { error: "This tour is not published." },
        { status: 400 }
      );
    }

    if (departure.tour.requiresQuote) {
      return NextResponse.json(
        { error: "This tour requires a quote before booking." },
        { status: 400 }
      );
    }

    if (departure.status === "SOLD_OUT" || departure.status === "CLOSED") {
      return NextResponse.json(
        { error: "This departure is not available for booking." },
        { status: 400 }
      );
    }

    if (departure.capacity <= 0) {
      return NextResponse.json(
        { error: "This departure is not open for booking." },
        { status: 400 }
      );
    }

    const remainingSeats = departure.capacity - departure.bookedSeats;

    if (remainingSeats <= 0) {
      return NextResponse.json(
        { error: "No seats remaining for this departure." },
        { status: 400 }
      );
    }

    if (numberOfGuests > remainingSeats) {
      return NextResponse.json(
        { error: `Only ${remainingSeats} seat(s) remaining.` },
        { status: 400 }
      );
    }

    const now = new Date();

    let effectivePrice = departure.price;

    if (
      departure.earlyDiscountPercent &&
      departure.earlyDiscountDeadline &&
      now <= departure.earlyDiscountDeadline
    ) {
      effectivePrice = Number(
        (
          departure.price *
          (1 - departure.earlyDiscountPercent / 100)
        ).toFixed(2)
      );
    }

    const grossAmount = Number((effectivePrice * numberOfGuests).toFixed(2));

    let commissionAmount = 0;

    if (user.payoutPerPax && user.payoutPerPax > 0) {
      commissionAmount = Number(
        (user.payoutPerPax * numberOfGuests).toFixed(2)
      );
    } else if (user.commissionRate && user.commissionRate > 0) {
      commissionAmount = Number(
        (grossAmount * user.commissionRate).toFixed(2)
      );
    }

    const netAmount = Number((grossAmount - commissionAmount).toFixed(2));
    const bookingReference = generateBookingReference();

    const booking = await prisma.$transaction(async (tx) => {
      const currentDeparture = await tx.departureDate.findUnique({
        where: { id: departure.id },
        select: {
          id: true,
          capacity: true,
          bookedSeats: true,
          status: true,
        },
      });

      if (!currentDeparture) {
        throw new Error("Departure not found during booking.");
      }

      if (
        currentDeparture.status === "SOLD_OUT" ||
        currentDeparture.status === "CLOSED"
      ) {
        throw new Error("This departure is no longer available.");
      }

      const seatsLeft = currentDeparture.capacity - currentDeparture.bookedSeats;

      if (seatsLeft <= 0) {
        throw new Error("No seats remaining for this departure.");
      }

      if (numberOfGuests > seatsLeft) {
        throw new Error(`Only ${seatsLeft} seat(s) remaining.`);
      }

      const createdBooking = await tx.booking.create({
        data: {
          bookingReference,
          userId: user.id,
          tourId: departure.tour.id,
          departureDateId: departure.id,

          status: "PENDING",
          paymentStatus: "UNPAID",

          numberOfGuests,
          totalPrice: grossAmount,

          grossAmount,
          commissionRateSnapshot: user.commissionRate ?? null,
          payoutPerPaxSnapshot: user.payoutPerPax ?? null,
          commissionAmount,
          netAmount,
          currency: "EUR",

          agentNameSnapshot: user.fullName ?? null,
          agentEmailSnapshot: user.email ?? null,
          agentPhoneSnapshot: user.phone ?? null,
          agencyNameSnapshot: user.travelAgency ?? null,
          partnerTypeSnapshot: user.partnerType ?? null,
          membershipSnapshot: user.membership ?? null,

          tourTitleSnapshot: departure.tour.title,
          tourSlugSnapshot: departure.tour.slug,
          categorySnapshot: departure.tour.category,
          subcategoriesSnapshot: departure.tour.subcategories,
          tagsSnapshot: departure.tour.tags,
          destinationsSnapshot: departure.tour.destinations,
          durationSnapshot: departure.tour.duration,

          shortDescriptionSnapshot: departure.tour.shortDescription ?? null,
          overviewSnapshot: departure.tour.overview ?? null,
          brochureUrlSnapshot: departure.tour.brochureUrl ?? null,
          mainImageUrlSnapshot: departure.tour.mainImageUrl ?? null,
          mapImageUrlSnapshot: departure.tour.mapImageUrl ?? null,

          departureDateSnapshot: departure.date,
          seasonSnapshot: departure.season,
          pricePerPersonSnapshot: effectivePrice,
          earlyDiscountPercentSnapshot:
            departure.earlyDiscountPercent ?? null,
          earlyDiscountDeadlineSnapshot:
            departure.earlyDiscountDeadline ?? null,

          customerName: body.customerName ?? null,
          customerEmail: body.customerEmail ?? null,
          customerPhone: body.customerPhone ?? null,

          leadFirstName: body.leadFirstName ?? null,
          leadLastName: body.leadLastName ?? null,
          leadEmail: body.leadEmail ?? null,
          leadPhone: body.leadPhone ?? null,

          adults,
          children,
          infants,

          singleRooms,
          doubleRooms,
          twinRooms,

          landOnly: toBoolean(body.landOnly, true),
          needsFlights: toBoolean(body.needsFlights, false),

          notes: body.notes ?? null,
          specialRequests: body.specialRequests ?? null,
        },
      });

      const newBookedSeats = currentDeparture.bookedSeats + numberOfGuests;

      await tx.departureDate.update({
        where: { id: departure.id },
        data: {
          bookedSeats: newBookedSeats,
          status:
            newBookedSeats >= currentDeparture.capacity
              ? "SOLD_OUT"
              : currentDeparture.status,
        },
      });

      return createdBooking;
    });

    return NextResponse.json(
      {
        success: true,
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("B2B_BOOKING_POST_ERROR", error);

    const message =
      error instanceof Error ? error.message : "Failed to create booking.";

    if (
      message.includes("No seats remaining") ||
      message.includes("seat(s) remaining") ||
      message.includes("no longer available")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create booking." },
      { status: 500 }
    );
  }
}