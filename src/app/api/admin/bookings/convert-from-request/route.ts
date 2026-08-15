import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BookingStatus,
  BookingType,
  PaymentStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function toString(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function toInt(value: FormDataEntryValue | null, fallback = 0) {
  if (!value || typeof value !== "string") return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function makeBookingReference() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BK-${Date.now()}-${random}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();

    const requestId = toString(formData.get("requestId"));
    const userId = toString(formData.get("userId"));
    const tourId = toString(formData.get("tourId"));
    const departureDateId = toString(formData.get("departureDateId"));

    const customerName = toString(formData.get("customerName"));
    const customerEmail = toString(formData.get("customerEmail"));
    const customerPhone = toString(formData.get("customerPhone"));
    const groupName = toString(formData.get("groupName"));
    const groupLeaderName = toString(formData.get("groupLeaderName"));
    const internalNotes = toString(formData.get("internalNotes"));

    const numberOfGuests = toInt(formData.get("numberOfGuests"), 1);
    const adults = toInt(formData.get("adults"), numberOfGuests);
    const children = toInt(formData.get("children"), 0);

    if (!requestId || !userId || !tourId || !departureDateId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const customRequest = await db.customTourRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
      },
    });

    if (!customRequest) {
      return new NextResponse("Custom request not found", { status: 404 });
    }

    const tour = await db.tour.findUnique({
      where: { id: tourId },
    });

    if (!tour) {
      return new NextResponse("Tour not found", { status: 404 });
    }

    const departureDate = await db.departureDate.findUnique({
      where: { id: departureDateId },
    });

    if (!departureDate || departureDate.tourId !== tour.id) {
      return new NextResponse("Departure date not found for selected tour", {
        status: 404,
      });
    }

    if (!departureDate.season) {
      return new NextResponse("Departure season is missing", { status: 400 });
    }

    const grossAmount = departureDate.price * numberOfGuests;
    const commissionRateSnapshot = customRequest.user?.commissionRate ?? null;
    const payoutPerPaxSnapshot = customRequest.user?.payoutPerPax ?? null;

    const commissionAmount =
      commissionRateSnapshot !== null
        ? (grossAmount * commissionRateSnapshot) / 100
        : payoutPerPaxSnapshot !== null
          ? payoutPerPaxSnapshot * numberOfGuests
          : 0;

    const netAmount = grossAmount - commissionAmount;

    const booking = await db.booking.create({
      data: {
        bookingReference: makeBookingReference(),
        userId,
        tourId: tour.id,
        departureDateId: departureDate.id,

        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        bookingType:
          (customRequest.estimatedPax ?? 0) > 15
            ? BookingType.GROUP
            : BookingType.FIT,

        numberOfGuests,
        totalPrice: grossAmount,
        grossAmount,
        commissionRateSnapshot,
        payoutPerPaxSnapshot,
        commissionAmount,
        netAmount,
        currency: customRequest.currency || "EUR",

        agentNameSnapshot: customRequest.user?.fullName || null,
        agentEmailSnapshot: customRequest.user?.email || null,
        agentPhoneSnapshot: customRequest.user?.phone || null,
        agencyNameSnapshot: customRequest.user?.travelAgency || null,
        partnerTypeSnapshot: customRequest.user?.partnerType || null,
        membershipSnapshot: customRequest.user?.membership || null,

        tourTitleSnapshot: tour.title,
        categorySnapshot: tour.category,
        subcategoriesSnapshot: tour.subcategories,
        tagsSnapshot: tour.tags,
        destinationsSnapshot: tour.destinations,
        durationSnapshot: tour.duration,
        shortDescriptionSnapshot: tour.shortDescription,
        overviewSnapshot: tour.overview,
        brochureUrlSnapshot: tour.brochureUrl,
        mainImageUrlSnapshot: tour.mainImageUrl,
        mapImageUrlSnapshot: tour.mapImageUrl,

        departureDateSnapshot: departureDate.date,
        seasonSnapshot: departureDate.season,
        pricePerPersonSnapshot: departureDate.price,
        earlyDiscountPercentSnapshot: departureDate.earlyDiscountPercent,
        earlyDiscountDeadlineSnapshot: departureDate.earlyDiscountDeadline,

        customerName,
        customerEmail,
        customerPhone,
        adults,
        children,
        infants: 0,
        singleRooms: 0,
        doubleRooms: 0,
        twinRooms: 0,
        landOnly: customRequest.landOnly,
        needsFlights: customRequest.needsFlights,
        notes: customRequest.notes || null,
        specialRequests: null,
        internalNotes,
        estimatedPax: customRequest.estimatedPax,
        finalPax: null,
        groupLeaderName,
        groupName,
      },
    });

    await db.customTourRequest.update({
      where: { id: customRequest.id },
      data: {
        status: "CONFIRMED",
        adminReply: `Converted to booking ${booking.bookingReference}.`,
      },
    });

    return NextResponse.redirect(
      new URL(`/admin/bookings/${booking.id}`, req.url)
    );
  } catch (error) {
    console.error("CONVERT_REQUEST_TO_BOOKING_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}