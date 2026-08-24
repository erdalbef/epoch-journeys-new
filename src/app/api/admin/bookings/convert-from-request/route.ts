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

function toFloat(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    const bookingMode = toString(formData.get("bookingMode")) || "PRIVATE_GROUP";

    const customerName = toString(formData.get("customerName"));
    const customerEmail = toString(formData.get("customerEmail"));
    const customerPhone = toString(formData.get("customerPhone"));
    const groupName = toString(formData.get("groupName"));
    const groupLeaderName = toString(formData.get("groupLeaderName"));
    const internalNotes = toString(formData.get("internalNotes"));

    const travelStartDate = toDate(formData.get("travelStartDate"));
    const travelEndDate = toDate(formData.get("travelEndDate"));

    const numberOfGuests = toInt(formData.get("numberOfGuests"), 1);
    const adults = toInt(formData.get("adults"), numberOfGuests);
    const children = toInt(formData.get("children"), 0);

    const manualTotalPrice = toFloat(formData.get("totalPrice"));
    const formCurrency = toString(formData.get("currency")) || "EUR";

    if (!userId || !tourId || numberOfGuests < 1) {
      return new NextResponse(
        "Missing required fields: partner, tour and number of guests are required.",
        { status: 400 },
      );
    }

    const [agent, tour, customRequest] = await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      db.tour.findUnique({ where: { id: tourId } }),
      requestId
        ? db.customTourRequest.findUnique({
            where: { id: requestId },
            include: { user: true },
          })
        : Promise.resolve(null),
    ]);

    if (!agent) {
      return new NextResponse("Selected partner not found", { status: 404 });
    }

    if (agent.role !== Role.AGENT) {
      return new NextResponse("Selected user is not an agent/partner", {
        status: 400,
      });
    }

    if (!tour) {
      return new NextResponse("Tour not found", { status: 404 });
    }

    if (requestId && !customRequest) {
      return new NextResponse("Custom request not found", { status: 404 });
    }

    if (customRequest && customRequest.userId !== userId) {
      return new NextResponse(
        "The selected partner does not match the source request.",
        { status: 400 },
      );
    }

    const scheduledDeparture = bookingMode === "SCHEDULED";
    let departureDate = null;

    if (departureDateId) {
      departureDate = await db.departureDate.findUnique({
        where: { id: departureDateId },
      });

      if (!departureDate || departureDate.tourId !== tour.id) {
        return new NextResponse(
          "Departure date not found for selected tour",
          { status: 404 },
        );
      }
    }

    if (scheduledDeparture && !departureDate) {
      return new NextResponse(
        "Please select a published departure for an Epoch Scheduled Departure.",
        { status: 400 },
      );
    }

    let grossAmount: number;
    let pricePerPersonSnapshot: number;
    let currency: string;

    if (departureDate) {
      grossAmount = departureDate.price * numberOfGuests;
      pricePerPersonSnapshot = departureDate.price;
      currency = formCurrency || tour.currency || "EUR";
    } else {
      if (manualTotalPrice === null || manualTotalPrice <= 0) {
        return new NextResponse(
          "Total Booking Price is required for a Private Group booking.",
          { status: 400 },
        );
      }

      grossAmount = manualTotalPrice;
      pricePerPersonSnapshot =
        numberOfGuests > 0 ? grossAmount / numberOfGuests : grossAmount;
      currency = formCurrency || customRequest?.currency || tour.currency || "EUR";
    }

    const commissionRateSnapshot = agent.commissionRate ?? null;
    const payoutPerPaxSnapshot = agent.payoutPerPax ?? null;

    const commissionAmount =
      commissionRateSnapshot !== null
        ? (grossAmount * commissionRateSnapshot) / 100
        : payoutPerPaxSnapshot !== null
          ? payoutPerPaxSnapshot * numberOfGuests
          : 0;

    const netAmount = grossAmount - commissionAmount;
    const bookingType = scheduledDeparture ? BookingType.FIT : BookingType.GROUP;

    const booking = await db.booking.create({
      data: {
        bookingReference: makeBookingReference(),
        userId,
        tourId: tour.id,
        departureDateId: departureDate?.id ?? null,

        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        bookingType,

        numberOfGuests,
        totalPrice: grossAmount,
        grossAmount,
        commissionRateSnapshot,
        payoutPerPaxSnapshot,
        commissionAmount,
        netAmount,
        currency,

        agentNameSnapshot: agent.fullName || null,
        agentEmailSnapshot: agent.email || null,
        agentPhoneSnapshot: agent.phone || null,
        agencyNameSnapshot: agent.travelAgency || null,
        partnerTypeSnapshot: agent.partnerType || null,
        membershipSnapshot: agent.membership || null,

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

        departureDateSnapshot:
          departureDate?.date ?? travelStartDate ?? customRequest?.startDate ?? null,
        travelStartDateSnapshot:
          travelStartDate ?? customRequest?.startDate ?? departureDate?.date ?? null,
        travelEndDateSnapshot:
          travelEndDate ?? customRequest?.endDate ?? null,
        seasonSnapshot: departureDate?.season ?? null,
        pricePerPersonSnapshot,
        earlyDiscountPercentSnapshot:
          departureDate?.earlyDiscountPercent ?? null,
        earlyDiscountDeadlineSnapshot:
          departureDate?.earlyDiscountDeadline ?? null,

        customerName: customerName ?? customRequest?.customerName ?? null,
        customerEmail:
          customerEmail ?? customRequest?.customerEmail ?? agent.email ?? null,
        customerPhone: customerPhone ?? customRequest?.customerPhone ?? null,

        adults,
        children,
        infants: customRequest?.infants ?? 0,
        singleRooms: customRequest?.singleRooms ?? 0,
        doubleRooms: customRequest?.doubleRooms ?? 0,
        twinRooms: customRequest?.twinRooms ?? 0,
        tripleRooms: customRequest?.tripleRooms ?? 0,

        landOnly: customRequest?.landOnly ?? true,
        needsFlights: customRequest?.needsFlights ?? false,

        notes: customRequest?.notes || null,
        specialRequests: customRequest?.specialRequests || null,
        internalNotes,

        estimatedPax: customRequest?.estimatedPax ?? numberOfGuests,
        finalPax: null,

        groupLeaderName:
          groupLeaderName ?? customRequest?.groupLeaderName ?? null,
        groupName: groupName ?? customRequest?.groupName ?? null,

        amountDue: grossAmount,
        amountPaid: 0,
      },
    });

    if (customRequest) {
      await db.customTourRequest.update({
        where: { id: customRequest.id },
        data: {
          status: "CONFIRMED",
          adminReply: `Converted to booking ${booking.bookingReference}.`,
        },
      });
    }

    return NextResponse.redirect(
      new URL(`/admin/bookings/${booking.id}`, req.url),
    );
  } catch (error) {
    console.error("CREATE_OR_CONVERT_BOOKING_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
