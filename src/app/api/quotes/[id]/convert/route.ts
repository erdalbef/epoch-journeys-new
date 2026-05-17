import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BookingStatus,
  PaymentStatus,
  QuoteActivityAction,
  QuoteStatus,
  Prisma,
} from "@prisma/client";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

type RouteContext = {
  params: {
    id: string;
  };
};

type ConvertBody = {
  tourId?: string;
  departureDateId?: string;
  numberOfGuests?: number;
};

type QuoteToConvert = Prisma.QuoteGetPayload<{
  include: {
    request: {
      include: {
        user: true;
      };
    };
    booking: {
      select: {
        id: true;
      };
    };
    tour: {
      select: {
        id: true;
        title: true;
      };
    };
    departureDate: {
      select: {
        id: true;
        date: true;
        tourId: true;
      };
    };
  };
}>;

function buildBookingReference() {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `BK-${stamp}${random}`;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      );
    }

    const actorId = session.user.id;
    const { id } = context.params;
    const body = (await req.json().catch(() => ({}))) as ConvertBody;

    const quote: QuoteToConvert | null = await db.quote.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            user: true,
          },
        },
        booking: {
          select: { id: true },
        },
        tour: {
          select: {
            id: true,
            title: true,
          },
        },
        departureDate: {
          select: {
            id: true,
            date: true,
            tourId: true,
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json(
        { message: "Quote not found." },
        { status: 404 }
      );
    }

    if (quote.booking) {
      return NextResponse.json(
        {
          message: "Quote already converted.",
          bookingId: quote.booking.id,
        },
        { status: 400 }
      );
    }

    if (quote.status !== QuoteStatus.SENT) {
      return NextResponse.json(
        { message: "Only SENT quotes can be converted." },
        { status: 400 }
      );
    }

    const request = quote.request;

    if (!request) {
      return NextResponse.json(
        { message: "This quote is not linked to a custom request." },
        { status: 400 }
      );
    }

    if (!request.userId) {
      return NextResponse.json(
        { message: "Request is missing a linked user." },
        { status: 400 }
      );
    }

    const tourId =
      body.tourId ?? quote.tourId ?? quote.departureDate?.tourId ?? null;

    const departureDateId =
      body.departureDateId ?? quote.departureDateId ?? null;

    if (!tourId || !departureDateId) {
      return NextResponse.json(
        {
          message: "tourId and departureDateId are required.",
          required: {
            tourId: !tourId,
            departureDateId: !departureDateId,
          },
        },
        { status: 400 }
      );
    }

    const departure = await db.departureDate.findUnique({
      where: { id: departureDateId },
      include: {
        tour: true,
      },
    });

    if (!departure || departure.tourId !== tourId) {
      return NextResponse.json(
        { message: "Invalid tour/departure combination." },
        { status: 400 }
      );
    }

    const numberOfGuests =
      body.numberOfGuests ??
      request.estimatedPax ??
      ((request.adults ?? 0) +
        (request.children ?? 0) +
        (request.infants ?? 0) ||
        1);

    const quoteTotal = quote.totalAmount ?? 0;

    const pricePerPerson =
      numberOfGuests > 0 ? quoteTotal / numberOfGuests : quoteTotal;

    const now = new Date();

    const booking = await db.$transaction(async (tx) => {
      const alreadyConverted = await tx.booking.findFirst({
        where: { quoteId: quote.id },
        select: { id: true },
      });

      if (alreadyConverted) {
        throw new Error("Quote already converted.");
      }

      let bookingReference = buildBookingReference();

      for (let i = 0; i < 5; i++) {
        const exists = await tx.booking.findUnique({
          where: { bookingReference },
          select: { id: true },
        });

        if (!exists) break;
        bookingReference = buildBookingReference();
      }

      const created = await tx.booking.create({
        data: {
          bookingReference,
          bookingDisplayCode: bookingReference,

          userId: request.userId,
          tourId,
          departureDateId,

          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,

          numberOfGuests,

          totalPrice: quoteTotal,
          grossAmount: quoteTotal,
          netAmount: quoteTotal,
          currency: quote.currency,

          customerName: request.customerName,
          customerEmail: request.customerEmail,
          customerPhone: request.customerPhone,

          leadFirstName: request.leadFirstName,
          leadLastName: request.leadLastName,
          leadEmail: request.leadEmail,
          leadPhone: request.leadPhone,

          adults: request.adults ?? 1,
          children: request.children ?? 0,
          infants: request.infants ?? 0,

          singleRooms: request.singleRooms ?? 0,
          doubleRooms: request.doubleRooms ?? 0,
          twinRooms: request.twinRooms ?? 0,
          tripleRooms: request.tripleRooms ?? 0,

          landOnly: request.landOnly,
          needsFlights: request.needsFlights,

          specialRequests: request.specialRequests,
          notes: request.notes,
          internalNotes: quote.internalNotes ?? request.internalNotes,

          estimatedPax: request.estimatedPax,
          groupLeaderName: request.groupLeaderName,
          groupName: request.groupName,

          tourTitleSnapshot: departure.tour.title,
          categorySnapshot: departure.tour.category,
          subcategoriesSnapshot: departure.tour.subcategories,
          tagsSnapshot: departure.tour.tags,
          destinationsSnapshot: departure.tour.destinations,
          durationSnapshot: departure.tour.duration,
          shortDescriptionSnapshot: departure.tour.shortDescription,
          overviewSnapshot: departure.tour.overview,
          brochureUrlSnapshot: departure.tour.brochureUrl,
          mainImageUrlSnapshot: departure.tour.mainImageUrl,
          mapImageUrlSnapshot: departure.tour.mapImageUrl,

          departureDateSnapshot: departure.date,
          seasonSnapshot: departure.season,
          pricePerPersonSnapshot: pricePerPerson,
          earlyDiscountPercentSnapshot: departure.earlyDiscountPercent,
          earlyDiscountDeadlineSnapshot: departure.earlyDiscountDeadline,

          amountDue: quoteTotal,
          amountPaid: 0,

          quoteId: quote.id,
        },
      });

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: QuoteStatus.CONVERTED,
          convertedAt: now,
        },
      });

      await tx.quoteActivity.create({
        data: {
          quoteId: quote.id,
          actorId,
          action: QuoteActivityAction.CONVERTED_TO_BOOKING,
          fromStatus: QuoteStatus.SENT,
          toStatus: QuoteStatus.CONVERTED,
          message: `Quote converted to booking ${bookingReference}.`,
        },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
    });
  } catch (error) {
    console.error("POST /api/quotes/[id]/convert error", error);

    const message =
      error instanceof Error && error.message === "Quote already converted."
        ? error.message
        : "Failed to convert quote.";

    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}