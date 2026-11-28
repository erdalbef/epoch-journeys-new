import { procurementReferenceStays } from "@/lib/epoch-ai/hotelProcurement";
import type { HotelProcurementSchedule } from "@/lib/epoch-ai/hotelProcurementSchedule";
import { itineraryProcurementStays, itineraryTravelDates } from "@/lib/epoch-ai/hotelStayCities";
import type { SupplierHotelResult } from "./supplierHotelSelection";

const DATE_MS = 86_400_000;

export type QuotePreparationTour = {
  id: string;
  title: string;
  itinerary: string | null;
  overviewItinerary: string | null;
  destinations?: string[];
  hotelProcurementSchedule?: HotelProcurementSchedule | null;
};

export type QuotePreparationStay = {
  city: string;
  country?: string;
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
  nights: number;
};

export function quotePreparationDateRange(startDate: string, endDate: string) {
  if (![startDate, endDate].every(date => /^\d{4}-\d{2}-\d{2}$/.test(date))) return false;
  const first = new Date(startDate);
  const last = new Date(endDate);
  if ([first, last].some(date => !Number.isFinite(date.getTime()))) return false;
  if (first.toISOString().slice(0, 10) !== startDate || last.toISOString().slice(0, 10) !== endDate) return false;
  const nights = (last.getTime() - first.getTime()) / DATE_MS;
  return nights > 0;
}

export function quoteProcurementReferenceDates(tourId: string, schedule?: HotelProcurementSchedule | null) {
  const stays = schedule?.stays ?? procurementReferenceStays(tourId);
  const first = stays[0];
  const last = stays.at(-1);
  if (!first || !last || !stays.every((stay, index) =>
    quotePreparationDateRange(stay.checkIn, stay.checkOut) &&
    (index === 0 || stays[index - 1].checkOut <= stay.checkIn))) return null;
  return { startDate: first.checkIn, endDate: last.checkOut };
}

export type QuotePreparationFerry = { label: string; checkIn: string; day: number };

export function suggestedItineraryQuoteDates(tour: QuotePreparationTour) {
  const dates = itineraryTravelDates(tour.itinerary?.trim() || tour.overviewItinerary?.trim());
  const procurement = quoteProcurementReferenceDates(tour.id, tour.hotelProcurementSchedule);
  if (!procurement || (dates && dates.startDate <= procurement.startDate && dates.endDate >= procurement.endDate)) return dates;
  return procurement;
}

export function prepareItineraryHotelStays(tour: QuotePreparationTour, startDate: string, endDate: string) {
  if (!startDate && !endDate) {
    const stops = itineraryProcurementStays(tour.itinerary?.trim() || tour.overviewItinerary?.trim(), tour.destinations ?? []);
    return {
      hotels: stops.flatMap<QuotePreparationStay>(stop => stop.ferry ? [] : [{
        city: stop.city, country: stop.country, hotelName: stop.hotelName, nights: stop.nightCount ?? 0,
      }]),
      ferries: stops.flatMap(stop => stop.ferry ? [{label: stop.ferry.label, day: stop.ferry.day, checkIn: ""}] : []),
      warnings: ["Enter travel dates to check Supplier CRM rates and assign stay dates."],
      source: "itinerary" as const,
    };
  }
  if (!quotePreparationDateRange(startDate, endDate)) throw new Error("Enter a valid requested start date and a later end date.");
  const schedule = tour.hotelProcurementSchedule;
  const dates = quoteProcurementReferenceDates(tour.id, schedule);
  const duration = Date.parse(endDate) - Date.parse(startDate);
  const matchesDuration = dates && Date.parse(dates.endDate) - Date.parse(dates.startDate) === duration;
  const containsSchedule = dates && startDate <= dates.startDate && endDate >= dates.endDate;
  if (dates && (matchesDuration || containsSchedule)) {
    const shift = matchesDuration ? Date.parse(startDate) - Date.parse(dates.startDate) : 0;
    const requestedDate = (date: string) => new Date(Date.parse(date) + shift).toISOString().slice(0, 10);
    const stays: readonly HotelProcurementSchedule["stays"][number][] = schedule?.stays ?? procurementReferenceStays(tour.id);
    const hotels: QuotePreparationStay[] = [];
    const ferries: QuotePreparationFerry[] = [];
    const warnings: string[] = [];
    let scheduledNights = 0;
    for (const stay of stays) {
      const nights = (Date.parse(stay.checkOut) - Date.parse(stay.checkIn)) / DATE_MS;
      const checkIn = requestedDate(stay.checkIn);
      const checkOut = requestedDate(stay.checkOut);
      scheduledNights += nights;
      if (stay.ferry) {
        ferries.push({label: stay.ferry.label, day: stay.ferry.day, checkIn});
        warnings.push(`${stay.ferry.label} · ${checkIn}: add the ferry cost under transport.`);
      } else {
        hotels.push({city: stay.city, country: stay.country, ...(stay.hotelName ? {hotelName: stay.hotelName} : {}), checkIn, checkOut, nights});
      }
    }
    const unassignedNights = duration / DATE_MS - scheduledNights;
    if (unassignedNights > 0) warnings.push(`${unassignedNights} night(s) fall outside scheduled hotel and ferry stays. Check the requested dates.`);
    return { hotels, ferries, warnings, source: "procurement" as const };
  }

  const itinerary = tour.itinerary?.trim() || tour.overviewItinerary?.trim();
  const stops = itineraryProcurementStays(itinerary, tour.destinations ?? [], startDate);
  const availableDates = new Set<string>();
  const warnings = dates
    ? ["The requested dates do not fit the Hotel Procurement schedule. Review the stays derived from the tour itinerary."]
    : [];
  const hotels: QuotePreparationStay[] = [];
  const ferries: QuotePreparationFerry[] = [];
  for (const stop of stops) {
    const { checkIn, checkOut } = stop;
    if (!checkIn || !checkOut || checkIn < startDate || checkOut > endDate) {
      if (stop.city) hotels.push({city: stop.city, country: stop.country, ...(stop.hotelName ? {hotelName: stop.hotelName} : {}), nights: 0});
      warnings.push(`${stop.ferry?.label || stop.city} needs check-in and check-out dates within the requested dates.`);
      continue;
    }
    const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / DATE_MS;
    for (let date = Date.parse(checkIn); date < Date.parse(checkOut); date += DATE_MS) {
      availableDates.add(new Date(date).toISOString().slice(0, 10));
    }
    if (stop.ferry) {
      ferries.push({label: stop.ferry.label, day: stop.ferry.day, checkIn});
      warnings.push(`${stop.ferry.label} · ${checkIn}: add the ferry cost under transport.`);
      continue;
    }
    hotels.push({city: stop.city, country: stop.country, ...(stop.hotelName ? {hotelName: stop.hotelName} : {}), checkIn, checkOut, nights});
  }
  const unassignedNights = (Date.parse(endDate) - Date.parse(startDate)) / DATE_MS - availableDates.size;
  if (unassignedNights > 0) {
    warnings.push(`${unassignedNights} night(s) have no identifiable hotel or ferry stay. Check the itinerary and requested dates.`);
  }
  return { hotels, ferries, warnings, source: "itinerary" as const };
}

export function findUsableQuotePreparationRates(results: SupplierHotelResult[], stay: QuotePreparationStay, currency: string) {
  return results.filter(({rate, rateValidity, requiresReconfirmation, cityTaxNeedsReview, effectiveCost}) =>
    rateValidity === "VALID_FOR_REQUEST" && !requiresReconfirmation && !cityTaxNeedsReview &&
    rate.currency.toUpperCase() === currency.toUpperCase() &&
    (rate.minimumNights === null || rate.minimumNights <= stay.nights) &&
    effectiveCost.singleStatus === "COMPLETE" && (effectiveCost.singlePerPersonPerNight ?? 0) > 0 &&
    effectiveCost.doubleTwinStatus === "COMPLETE" && (effectiveCost.doubleTwinPerPersonPerNight ?? 0) > 0);
}
