"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  hotelOfferRateApproval, hotelOfferRateApprovalIssues, nightlyUnits, offerRoomFields, offerChargeFields, hotelOfferChargeUnit, hotelOfferPriceQualifier,
  prepareHotelOfferRateDraft, supplementaryUnits,
} from "@/lib/epoch-ai/hotelOfferRateDraft";
import type { HotelOfferTerms } from "@/lib/epoch-ai/receivedHotelOffer";

const units = {
  PER_ROOM_PER_NIGHT: "Per room, per night", PER_PERSON_PER_NIGHT: "Per person, per night",
  PER_PERSON: "Per person", PER_MEAL: "Per meal",
};
const input = "mt-1 block w-full rounded border bg-white p-2";

export function SupplierRatesLink({supplierId}: {supplierId: string}) {
  return <Link href={`/admin/suppliers/${encodeURIComponent(supplierId)}?tab=rates#supplier-workspace`}
    className="font-semibold text-blue-800 underline">Open Supplier CRM Rates</Link>;
}

export default function HotelOfferRateDraft({terms, url, checkIn, checkOut}: {
  terms: HotelOfferTerms; url: string; checkIn: string; checkOut: string;
}) {
  const approvalRequirementsId = useId();
  const router = useRouter();
  const [draft, setDraft] = useState(() => prepareHotelOfferRateDraft(terms));
  const [supplierConfirmation, setSupplierConfirmation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [confirmIndicativeCharges, setConfirmIndicativeCharges] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{supplierId: string; supplierActive?: boolean}>();
  const [error, setError] = useState("");
  const cityTaxNeedsReview = Boolean(terms.cityTax.trim() && !draft.cityTaxIncluded && !draft.cityTax.amount);
  const indicativeCharges = (Object.keys(offerChargeFields) as (keyof typeof offerChargeFields)[])
    .filter(key => draft[key].amount && hotelOfferPriceQualifier(terms[key]));
  const chargesNeedConfirmation = Boolean(indicativeCharges.length && !confirmIndicativeCharges);
  const approval = hotelOfferRateApproval.safeParse({
    ...draft, taxIncluded: draft.taxIncluded === "yes", supplierConfirmation, activateSupplier: false, confirmIndicativeCharges,
    confirmation: "APPROVE_HOTEL_OFFER_RATES",
  });
  const approvalIssues = [
    ...(approval.success ? [] : hotelOfferRateApprovalIssues(approval.error.issues)),
    ...(cityTaxNeedsReview ? ["Confirm the city tax or indicate it is included or not charged."] : []),
    ...(chargesNeedConfirmation ? ["Confirm the indicative charges with the hotel."] : []),
    ...(!confirmed ? ["Check the box confirming that you reviewed the supplier’s written confirmation."] : []),
  ];

  async function approve() {
    if (!approval.success || !confirmed || cityTaxNeedsReview || chargesNeedConfirmation) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(approval.data)});
      const result = await response.json() as {error?: string; supplierId?: string; supplierActive?: boolean};
      if (!response.ok || !result.supplierId) throw new Error(result.error || "Could not save the approved rates.");
      setSaved({supplierId: result.supplierId, supplierActive: result.supplierActive});
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the approved rates.");
    } finally {
      setBusy(false);
    }
  }

  if (saved) return <div role="status" className="space-y-1">
    <p>Rates saved in Supplier CRM. Select a hotel later from CRM in Quote Form.</p>
    {saved.supplierActive === false ? <p>This supplier is inactive. Activate it in Supplier CRM when you’re ready to include it in quote searches.</p> : null}
    <SupplierRatesLink supplierId={saved.supplierId}/>
  </div>;

  return <form className="space-y-3 rounded-lg border bg-slate-50 p-3" onSubmit={event => { event.preventDefault(); void approve(); }}>
    <h5 className="font-semibold">Rate draft for {checkIn} to {checkOut}</h5>
    <p>Check dates, allotment, nightly units, taxes and terms against the hotel’s written confirmation. Save rates for each candidate here, then choose a hotel from CRM when building the quote.</p>
    <p className="text-xs text-slate-600">Half board, drinks and porterage default to per person, per night when the offer does not specify a billing unit.</p>
    <fieldset disabled={busy} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <label>Currency<input className={input} value={draft.currency} maxLength={3}
          onChange={event => setDraft({...draft, currency: event.target.value.toUpperCase()})}/></label>
        <label>Room rate unit (required)<select className={input} value={draft.unit} required
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
        {(Object.keys(offerChargeFields) as (keyof typeof offerChargeFields)[]).map(key => <fieldset key={key} className="rounded border p-2">
          <legend>{offerChargeFields[key]}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label>Amount<input className={input} inputMode="decimal" value={draft[key].amount}
              onChange={event => {
                setConfirmIndicativeCharges(false);
                const amount = event.target.value;
                const unit = amount
                  ? draft[key].unit || (!draft[key].amount ? hotelOfferChargeUnit(terms[key], key) : "") : "";
                setDraft({...draft, [key]: {amount, unit}});
              }}/></label>
            <label>Billing unit<select className={input} value={draft[key].unit}
              onChange={event => {
                setConfirmIndicativeCharges(false);
                setDraft({...draft, [key]: {...draft[key], unit: event.target.value}});
              }}>
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
          {key !== "cityTax" && draft[key].amount && hotelOfferChargeUnit(terms[key], key) !== "PER_PERSON_PER_NIGHT"
            ? <p className="text-xs text-amber-900">Review the offer’s billing unit.</p> : null}
          {hotelOfferPriceQualifier(terms[key]) && draft[key].amount ? <p className="text-xs font-medium text-amber-900">
            {hotelOfferPriceQualifier(terms[key])} in supplier offer
          </p> : null}
          {key === "cityTax" && cityTaxNeedsReview ? <p className="text-xs text-amber-900">Confirm the city tax before approving.</p> : null}
        </fieldset>)}
      </div>
      {indicativeCharges.length ? <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={confirmIndicativeCharges}
          onChange={event => setConfirmIndicativeCharges(event.target.checked)}/>
        The hotel confirmed these amounts and billing units: {indicativeCharges.map(key => offerChargeFields[key]).join(", ")}.
      </label> : null}
      <label className="block">Supplier confirmation reference<input className={input} value={supplierConfirmation}
        onChange={event => setSupplierConfirmation(event.target.value)} maxLength={500} placeholder="Confirmation email subject and date or document reference"/></label>
      <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={confirmed}
        onChange={event => setConfirmed(event.target.checked)}/>I checked the supplier’s written confirmation for this stay, including the room allotment, rate units and charges.</label>
      {error ? <p role="alert">{error}</p> : null}
      <div aria-live="polite" id={approvalRequirementsId}>
        {approvalIssues.length ? <div className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-950">
          <p className="font-semibold">Complete before approving</p>
          <ul className="list-disc pl-5">
            {approvalIssues.map(issue => <li key={issue}>{issue}</li>)}
          </ul>
        </div> : null}
      </div>
      <button type="submit" disabled={Boolean(approvalIssues.length)} aria-describedby={approvalRequirementsId}
        className="rounded border border-blue-500 bg-white px-3 py-2 font-semibold disabled:opacity-50">
        {busy ? "Saving…" : "Approve and save to Supplier CRM"}
      </button>
    </fieldset>
  </form>;
}
