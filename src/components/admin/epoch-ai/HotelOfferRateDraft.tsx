"use client";

import { useState } from "react";
import {
  hotelOfferRateApproval, nightlyUnits, offerRoomFields, prepareHotelOfferRateDraft, supplementaryUnits,
} from "@/lib/epoch-ai/hotelOfferRateDraft";
import type { HotelOfferTerms } from "@/lib/epoch-ai/receivedHotelOffer";

const supplements = {halfBoard: "Half-board supplement", beverages: "Dinner beverages", cityTax: "City tax", porterage: "Porterage"} as const;
const units = {
  PER_ROOM_PER_NIGHT: "Per room, per night", PER_PERSON_PER_NIGHT: "Per person, per night",
  PER_PERSON: "Per person", PER_MEAL: "Per meal",
};
const input = "mt-1 block w-full rounded border bg-white p-2";

export default function HotelOfferRateDraft({terms, url, checkIn, checkOut}: {
  terms: HotelOfferTerms; url: string; checkIn: string; checkOut: string;
}) {
  const [draft, setDraft] = useState(() => prepareHotelOfferRateDraft(terms));
  const [supplierConfirmation, setSupplierConfirmation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [activateSupplier, setActivateSupplier] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const cityTaxNeedsReview = Boolean(terms.cityTax.trim() && !draft.cityTaxIncluded && !draft.cityTax.amount);
  const approval = hotelOfferRateApproval.safeParse({
    ...draft, taxIncluded: draft.taxIncluded === "yes", supplierConfirmation, activateSupplier,
    confirmation: "APPROVE_HOTEL_OFFER_RATES",
  });

  async function approve() {
    if (!approval.success || !confirmed || cityTaxNeedsReview) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(approval.data)});
      const result = await response.json() as {error?: string};
      if (!response.ok) throw new Error(result.error || "Could not save the approved rates.");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the approved rates.");
    } finally {
      setBusy(false);
    }
  }

  if (saved) return <p role="status">Approved rates are saved in Supplier CRM. Look up the hotel in Quote Form using these stay dates.</p>;

  return <form className="space-y-3 rounded-lg border bg-slate-50 p-3" onSubmit={event => { event.preventDefault(); void approve(); }}>
    <h5 className="font-semibold">Rate draft for {checkIn} to {checkOut}</h5>
    <p>Use the hotel’s written confirmation to check dates, allotment, nightly units, taxes and terms before approving. Quote Form uses VAT-inclusive BB or HB prices for this stay.</p>
    <fieldset disabled={busy} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <label>Currency<input className={input} value={draft.currency} maxLength={3}
          onChange={event => setDraft({...draft, currency: event.target.value.toUpperCase()})}/></label>
        <label>Room rate unit<select className={input} value={draft.unit}
          onChange={event => setDraft({...draft, unit: event.target.value})}>
          <option value="">Select a unit</option>{nightlyUnits.map(unit => <option key={unit} value={unit}>{units[unit]}</option>)}
        </select></label>
        <label>Meal basis<select className={input} value={draft.mealBasis}
          onChange={event => setDraft({...draft, mealBasis: event.target.value})}>
          <option value="">Select a meal basis</option>
          {Object.entries({BB: "Bed and breakfast", HB: "Half board"}).map(([code, label]) =>
            <option key={code} value={code}>{label}</option>)}
        </select></label>
        <label>VAT<select className={input} value={draft.taxIncluded}
          onChange={event => setDraft({...draft, taxIncluded: event.target.value})}>
          <option value="">Check VAT</option><option value="yes">Included</option><option value="no">Excluded</option>
        </select></label>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {(Object.entries({...offerRoomFields, extraBed: "Extra bed per night (optional)"}) as [
          keyof typeof offerRoomFields | "extraBed", string
        ][]).map(([key, label]) => <label key={key}>
          {label}<input className={input} inputMode="decimal" value={draft[key]}
            onChange={event => setDraft({...draft, [key]: event.target.value})}/>
          <span className="block text-xs text-slate-600">{terms[key === "extraBed" ? "triple" : key]}</span>
        </label>)}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(supplements) as (keyof typeof supplements)[]).map(key => <fieldset key={key} className="rounded border p-2">
          <legend>{supplements[key]}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label>Confirmed amount<input className={input} inputMode="decimal" value={draft[key].amount}
              onChange={event => setDraft({...draft, [key]: {...draft[key], amount: event.target.value}})}/></label>
            <label>Billing unit<select className={input} value={draft[key].unit}
              onChange={event => setDraft({...draft, [key]: {...draft[key], unit: event.target.value}})}>
              <option value="">Select a unit</option>{(key === "cityTax" ? nightlyUnits : supplementaryUnits).map(unit =>
                <option key={unit} value={unit}>{units[unit]}</option>)}
            </select></label>
          </div>
          {key === "cityTax" ? <label className="mt-2 flex gap-2">
            <input type="checkbox" checked={draft.cityTaxIncluded} onChange={event => setDraft({...draft,
              cityTaxIncluded: event.target.checked, cityTax: event.target.checked ? {amount: "", unit: ""} : draft.cityTax})}/>
            City tax is included or the hotel confirmed no charge
          </label> : null}
          <p className="text-xs text-slate-600">{terms[key]}</p>
          {key === "cityTax" && cityTaxNeedsReview ? <p className="text-xs text-amber-900">Confirm the city tax before approving.</p> : null}
        </fieldset>)}
      </div>
      <label className="block">Supplier confirmation reference<input className={input} value={supplierConfirmation}
        onChange={event => setSupplierConfirmation(event.target.value)} maxLength={500} placeholder="Confirmation email subject and date or document reference"/></label>
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={confirmed}
        onChange={event => setConfirmed(event.target.checked)}/>I checked the supplier’s written confirmation for this stay, including the room allotment, rate units and charges.</label>
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={activateSupplier}
        onChange={event => setActivateSupplier(event.target.checked)}/>Activate this hotel if it is inactive</label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={!confirmed || !approval.success || cityTaxNeedsReview}
        className="rounded border border-blue-500 bg-white px-3 py-2 font-semibold disabled:opacity-50">
        {busy ? "Saving…" : "Approve and save to Supplier CRM"}
      </button>
    </fieldset>
  </form>;
}
