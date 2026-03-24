import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const agent = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!agent || !agent.approved) {
      return NextResponse.json(
        { success: false, message: "Agent not approved." },
        { status: 403 }
      );
    }

    const body = await req.json();

    const tour = await db.tour.findUnique({
      where: { id: body.tourId },
    });

    if (!tour) {
      return NextResponse.json(
        { success: false, message: "Tour not found." },
        { status: 404 }
      );
    }

    const departure = await db.departureDate.findUnique({
      where: { id: body.departureDateId },
    });

    if (!departure) {
      return NextResponse.json(
        { success: false, message: "Departure not found." },
        { status: 404 }
      );
    }

    const numberOfGuests =
      Number(body.adults || 0) +
      Number(body.children || 0) +
      Number(body.infants || 0);

    const grossAmount = departure.price * numberOfGuests;

    const commissionRateSnapshot = agent.commissionRate ?? 0;
    const payoutPerPaxSnapshot = agent.payoutPerPax ?? 0;

    const commissionAmount =
      grossAmount * (commissionRateSnapshot / 100);

    const netAmount = grossAmount - commissionAmount;

    const createdBooking = await db.booking.create({
      data: {
        bookingReference: `BK-${Date.now()}`,

        userId: agent.id,
        tourId: tour.id,
        departureDateId: departure.id,

        bookingType: body.bookingType || "FIT",
        status: "PENDING",

        // ✅ PAYMENT FIX START
        paymentStatus: "UNPAID",
        amountPaid: 0,
        amountDue: grossAmount,
        // ✅ PAYMENT FIX END

        numberOfGuests,

        totalPrice: grossAmount,
        grossAmount,
        commissionRateSnapshot,
        payoutPerPaxSnapshot,
        commissionAmount,
        netAmount,
        currency: "EUR",

        agentNameSnapshot: agent.fullName,
        agentEmailSnapshot: agent.email,
        agentPhoneSnapshot: agent.phone,
        agencyNameSnapshot: agent.travelAgency,
        partnerTypeSnapshot: agent.partnerType,
        membershipSnapshot: agent.membership,

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

        departureDateSnapshot: departure.date,
        seasonSnapshot: departure.season,
        pricePerPersonSnapshot: departure.price,
        earlyDiscountPercentSnapshot:
          departure.earlyDiscountPercent,
        earlyDiscountDeadlineSnapshot:
          departure.earlyDiscountDeadline,

        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,

        leadFirstName: body.leadFirstName,
        leadLastName: body.leadLastName,
        leadEmail: body.leadEmail,
        leadPhone: body.leadPhone,

        adults: Number(body.adults || 0),
        children: Number(body.children || 0),
        infants: Number(body.infants || 0),

        singleRooms: Number(body.singleRooms || 0),
        doubleRooms: Number(body.doubleRooms || 0),
        twinRooms: Number(body.twinRooms || 0),
        tripleRooms: Number(body.tripleRooms || 0),

        landOnly: body.landOnly ?? true,
        needsFlights: body.needsFlights ?? false,

        notes: body.notes,
        specialRequests: body.specialRequests,
      },
    });

    return NextResponse.json({
      success: true,
      booking: createdBooking,
    });
  } catch (error) {
    console.error("BOOKING_CREATE_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to create booking." },
      { status: 500 }
    );
  }
}