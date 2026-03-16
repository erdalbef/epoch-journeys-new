import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { bookingConfirmationEmail } from "@/lib/email/templates/bookingConfirmation";
import { generateVoucherPDF } from "@/lib/voucher/generateVoucher";

type BookingRequestBody = {
  tourId: string;
  departureDateId: string;
  bookingType?: "FIT" | "GROUP";

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

  groupName?: string;
  groupLeaderName?: string;
  estimatedPax?: number;
  finalPax?: number;
};

type CreatedBookingResult = {
  booking: {
    id: string;
    bookingNumber: number;
    bookingReference: string;
    bookingDisplayCode: string | null;
    status: string;
    paymentStatus: string;
    numberOfGuests: number;
    totalPrice: number;
    tourTitleSnapshot: string;
    departureDateSnapshot: Date;
    currency: string;
    customerName: string | null;
    agencyNameSnapshot: string | null;
    agentNameSnapshot: string | null;
    agentEmailSnapshot: string | null;
  };
  agentEmail: string;
};

function toSafeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNonNegativeInt(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function normalizeCode(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;

  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.length > 0 ? normalized : fallback;
}

function makeTemporaryBookingReference(): string {
  return `TMP-${randomUUID()}`;
}

function generateBookingReference(bookingNumber: number, createdAt: Date): string {
  const year = createdAt.getFullYear();
  const paddedNumber = String(bookingNumber).padStart(6, "0");

  return `EJ-${year}-${paddedNumber}`;
}

function generateBookingDisplayCode(args: {
  bookingNumber: number;
  createdAt: Date;
  agentCode: string | null | undefined;
  tourCode: string | null | undefined;
}): string {
  const year = args.createdAt.getFullYear();
  const paddedNumber = String(args.bookingNumber).padStart(6, "0");
  const agentCode = normalizeCode(args.agentCode, "AGT");
  const tourCode = normalizeCode(args.tourCode, "TOUR");

  return `EJ-${agentCode}-${tourCode}-${year}-${paddedNumber}`;
}

function calculateCommercials(args: {
  partnerType: "TOUR_OPERATOR" | "TRAVEL_AGENCY" | "TRAVEL_EXPERT" | "GROUP_LEADER";
  commissionRate: number | null;
  payoutPerPax: number | null;
  grossAmount: number;
  pax: number;
}) {
  const { partnerType, commissionRate, payoutPerPax, grossAmount, pax } = args;

  let commissionAmount = 0;
  let commissionRateSnapshot: number | null = null;
  let payoutPerPaxSnapshot: number | null = null;

  if (partnerType === "GROUP_LEADER" && payoutPerPax && payoutPerPax > 0) {
    payoutPerPaxSnapshot = payoutPerPax;
    commissionAmount = payoutPerPax * pax;
  } else if (commissionRate && commissionRate > 0) {
    commissionRateSnapshot = commissionRate;
    commissionAmount = grossAmount * commissionRate;
  }

  const netAmount = grossAmount - commissionAmount;

  return {
    commissionAmount,
    commissionRateSnapshot,
    payoutPerPaxSnapshot,
    netAmount,
  };
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

async function sendBookingEmails(result: CreatedBookingResult) {
  const { booking, agentEmail } = result;

  const voucherBooking = await db.booking.findUnique({
    where: { id: booking.id },
    include: {
      user: {
        select: {
          agentLogoUrl: true,
        },
      },
    },
  });

  if (!voucherBooking) {
    throw new Error("BOOKING_NOT_FOUND_FOR_EMAIL");
  }

  const pdfBuffer = await generateVoucherPDF(voucherBooking);

  const displayedReference =
    booking.bookingDisplayCode || booking.bookingReference;

  const agentEmailContent = bookingConfirmationEmail({
    bookingReference: displayedReference,
    tourTitle: booking.tourTitleSnapshot,
    departureDate: booking.departureDateSnapshot,
    guests: booking.numberOfGuests,
    agency: booking.agencyNameSnapshot,
    customerName: booking.customerName,
  });

  console.log("AGENT_BOOKING_EMAIL_TO:", agentEmail);

  await sendEmail({
    to: agentEmail,
    subject: agentEmailContent.subject,
    html: agentEmailContent.html,
    attachments: [
      {
        filename: `voucher-${booking.bookingReference}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  console.log("AGENT_BOOKING_EMAIL_SENT:", booking.bookingReference);

  const adminRecipient =
    process.env.ADMIN_BOOKINGS_EMAIL || process.env.ADMIN_EMAIL || "";

  if (!adminRecipient) {
    console.log("ADMIN_BOOKING_EMAIL_SKIPPED_NO_RECIPIENT");
    return;
  }

  console.log("ADMIN_BOOKING_EMAIL_TO:", adminRecipient);

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="color: #001F3F; margin-bottom: 8px;">New Booking Received</h2>

      <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Official Ref</strong></td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.bookingReference}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Display Ref</strong></td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.bookingDisplayCode || "-"}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Tour</strong></td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.tourTitleSnapshot}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Departure</strong></td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${formatDate(booking.departureDateSnapshot)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Guests</strong></td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.numberOfGuests}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Total</strong></td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${formatMoney(
            booking.totalPrice,
            booking.currency
          )}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Agency</strong></td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.agencyNameSnapshot || "-"}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Agent</strong></td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.agentNameSnapshot || "-"}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Agent Email</strong></td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.agentEmailSnapshot || "-"}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Customer / Group</strong></td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${booking.customerName || "-"}</td>
        </tr>
      </table>
    </div>
  `;

  await sendEmail({
    to: adminRecipient,
    subject: `New Booking Received – ${displayedReference}`,
    html: adminHtml,
  });

  console.log("ADMIN_BOOKING_EMAIL_SENT:", booking.bookingReference);
}

async function createBookingWithRetry(
  body: BookingRequestBody,
  userId: string
): Promise<CreatedBookingResult> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const agent = await tx.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
              role: true,
              approved: true,
              status: true,
              fullName: true,
              phone: true,
              travelAgency: true,
              membership: true,
              partnerType: true,
              commissionRate: true,
              payoutPerPax: true,
              agentCode: true,
            },
          });

          if (
            !agent ||
            agent.role !== "AGENT" ||
            !agent.approved ||
            agent.status !== "ACTIVE"
          ) {
            throw new Error("AGENT_NOT_ALLOWED");
          }

          const tour = await tx.tour.findUnique({
            where: { id: body.tourId },
            select: {
              id: true,
              title: true,
              tourCode: true,
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
          });

          if (!tour || !tour.isPublished) {
            throw new Error("TOUR_NOT_AVAILABLE");
          }

          if (tour.requiresQuote) {
            throw new Error("TOUR_REQUIRES_QUOTE");
          }

          const departure = await tx.departureDate.findUnique({
            where: { id: body.departureDateId },
            select: {
              id: true,
              tourId: true,
              date: true,
              season: true,
              price: true,
              status: true,
              capacity: true,
              bookedSeats: true,
              earlyDiscountPercent: true,
              earlyDiscountDeadline: true,
            },
          });

          if (!departure || departure.tourId !== tour.id) {
            throw new Error("DEPARTURE_NOT_FOUND");
          }

          if (
            departure.status === "SOLD_OUT" ||
            departure.status === "CLOSED"
          ) {
            throw new Error("DEPARTURE_NOT_BOOKABLE");
          }

          const adults = toNonNegativeInt(body.adults, 1);
          const children = toNonNegativeInt(body.children, 0);
          const infants = toNonNegativeInt(body.infants, 0);

          const numberOfGuests = adults + children + infants;

          if (numberOfGuests <= 0) {
            throw new Error("INVALID_GUEST_COUNT");
          }

          const seatsLeft = departure.capacity - departure.bookedSeats;

          if (numberOfGuests > seatsLeft) {
            throw new Error("NOT_ENOUGH_SEATS");
          }

          const grossAmount = departure.price * numberOfGuests;

          const {
            commissionAmount,
            commissionRateSnapshot,
            payoutPerPaxSnapshot,
            netAmount,
          } = calculateCommercials({
            partnerType: agent.partnerType,
            commissionRate: agent.commissionRate ?? null,
            payoutPerPax: agent.payoutPerPax ?? null,
            grossAmount,
            pax: numberOfGuests,
          });

          const bookingType = body.bookingType === "GROUP" ? "GROUP" : "FIT";

          const updatedBookedSeats = departure.bookedSeats + numberOfGuests;
          const updatedDepartureStatus =
            updatedBookedSeats >= departure.capacity
              ? "SOLD_OUT"
              : departure.status;

          await tx.departureDate.update({
            where: {
              id: departure.id,
            },
            data: {
              bookedSeats: updatedBookedSeats,
              status: updatedDepartureStatus,
            },
          });

          const createdBooking = await tx.booking.create({
            data: {
              bookingReference: makeTemporaryBookingReference(),

              userId: agent.id,
              tourId: tour.id,
              departureDateId: departure.id,

              bookingType,
              status: "PENDING",
              paymentStatus: "UNPAID",

              groupName: toSafeString(body.groupName),
              groupLeaderName: toSafeString(body.groupLeaderName),
              estimatedPax:
                bookingType === "GROUP"
                  ? toNonNegativeInt(body.estimatedPax, numberOfGuests)
                  : null,
              finalPax:
                bookingType === "GROUP"
                  ? toNonNegativeInt(body.finalPax, numberOfGuests)
                  : null,

              numberOfGuests,
              totalPrice: grossAmount,

              grossAmount,
              commissionRateSnapshot,
              payoutPerPaxSnapshot,
              commissionAmount,
              netAmount,
              currency: "EUR",

              agentNameSnapshot: toSafeString(agent.fullName),
              agentEmailSnapshot: agent.email,
              agentPhoneSnapshot: toSafeString(agent.phone),
              agencyNameSnapshot: toSafeString(agent.travelAgency),
              partnerTypeSnapshot: agent.partnerType,
              membershipSnapshot: toSafeString(agent.membership),

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
              earlyDiscountDeadlineSnapshot:
                departure.earlyDiscountDeadline,

              customerName: toSafeString(body.customerName),
              customerEmail: toSafeString(body.customerEmail),
              customerPhone: toSafeString(body.customerPhone),

              leadFirstName: toSafeString(body.leadFirstName),
              leadLastName: toSafeString(body.leadLastName),
              leadEmail: toSafeString(body.leadEmail),
              leadPhone: toSafeString(body.leadPhone),

              adults,
              children,
              infants,

              singleRooms: toNonNegativeInt(body.singleRooms, 0),
              doubleRooms: toNonNegativeInt(body.doubleRooms, 0),
              twinRooms: toNonNegativeInt(body.twinRooms, 0),

              landOnly: body.landOnly ?? true,
              needsFlights: body.needsFlights ?? false,

              notes: toSafeString(body.notes),
              specialRequests: toSafeString(body.specialRequests),
            },
            select: {
              id: true,
              bookingNumber: true,
              createdAt: true,
              status: true,
              paymentStatus: true,
              numberOfGuests: true,
              totalPrice: true,
              tourTitleSnapshot: true,
              departureDateSnapshot: true,
              currency: true,
              customerName: true,
              agencyNameSnapshot: true,
              agentNameSnapshot: true,
              agentEmailSnapshot: true,
            },
          });

          const bookingReference = generateBookingReference(
            createdBooking.bookingNumber,
            createdBooking.createdAt
          );

          const bookingDisplayCode = generateBookingDisplayCode({
            bookingNumber: createdBooking.bookingNumber,
            createdAt: createdBooking.createdAt,
            agentCode: agent.agentCode,
            tourCode: tour.tourCode,
          });

          const booking = await tx.booking.update({
            where: { id: createdBooking.id },
            data: {
              bookingReference,
              bookingDisplayCode,
            },
            select: {
              id: true,
              bookingNumber: true,
              bookingReference: true,
              bookingDisplayCode: true,
              status: true,
              paymentStatus: true,
              numberOfGuests: true,
              totalPrice: true,
              tourTitleSnapshot: true,
              departureDateSnapshot: true,
              currency: true,
              customerName: true,
              agencyNameSnapshot: true,
              agentNameSnapshot: true,
              agentEmailSnapshot: true,
            },
          });

          return {
            booking,
            agentEmail: agent.email,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    } catch (error) {
      if (
        attempt < maxAttempts &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("BOOKING_TRANSACTION_FAILED");
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as BookingRequestBody;

    if (!body.tourId || !body.departureDateId) {
      return NextResponse.json(
        { error: "Tour and departure are required." },
        { status: 400 }
      );
    }

    const result = await createBookingWithRetry(body, session.user.id);

    try {
      await sendBookingEmails(result);
    } catch (emailError) {
      console.error("BOOKING_EMAIL_ERROR", emailError);
    }

    return NextResponse.json(
      {
        success: true,
        booking: result.booking,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("B2B_BOOKING_CREATE_ERROR", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "AGENT_NOT_ALLOWED":
          return NextResponse.json(
            { error: "Your account is not allowed to make bookings." },
            { status: 403 }
          );

        case "TOUR_NOT_AVAILABLE":
          return NextResponse.json(
            { error: "This tour is not available." },
            { status: 404 }
          );

        case "TOUR_REQUIRES_QUOTE":
          return NextResponse.json(
            {
              error:
                "This tour requires a quote and cannot be booked directly.",
            },
            { status: 400 }
          );

        case "DEPARTURE_NOT_FOUND":
          return NextResponse.json(
            { error: "Departure not found for this tour." },
            { status: 404 }
          );

        case "DEPARTURE_NOT_BOOKABLE":
          return NextResponse.json(
            { error: "This departure is not bookable." },
            { status: 400 }
          );

        case "INVALID_GUEST_COUNT":
          return NextResponse.json(
            { error: "Please provide at least one traveler." },
            { status: 400 }
          );

        case "NOT_ENOUGH_SEATS":
          return NextResponse.json(
            {
              error:
                "This departure no longer has enough available seats. Please review the latest availability.",
            },
            { status: 409 }
          );

        case "BOOKING_TRANSACTION_FAILED":
          return NextResponse.json(
            {
              error:
                "This departure was updated while you were booking. Please try again.",
            },
            { status: 409 }
          );

        case "BOOKING_NOT_FOUND_FOR_EMAIL":
          return NextResponse.json(
            {
              error:
                "Booking created, but email attachment data was not found.",
            },
            { status: 500 }
          );
      }
    }

    return NextResponse.json(
      { error: "Failed to create booking." },
      { status: 500 }
    );
  }
}