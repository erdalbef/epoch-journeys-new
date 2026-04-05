import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { calculateTourPrice } from "@/lib/pricing/calculateTourPrice";
import { calculatePartnerPayoutForBooking } from "@/lib/payments/calculatePartnerPayout";

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

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
      include: {
        pricingTiers: {
          where: { isActive: true },
          orderBy: [{ minPax: "asc" }, { maxPax: "asc" }],
        },
      },
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

    const override = await db.agentTourCommission.findUnique({
      where: {
        agentId_tourId: {
          agentId: agent.id,
          tourId: tour.id,
        },
      },
    });

    const adults = toNumber(body.adults);
    const children = toNumber(body.children);
    const infants = toNumber(body.infants);

    const singleRooms = toNumber(body.singleRooms);
    const doubleRooms = toNumber(body.doubleRooms);
    const twinRooms = toNumber(body.twinRooms);
    const tripleRooms = toNumber(body.tripleRooms);

    let pricingResult;

    try {
      pricingResult = calculateTourPrice({
        pricingType: tour.pricingType,
        basePrice: departure.price,
        pricingTiers: tour.pricingTiers.map((tier) => ({
          label: tier.label,
          minPax: tier.minPax,
          maxPax: tier.maxPax,
          roomType: tier.roomType,
          pricePerPerson: tier.pricePerPerson,
          currency: tier.currency,
          isActive: tier.isActive,
        })),
        singleRooms,
        doubleRooms,
        twinRooms,
        tripleRooms,
        commissionRate: 0,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Pricing calculation failed.",
        },
        { status: 400 }
      );
    }

    const numberOfGuests = pricingResult.totalPax;
    const grossAmount = pricingResult.grossAmount;

    if (numberOfGuests <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid room configuration." },
        { status: 400 }
      );
    }

    const declaredGuestCount = adults + children + infants;

    if (declaredGuestCount !== numberOfGuests) {
      return NextResponse.json(
        {
          success: false,
          message: "Passenger count does not match room configuration.",
        },
        { status: 400 }
      );
    }

    const seatsLeft = Math.max(departure.capacity - departure.bookedSeats, 0);

    if (numberOfGuests > seatsLeft) {
      return NextResponse.json(
        {
          success: false,
          message: "Not enough seats available for this departure.",
        },
        { status: 400 }
      );
    }

    const payout = calculatePartnerPayoutForBooking({
      partnerType: agent.partnerType,
      grossAmount,
      numberOfGuests,
      estimatedPax:
        typeof body.estimatedPax === "number"
          ? body.estimatedPax
          : toNumber(body.estimatedPax),
      finalPax:
        typeof body.finalPax === "number"
          ? body.finalPax
          : toNumber(body.finalPax),
      userCommissionRate: agent.commissionRate,
      userPayoutPerPax: agent.payoutPerPax,
      tourCommissionRate: override?.commissionRate,
      tourPayoutPerPax: override?.payoutPerPax,
    });

    const netAmount = Math.max(0, grossAmount - payout.commissionAmount);

    const createdBooking = await db.booking.create({
      data: {
        bookingReference: `BK-${Date.now()}`,

        userId: agent.id,
        tourId: tour.id,
        departureDateId: departure.id,

        bookingType: body.bookingType || "FIT",
        status: "PENDING",

        paymentStatus: "UNPAID",
        amountPaid: 0,
        amountDue: netAmount,

        numberOfGuests,

        totalPrice: grossAmount,
        grossAmount,
        commissionRateSnapshot: payout.commissionRateSnapshot,
        payoutPerPaxSnapshot: payout.payoutPerPaxSnapshot,
        commissionAmount: payout.commissionAmount,
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
        earlyDiscountPercentSnapshot: departure.earlyDiscountPercent,
        earlyDiscountDeadlineSnapshot: departure.earlyDiscountDeadline,

        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,

        leadFirstName: body.leadFirstName,
        leadLastName: body.leadLastName,
        leadEmail: body.leadEmail,
        leadPhone: body.leadPhone,

        adults,
        children,
        infants,

        singleRooms,
        doubleRooms,
        twinRooms,
        tripleRooms,

        landOnly: body.landOnly ?? true,
        needsFlights: body.needsFlights ?? false,

        notes: body.notes,
        specialRequests: body.specialRequests,

        estimatedPax:
          body.estimatedPax !== undefined && body.estimatedPax !== null
            ? toNumber(body.estimatedPax)
            : null,
        finalPax:
          body.finalPax !== undefined && body.finalPax !== null
            ? toNumber(body.finalPax)
            : null,
        groupLeaderName: body.groupLeaderName ?? null,
        groupName: body.groupName ?? null,
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