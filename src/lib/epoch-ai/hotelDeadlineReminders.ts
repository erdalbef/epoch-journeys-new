import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hotelOfferDeadlines } from "./hotelOfferDeadlines";
import { hotelOfferTerms, manualHotelOfferStay } from "./receivedHotelOffer";

export const HOTEL_REMINDER_EVENT = "HOTEL_DEADLINE_REMINDERS";
export const hotelReminderOfferWhere = {
  reviewStatus: "TERMS_VERIFIED",
  acceptanceStatus: {notIn: ["REJECTED", "SUPERSEDED"]},
  newerEvidence: {none: {}},
  supplier: {type: "HOTEL"},
} satisfies Prisma.SupplierCommercialEvidenceWhereInput;

export const hotelReminderOfferSelect = {
  id: true, sourceDate: true, reviewedTerms: true, acceptanceStatus: true, manualHotelStayKey: true,
  hotelInquiry: {select: {checkIn: true, tour: {select: {title: true}}}},
  manualHotelTour: {select: {title: true}},
  supplier: {select: {id: true, name: true}},
  events: {where: {eventType: HOTEL_REMINDER_EVENT}, orderBy: [{createdAt: "desc" as const}, {id: "desc" as const}],
    take: 1, select: {newStatus: true}},
};

type ReminderOffer = NonNullable<Awaited<ReturnType<typeof findReminderOffer>>>;

export async function findReminderOffer(id: string) {
  return db.supplierCommercialEvidence.findFirst({
    where: {id, ...hotelReminderOfferWhere}, select: hotelReminderOfferSelect,
  });
}

export function reminderDeadlines(offer: ReminderOffer) {
  const terms = hotelOfferTerms.safeParse(offer.reviewedTerms);
  if (!terms.success) return [];
  let checkIn = offer.hotelInquiry?.checkIn ?? "";
  if (!checkIn && offer.manualHotelStayKey) {
    try {
      const stay = manualHotelOfferStay.safeParse(JSON.parse(offer.manualHotelStayKey));
      if (stay.success) checkIn = stay.data[1];
    } catch { return []; }
  }
  return hotelOfferDeadlines(terms.data, offer.sourceDate?.toISOString().slice(0, 10) ?? "", checkIn)
    .filter(deadline => deadline.kind !== "expiry" || offer.acceptanceStatus !== "RECORDED_ACCEPTED");
}

export const deadlineReminderToday = (now = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", {timeZone: "Europe/Istanbul"}).format(now);

export async function publishHotelDeadlineReminders(now = new Date()) {
  const today = Date.parse(deadlineReminderToday(now));
  const offers = await db.supplierCommercialEvidence.findMany({
    where: {
      ...hotelReminderOfferWhere,
      OR: [{hotelInquiryId: {not: null}}, {manualHotelTourId: {not: null}}],
      events: {some: {eventType: HOTEL_REMINDER_EVENT, newStatus: "ENABLED"}},
    },
    select: hotelReminderOfferSelect,
  });
  const alerts = offers.flatMap(offer => {
    if (offer.events[0]?.newStatus !== "ENABLED") return [];
    return reminderDeadlines(offer).flatMap(deadline => {
      const remaining = (Date.parse(deadline.date) - today) / 86_400_000;
      if (![7, 3, 1, 0].includes(remaining)) return [];
      const tour = offer.hotelInquiry?.tour.title ?? offer.manualHotelTour?.title;
      const action = deadline.kind === "roomBlock" ? "Check the room-block status and confirm the hotel’s cutoff."
        : "Review the offer and confirm the hotel’s cutoff.";
      return [{
        id: randomUUID(),
        eventKey: `hotel-deadline:${offer.id}:${deadline.date}:${deadline.label}:${remaining}`,
        title: `${offer.supplier.name} · ${remaining === 0 ? "Deadline today" : `Deadline in ${remaining} day${remaining === 1 ? "" : "s"}`}`,
        description: [tour, `${deadline.date} · ${deadline.label}`, action].filter(Boolean).join(" · "),
        href: `/admin/suppliers/${encodeURIComponent(offer.supplier.id)}?tab=policies#supplier-workspace`,
      }];
    });
  });
  if (!alerts.length) return 0;
  return (await db.epochAdminAlert.createMany({data: alerts, skipDuplicates: true})).count;
}
