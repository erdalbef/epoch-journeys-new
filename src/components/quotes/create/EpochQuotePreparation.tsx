"use client";

import { useEffect, useRef, useState } from "react";

import {
  findUsableQuotePreparationRates,
  prepareItineraryHotelStays,
  quotePreparationDateRange,
  type QuotePreparationFerry,
  type QuotePreparationStay,
  type QuotePreparationTour,
} from "@/lib/quotes/epochQuotePreparation";
import { stableHotelIdentity } from "@/lib/epoch-ai/hotelExecutiveBrief";
import { prepareItineraryQuoteServices } from "@/lib/quotes/itineraryQuoteServices";
import type { SupplierHotelResult } from "@/lib/quotes/supplierHotelSelection";

type HotelProposal = {
  stay: QuotePreparationStay;
  rates: SupplierHotelResult[];
  selectedRateId: string;
  issue?: string;
};

export type PreparedQuoteHotel = { stay: QuotePreparationStay; rate?: SupplierHotelResult };

type Props = {
  tour?: QuotePreparationTour;
  startDate: string;
  endDate: string;
  groupSize: number;
  currency: string;
  onApply: (rows: PreparedQuoteHotel[], services: ReturnType<typeof prepareItineraryQuoteServices>, warnings: string[]) => void;
};

export default function EpochQuotePreparation({tour, startDate, endDate, groupSize, currency, onApply}: Props) {
  const [proposal, setProposal] = useState<{hotels: HotelProposal[]; ferries: QuotePreparationFerry[]; warnings: string[]; source: "procurement" | "itinerary"}>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function prepare() {
    if (!tour || request.current) return;
    const tourId = tour.id;
    const controller = new AbortController();
    request.current = controller;
    setProposal(undefined);
    setError("");
    setLoading(true);
    try {
      const {hotels, ferries, warnings, source} = prepareItineraryHotelStays(tour, startDate, endDate);
      const proposals: HotelProposal[] = [];
      async function research(stay: QuotePreparationStay): Promise<HotelProposal> {
        const open = {stay, rates: [], selectedRateId: ""};
        if (!stay.checkIn || !stay.checkOut) return {...open, issue: "Hotel dates need review."};
        const params = new URLSearchParams({
          tourId, city: stay.city, startDate: stay.checkIn, endDate: stay.checkOut, pax: String(groupSize),
          ...(stay.country ? {country: stay.country} : {}),
        });
        try {
          const response = await fetch(`/api/admin/quotes/supplier-hotels?${params}`, {
            cache: "no-store", signal: controller.signal,
          });
          const data = await response.json();
          if (!response.ok || !data.ok || !Array.isArray(data.hotels)) {
            return {...open, issue: "Supplier CRM lookup failed. Retry or check rates in Hotels."};
          }
          const rates = findUsableQuotePreparationRates(data.hotels, stay, currency);
          const plannedHotel = stay.hotelName;
          const preferred = plannedHotel
            ? rates.filter(rate => stableHotelIdentity(rate.supplier.name) === stableHotelIdentity(plannedHotel))
            : rates;
          return {
            stay, rates, selectedRateId: preferred.length === 1 ? preferred[0].rate.id : "",
            issue: rates.length ? undefined : "No active CRM rate covers this stay with both Single and Double/Twin prices in the quote currency.",
          };
        } catch (error) {
          if (controller.signal.aborted) throw error;
          return {...open, issue: "Supplier CRM lookup failed. Retry or check rates in Hotels."};
        }
      }
      for (let index = 0; index < hotels.length; index += 4) {
        proposals.push(...await Promise.all(hotels.slice(index, index + 4).map(research)));
      }
      if (!controller.signal.aborted) setProposal({hotels: proposals, ferries, warnings, source});
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not prepare the quote.");
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const selectedHotels: PreparedQuoteHotel[] = proposal?.hotels.map(({stay, rates, selectedRateId}) => ({
    stay, rate: rates.find(result => result.rate.id === selectedRateId),
  })) ?? [];
  const includedHotelDinners = new Set<string>();
  for (const {stay, rate} of selectedHotels) {
    if (!rate || !stay.checkIn || !stay.checkOut) continue;
    if (!rate.rate.dinnerIncluded && !/^(HB|HALF[ _-]?BOARD)$/i.test(rate.rate.mealBasis || "")) continue;
    for (let time = Date.parse(stay.checkIn); time < Date.parse(stay.checkOut); time += 86_400_000) {
      includedHotelDinners.add(new Date(time).toISOString().slice(0, 10));
    }
  }
  const servicePreview = proposal && prepareItineraryQuoteServices(
    tour?.itinerary?.trim() || tour?.overviewItinerary, startDate, endDate, proposal.ferries, includedHotelDinners,
  );
  const hasIncompleteDates = Boolean(startDate || endDate) && !quotePreparationDateRange(startDate, endDate);

  return (
    <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-5" aria-label="Epoch AI quotation preparation">
      <h2 className="font-semibold text-[#001F3F]">Prepare a new quote with Epoch AI</h2>
      <p className="text-sm text-slate-700">Epoch AI drafts accommodation and listed services from the itinerary, and checks available hotel rates in Supplier CRM. Review the draft before adding it to the quotation.</p>
      <button type="button" disabled={!tour || hasIncompleteDates || groupSize < 1 || loading}
        onClick={() => void prepare()} className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? "Checking itinerary and CRM rates…" : proposal ? "Check rates again" : "Prepare quote draft"}
      </button>
      {tour && hasIncompleteDates ? (
        <p className="text-sm text-amber-900">Enter both travel dates and make sure the end date is after the start date.</p>
      ) : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {proposal ? <>
        <p className="text-sm text-slate-700">
          Hotel stays from {proposal.source === "procurement" ? "the Hotel Procurement schedule" : "the saved tour itinerary"}.
        </p>
        <ul className="space-y-2 text-sm">
          {proposal.hotels.map(({stay, rates, selectedRateId, issue}, index) => {
            const selected = rates.find(result => result.rate.id === selectedRateId);
            return (
              <li key={index} className="space-y-2 rounded-lg border bg-white p-3">
                <p className="font-semibold">{stay.city}{stay.checkIn ? ` · ${stay.checkIn} to ${stay.checkOut} · ${stay.nights} night(s)` : ""}</p>
                {stay.hotelName && <p>Planned hotel in itinerary: {stay.hotelName}</p>}
                {issue ? <p className="text-amber-900">{issue}</p> : (
                  <label className="block">Supplier rate
                    <select value={selectedRateId} onChange={event => {
                      const id = event.target.value;
                      setProposal(current => current && {...current, hotels: current.hotels.map((hotel, position) =>
                        position === index ? {...hotel, selectedRateId: id} : hotel)});
                    }} className="ml-2 max-w-full rounded border p-2">
                      <option value="">Leave rate pending</option>
                      {rates.map(({supplier, rate, effectiveCost}) => (
                        <option key={rate.id} value={rate.id}>{supplier.name} · {rate.name} · {rate.currency} {effectiveCost.doubleTwinPerPersonPerNight} Double/Twin per person/night</option>
                      ))}
                    </select>
                  </label>
                )}
                {selected ? <p className="text-xs text-slate-700">
                  Single {selected.rate.currency} {selected.effectiveCost.singlePerPersonPerNight} per person/night.
                  {" "}Confirm allotment and supplier terms before sending.
                  {selected.rate.minimumRooms ? ` Minimum: ${selected.rate.minimumRooms} rooms.` : ""}
                  {selected.rate.rateRestrictions ? ` Rate restrictions: ${selected.rate.rateRestrictions}` : ""}
                </p> : null}
              </li>
            );
          })}
        </ul>
        {servicePreview && (servicePreview.fixed.length > 0 || servicePreview.operational.length > 0) && (
          <details className="rounded-lg border bg-white p-3 text-sm">
            <summary className="cursor-pointer font-semibold">Review itinerary service rows</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {servicePreview.fixed.map(({label, quantity}, index) => (
                <li key={`per-person-${index}`}>{label} · Quantity {quantity}</li>
              ))}
              {servicePreview.operational.map(({label, numberOfDays}, index) => (
                <li key={`operational-${index}`}>{label} · {numberOfDays} day(s)</li>
              ))}
            </ul>
            <p className="mt-2 text-slate-700">Check supplier costs and meals covered by the selected hotel rate before approval.</p>
          </details>
        )}
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
          {proposal.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
          <li>Review transport, guides, entrances, meals and other services in the quote builder.</li>
        </ul>
        <button type="button" onClick={() => {
          if (servicePreview) onApply(selectedHotels, servicePreview, proposal.warnings);
        }} className="rounded-lg border border-blue-700 bg-white px-4 py-2 text-sm font-semibold text-blue-800">
          Use in quote builder
        </button>
      </> : null}
    </section>
  );
}
