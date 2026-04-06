"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  BookingStatus,
  BookingType,
  CustomRequestStatus,
  PaymentStatus,
  Season,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const ALLOWED_STATUSES = [
  CustomRequestStatus.NEW,
  CustomRequestStatus.IN_REVIEW,
  CustomRequestStatus.QUOTED,
  CustomRequestStatus.CONFIRMED,
  CustomRequestStatus.CANCELLED,
] as const;

type RequestStatus = (typeof ALLOWED_STATUSES)[number];

function isValidRequestStatus(value: string): value is RequestStatus {
  return ALLOWED_STATUSES.includes(value as RequestStatus);
}

function buildBookingReference() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `BK-${yyyy}${mm}${dd}-${random}`;
}

export async function updateRequestStatus(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const requestId = formData.get("requestId");
  const status = formData.get("status");

  if (typeof requestId !== "string" || !requestId.trim()) {
    throw new Error("Missing request id");
  }

  if (typeof status !== "string" || !isValidRequestStatus(status)) {
    throw new Error("Invalid status");
  }

  await db.customTourRequest.update({
    where: {
      id: requestId,
    },
    data: {
      status,
    },
  });

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
}

export async function addRequestNote(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  if (!session.user.id) {
    throw new Error("Missing admin user id");
  }

  const requestId = formData.get("requestId");
  const content = formData.get("content");

  if (typeof requestId !== "string" || !requestId.trim()) {
    throw new Error("Missing request id");
  }

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Note cannot be empty");
  }

  await db.customRequestNote.create({
    data: {
      requestId,
      authorId: session.user.id,
      content: content.trim(),
    },
  });

  revalidatePath(`/admin/requests/${requestId}`);
}

export async function convertRequestToBooking(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  if (!session.user.id) {
    throw new Error("Missing admin user id");
  }

  const requestId = formData.get("requestId");
  const tourId = formData.get("tourId");
  const departureDateId = formData.get("departureDateId");

  if (typeof requestId !== "string" || !requestId.trim()) {
    throw new Error("Missing request id");
  }

  if (typeof tourId !== "string" || !tourId.trim()) {
    throw new Error("Missing tour id");
  }

  if (typeof departureDateId !== "string" || !departureDateId.trim()) {
    throw new Error("Missing departure date id");
  }

  const request = await db.customTourRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  const user = await db.user.findUnique({
    where: { id: request.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      travelAgency: true,
      partnerType: true,
      membership: true,
      commissionRate: true,
      payoutPerPax: true,
    },
  });

  if (!user) {
    throw new Error("Request user not found");
  }

  const tour = await db.tour.findUnique({
    where: { id: tourId },
    select: {
      id: true,
      title: true,
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
    },
  });

  if (!tour) {
    throw new Error("Tour not found");
  }

  const departure = await db.departureDate.findUnique({
    where: { id: departureDateId },
    select: {
      id: true,
      tourId: true,
      date: true,
      price: true,
      season: true,
      earlyDiscountPercent: true,
      earlyDiscountDeadline: true,
    },
  });

  if (!departure) {
    throw new Error("Departure date not found");
  }

  if (departure.tourId !== tour.id) {
    throw new Error("Selected departure does not belong to selected tour");
  }

  const adults = request.adults ?? 0;
  const children = request.children ?? 0;
  const estimatedPax = request.estimatedPax ?? null;

  const derivedGuests =
    adults + children > 0
      ? adults + children
      : estimatedPax && estimatedPax > 0
        ? estimatedPax
        : 1;

  const totalPrice = departure.price * derivedGuests;
  const commissionRateSnapshot = user.commissionRate ?? null;
  const payoutPerPaxSnapshot = user.payoutPerPax ?? null;

  const commissionAmount =
    commissionRateSnapshot && commissionRateSnapshot > 0
      ? (totalPrice * commissionRateSnapshot) / 100
      : 0;

  const netAmount = totalPrice - commissionAmount;

  const customerName = request.customerName?.trim() || null;
  const leadFirstName = customerName || null;

  const booking = await db.booking.create({
    data: {
      bookingReference: buildBookingReference(),
      userId: user.id,
      tourId: tour.id,
      departureDateId: departure.id,

      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      bookingType:
        (request.estimatedPax ?? 0) > 9 ? BookingType.GROUP : BookingType.FIT,

      numberOfGuests: derivedGuests,
      totalPrice,
      grossAmount: totalPrice,
      commissionRateSnapshot,
      payoutPerPaxSnapshot,
      commissionAmount,
      netAmount,
      currency: request.currency || "EUR",

      agentNameSnapshot: user.fullName ?? null,
      agentEmailSnapshot: user.email ?? null,
      agentPhoneSnapshot: user.phone ?? null,
      agencyNameSnapshot: user.travelAgency ?? null,
      partnerTypeSnapshot: user.partnerType ?? null,
      membershipSnapshot: user.membership ?? null,

      tourTitleSnapshot: tour.title,
      categorySnapshot: tour.category,
      subcategoriesSnapshot: tour.subcategories,
      tagsSnapshot: tour.tags,
      destinationsSnapshot: tour.destinations,
      durationSnapshot: tour.duration,
      shortDescriptionSnapshot: tour.shortDescription ?? null,
      overviewSnapshot: tour.overview ?? null,
      brochureUrlSnapshot: tour.brochureUrl ?? null,
      mainImageUrlSnapshot: tour.mainImageUrl ?? null,
      mapImageUrlSnapshot: tour.mapImageUrl ?? null,

      departureDateSnapshot: departure.date,
      seasonSnapshot: departure.season ?? Season.LOW,
      pricePerPersonSnapshot: departure.price,
      earlyDiscountPercentSnapshot: departure.earlyDiscountPercent ?? null,
      earlyDiscountDeadlineSnapshot: departure.earlyDiscountDeadline ?? null,

      customerName: request.customerName ?? null,
      customerEmail: request.customerEmail ?? null,
      customerPhone: request.customerPhone ?? null,

      leadFirstName,
      leadLastName: null,
      leadEmail: request.customerEmail ?? null,
      leadPhone: request.customerPhone ?? null,

      adults: request.adults ?? 0,
      children: request.children ?? 0,
      infants: 0,

      landOnly: request.landOnly,
      needsFlights: request.needsFlights,

      notes: request.notes ?? null,
      specialRequests: request.roomPreference ?? null,
      internalNotes: [
        `Converted from custom request ${request.requestReference}.`,
        request.internalNotes?.trim() || "",
      ]
        .filter(Boolean)
        .join("\n\n"),

      estimatedPax: request.estimatedPax ?? null,
      groupLeaderName: request.groupLeaderName ?? null,
      groupName: request.groupName ?? null,
    },
  });

  await db.customTourRequest.update({
    where: { id: request.id },
    data: {
      status: CustomRequestStatus.CONFIRMED,
      adminReply: "Converted to booking by admin.",
    },
  });

  await db.customRequestNote.create({
    data: {
      requestId: request.id,
      authorId: session.user.id,
      content: `Request converted to booking ${booking.bookingReference}.`,
    },
  });

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${request.id}`);
  revalidatePath("/admin/bookings");

  redirect(`/admin/bookings/${booking.id}`);
}