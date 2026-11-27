"use client";

import { useEffect, useRef, useState } from "react";

import {
  findUsableQuotePreparationRates,
  prepareItineraryHotelStays,
  quotePreparationDateRange,
  type QuotePreparationStay,
  type QuotePreparationTour,
} from "@/lib/quotes/epochQuotePreparation";
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
  onApply: (rows: PreparedQuoteHotel[], warnings: string[]) => void;
};

export default function EpochQuotePreparation({tour, startDate, endDate, groupSize, currency, onApply}: Props) {
  const [proposal, setProposal] = useState<{hotels: HotelProposal[]; warnings: string[]}>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function prepare() {
    if (!tour || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setProposal(undefined);
    setError("");
    setLoading(true);
    try {
      const {hotels, warnings} = prepareItineraryHotelStays(tour, startDate, endDate);
      const proposals: HotelProposal[] = [];
      async function research(stay: QuotePreparationStay): Promise<HotelProposal> {
        const open = {stay, rates: [], selectedRateId: ""};
        if (!stay.checkIn || !stay.checkOut) return {...open, issue: "Hotel dates need review."};
        const params = new URLSearchParams({
          city: stay.city, startDate: stay.checkIn, endDate: stay.checkOut, pax: String(groupSize),
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
          return {
            stay, rates, selectedRateId: rates.length === 1 ? rates[0].rate.id : "",
            issue: rates.length ? undefined : "No current CRM rate covers this stay with both Single and Double/Twin prices. Check dates, currency and supplier terms.",
          };
        } catch (error) {
          if (controller.signal.aborted) throw error;
          return {...open, issue: "Supplier CRM lookup failed. Retry or check rates in Hotels."};
        }
      }
      for (let index = 0; index < hotels.length; index += 4) {
        proposals.push(...await Promise.all(hotels.slice(index, index + 4).map(research)));
      }
      if (!controller.signal.aborted) setProposal({hotels: proposals, warnings});
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not prepare the quote.");
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-5" aria-label="Epoch AI quotation preparation">
      <h2 className="font-semibold text-[#001F3F]">Prepare a new quote with Epoch AI</h2>
      <p className="text-sm text-slate-700">Epoch AI checks hotel nights and applicable Supplier CRM rates. Enter the date of itinerary Day 1 as the requested start date.</p>
      <button type="button" disabled={!tour || !quotePreparationDateRange(startDate, endDate) || groupSize < 1 || loading}
        onClick={() => void prepare()} className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {loading ? "Checking itinerary and CRM rates…" : proposal ? "Check rates again" : "Prepare quote draft"}
      </button>
      {tour && startDate && endDate && !quotePreparationDateRange(startDate, endDate) ? (
        <p className="text-sm text-amber-900">Enter a valid end date after the start date.</p>
      ) : null}
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {proposal ? <>
        <ul className="space-y-2 text-sm">
          {proposal.hotels.map(({stay, rates, selectedRateId, issue}, index) => {
            const selected = rates.find(result => result.rate.id === selectedRateId);
            return (
              <li key={index} className="space-y-2 rounded-lg border bg-white p-3">
                <p className="font-semibold">{stay.city}{stay.checkIn ? ` · ${stay.checkIn} to ${stay.checkOut} · ${stay.nights} night(s)` : ""}</p>
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
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
          {proposal.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
          <li>Review transport, guides, entrances, meals and other services in the quote builder.</li>
        </ul>
        <button type="button" onClick={() => onApply(proposal.hotels.map(({stay, rates, selectedRateId}) => ({
          stay, rate: rates.find(result => result.rate.id === selectedRateId),
        })), proposal.warnings)} className="rounded-lg border border-blue-700 bg-white px-4 py-2 text-sm font-semibold text-blue-800">
          Use in quote builder
        </button>
      </> : null}
    </section>
  );
}
