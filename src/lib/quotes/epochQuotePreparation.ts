import { itineraryProcurementStays } from "@/lib/epoch-ai/hotelStayCities";
import type { SupplierHotelResult } from "./supplierHotelSelection";

const DATE_MS = 86_400_000;

export type QuotePreparationTour = {
  id: string;
  title: string;
  itinerary: string | null;
  overviewItinerary: string | null;
  destinations?: string[];
};

export type QuotePreparationStay = {
  city: string;
  country?: string;
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

export function prepareItineraryHotelStays(tour: QuotePreparationTour, startDate: string, endDate: string) {
  if (!quotePreparationDateRange(startDate, endDate)) throw new Error("Enter a valid requested start date and a later end date.");
  const itinerary = tour.itinerary?.trim() || tour.overviewItinerary?.trim();
  const stops = itineraryProcurementStays(itinerary, tour.destinations ?? [], startDate);
  const availableDates = new Set<string>();
  const warnings: string[] = [];
  const hotels: QuotePreparationStay[] = [];
  for (const stop of stops) {
    const { checkIn, checkOut } = stop;
    if (!checkIn || !checkOut || checkIn < startDate || checkOut > endDate) {
      if (stop.city) hotels.push({city: stop.city, country: stop.country, nights: 0});
      warnings.push(`${stop.ferry?.label || stop.city} needs check-in and check-out dates within the requested dates.`);
      continue;
    }
    const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / DATE_MS;
    for (let date = Date.parse(checkIn); date < Date.parse(checkOut); date += DATE_MS) {
      availableDates.add(new Date(date).toISOString().slice(0, 10));
    }
    if (stop.ferry) {
      warnings.push(`${stop.ferry.label} · ${checkIn}: add the ferry cost under transport.`);
      continue;
    }
    hotels.push({city: stop.city, country: stop.country, checkIn, checkOut, nights});
  }
  const unassignedNights = (Date.parse(endDate) - Date.parse(startDate)) / DATE_MS - availableDates.size;
  if (unassignedNights > 0) {
    warnings.push(`${unassignedNights} night(s) have no identifiable hotel or ferry stay. Check the itinerary and requested dates.`);
  }
  return { hotels, warnings };
}

export function findUsableQuotePreparationRates(results: SupplierHotelResult[], stay: QuotePreparationStay, currency: string) {
  return results.filter(({rate, rateValidity, requiresReconfirmation, cityTaxNeedsReview, effectiveCost}) =>
    rateValidity === "VALID_FOR_REQUEST" && !requiresReconfirmation && !cityTaxNeedsReview &&
    rate.currency.toUpperCase() === currency.toUpperCase() &&
    (rate.minimumNights === null || rate.minimumNights <= stay.nights) &&
    effectiveCost.singleStatus === "COMPLETE" && (effectiveCost.singlePerPersonPerNight ?? 0) > 0 &&
    effectiveCost.doubleTwinStatus === "COMPLETE" && (effectiveCost.doubleTwinPerPersonPerNight ?? 0) > 0);
}
