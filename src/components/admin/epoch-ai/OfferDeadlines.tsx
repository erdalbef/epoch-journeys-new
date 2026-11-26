import { hotelOfferDeadlines } from "@/lib/epoch-ai/hotelOfferDeadlines";
import type { HotelOfferTerms } from "@/lib/epoch-ai/receivedHotelOffer";

export default function OfferDeadlines({offer}: {offer: {
  reviewedTerms: HotelOfferTerms | null;
  sourceDate: string;
  stay: {checkIn: string; checkOut: string} | null;
  acceptanceStatus: string;
}}) {
  if (!offer.reviewedTerms || !offer.stay || ["REJECTED", "SUPERSEDED"].includes(offer.acceptanceStatus)) return null;
  const deadlines = hotelOfferDeadlines(offer.reviewedTerms, offer.sourceDate.slice(0, 10), offer.stay.checkIn);
  if (!deadlines.length) return null;
  const today = new Intl.DateTimeFormat("sv-SE", {timeZone: "Europe/Istanbul"}).format(new Date());
  const inSevenDays = new Date(Date.parse(today) + 7 * 86_400_000).toISOString().slice(0, 10);
  return <section className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3" aria-label="Offer deadlines">
    <h5 className="font-semibold">Offer deadlines</h5>
    <p>Dates are calculated from the recorded receipt and stay dates. Confirm cutoff times with the hotel. Room-block penalties apply only to a confirmed block.</p>
    <ul className="list-disc space-y-1 pl-5">
      {deadlines.map(({date, label, kind}) => <li key={`${date}:${label}`}>
        <time dateTime={date}>{date}</time> · {label}
        {kind === "roomBlock" && offer.acceptanceStatus !== "RECORDED_ACCEPTED" ? " · Confirm room-block status" : ""}
        {date < today ? " · Date passed" : date <= inSevenDays ? " · Due within 7 days" : ""}
      </li>)}
    </ul>
  </section>;
}
