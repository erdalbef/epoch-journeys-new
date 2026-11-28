"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  canSaveHotelRoomRates, fillHotelOfferRateDraft, hotelOfferRateApproval, hotelOfferRateApprovalIssues, hotelOfferRateWarnings,
  nightlyUnits, offerRoomFields, offerChargeFields, hotelOfferChargeUnit, hotelOfferPriceQualifier,
  prepareHotelOfferRateDraft, supplementaryUnits, type HotelOfferRateApproval,
} from "@/lib/epoch-ai/hotelOfferRateDraft";
import type { readHotelOfferRateExtraction } from "@/lib/epoch-ai/hotelOfferRateExtraction";
import { readHotelOfferResponse, type HotelOfferTerms } from "@/lib/epoch-ai/receivedHotelOffer";

type RateExtraction = ReturnType<typeof readHotelOfferRateExtraction>;

const units = {
  PER_ROOM_PER_NIGHT: "Per room, per night", PER_PERSON_PER_NIGHT: "Per person, per night",
  PER_PERSON: "Per person", PER_MEAL: "Per meal",
};
const input = "mt-1 block w-full rounded border bg-white p-2";

export function SupplierRatesLink({supplierId}: {supplierId: string}) {
  return <Link href={`/admin/suppliers/${encodeURIComponent(supplierId)}?tab=rates#supplier-workspace`}
    className="font-semibold text-blue-800 underline">Open Supplier CRM Rates</Link>;
}

export default function HotelOfferRateDraft({terms, url, analysisUrl, checkIn, checkOut, supplierInactive, reference, savedDraft}: {
  terms: HotelOfferTerms; url: string; analysisUrl: string; checkIn: string; checkOut: string; supplierInactive?: boolean;
  reference: string; savedDraft?: HotelOfferRateApproval;
}) {
  const approvalRequirementsId = useId();
  const router = useRouter();
  const singleNight = Date.parse(checkOut) - Date.parse(checkIn) === 86_400_000;
  const [draft, setDraft] = useState(() => savedDraft ? {
    currency: savedDraft.currency, unit: savedDraft.unit, mealBasis: savedDraft.mealBasis,
    taxIncluded: typeof savedDraft.taxIncluded === "boolean" ? (savedDraft.taxIncluded ? "yes" : "no") : savedDraft.taxIncluded,
    doubleTwin: savedDraft.doubleTwin, single: savedDraft.single, triple: savedDraft.triple, extraBed: savedDraft.extraBed,
    halfBoard: savedDraft.halfBoard, beverages: savedDraft.beverages, cityTax: savedDraft.cityTax, cityTaxIncluded: savedDraft.cityTaxIncluded,
    porterage: savedDraft.porterage,
  } : prepareHotelOfferRateDraft(terms, singleNight));
  const [sources, setSources] = useState<RateExtraction["sources"]>({});
  const [extracting, setExtracting] = useState(false);
  const [supplierConfirmation, setSupplierConfirmation] = useState(savedDraft?.supplierConfirmation || reference);
  const [confirmed, setConfirmed] = useState(false);
  const [activateSupplier, setActivateSupplier] = useState(savedDraft?.activateSupplier ?? false);
  const [confirmIndicativeCharges, setConfirmIndicativeCharges] = useState(savedDraft?.confirmIndicativeCharges ?? false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{supplierId: string; supplierActive?: boolean; warnings?: string[]}>();
  const [draftRecorded, setDraftRecorded] = useState(Boolean(savedDraft));
  const [sourceWarning, setSourceWarning] = useState("");
  const [error, setError] = useState("");
  const indicativeCharges = (Object.keys(offerChargeFields) as (keyof typeof offerChargeFields)[])
    .filter(key => draft[key].amount && (hotelOfferPriceQualifier(terms[key]) || hotelOfferPriceQualifier(sources[key] ?? "")));
  const approval = hotelOfferRateApproval.safeParse({
    ...draft, supplierConfirmation, activateSupplier: Boolean(supplierInactive && activateSupplier), confirmIndicativeCharges,
    confirmation: "APPROVE_HOTEL_OFFER_RATES",
  });
  const approvalIssues = [
    ...(approval.success ? [] : hotelOfferRateApprovalIssues(approval.error.issues)),
    ...(!confirmed ? ["Confirm that you reviewed the supplier’s offer."] : []),
  ];
  const warnings = approval.success ? hotelOfferRateWarnings(approval.data, terms) : [];
  const importingRates = approval.success && canSaveHotelRoomRates(approval.data);

  const extractRates = useCallback(async () => {
    setExtracting(true);
    setError("");
    setSourceWarning("");
    try {
      const response = await fetch(analysisUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: "draft-rates"}),
      });
      const {rateDraft, sourceWarning} = await readHotelOfferResponse<{rateDraft: RateExtraction; sourceWarning?: string}>(
        response, "Could not read the original offer. The existing draft is available.",
      );
      setDraft(current => fillHotelOfferRateDraft(current, rateDraft.draft, terms));
      setSources(rateDraft.sources);
      setSourceWarning(sourceWarning ?? "");
      setConfirmed(false);
      setConfirmIndicativeCharges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft rates from the original offer.");
    } finally {
      setExtracting(false);
    }
  }, [analysisUrl, terms]);
  const hasReadOriginal = useRef(false);
  useEffect(() => {
    if (hasReadOriginal.current || savedDraft) return;
    hasReadOriginal.current = true;
    void extractRates();
  }, [extractRates, savedDraft]);

  async function approve() {
    if (!approval.success || !confirmed) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(approval.data)});
      const result = await readHotelOfferResponse<{supplierId: string; supplierActive?: boolean; savedDraft?: boolean; warnings?: string[]}>(
        response, "Could not save the offer rates.",
      );
      if (result.savedDraft) setDraftRecorded(true);
      else {
        setSaved(result);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the approved rates.");
    } finally {
      setBusy(false);
    }
  }

  if (saved) return <div role="status" className="space-y-1">
    <p>Rates saved in Supplier CRM. Select a hotel later from CRM in Quote Form.</p>
    {saved.warnings?.length ? <ul className="list-disc pl-5 text-xs text-amber-900">{saved.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul> : null}
    {saved.supplierActive === false ? <p>This supplier is inactive. Activate it in Supplier CRM when you’re ready to include it in quote searches.</p> : null}
    <SupplierRatesLink supplierId={saved.supplierId}/>
  </div>;

  return <form className="space-y-3 rounded-lg border bg-slate-50 p-3" onSubmit={event => { event.preventDefault(); void approve(); }}>
    <h5 className="font-semibold">Rate draft for {checkIn} to {checkOut}</h5>
    <p>Review the rates and supplier wording before saving. You can save while details are pending.</p>
    <button type="button" disabled={busy || extracting} onClick={() => void extractRates()}
      className="rounded border border-blue-500 bg-white px-3 py-2 font-semibold disabled:opacity-50">
      {extracting ? "Reading original offer…" : "Refill rates from original offer"}
    </button>
    <p className="text-xs text-slate-600">Refill checks the original offer for fields that are still blank.</p>
    {sourceWarning && <p className="text-xs text-amber-900" role="status">{sourceWarning}</p>}
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
      {Object.keys(sources).length ? <details className="text-xs text-slate-600">
        <summary className="cursor-pointer">Sources for currency, room unit, meal basis and taxes</summary>
        <dl className="space-y-1">
          {Object.entries({currency: "Currency", unit: "Room rate unit", mealBasis: "Meal basis", taxIncluded: "VAT", cityTaxIncluded: "City tax inclusion"})
            .filter(([key]) => sources[key]).map(([key, label]) => <div key={key}>
              <dt className="font-semibold">{label}</dt><dd>{sources[key]}</dd>
            </div>)}
        </dl>
      </details> : null}
      <div className="grid gap-2 sm:grid-cols-4">
        {(Object.entries({...offerRoomFields, extraBed: "Extra bed per night (optional)"}) as [
          keyof typeof offerRoomFields | "extraBed", string
        ][]).map(([key, label]) => <label key={key}>
          {label}<input className={input} inputMode="decimal" value={draft[key]}
            onChange={event => setDraft({...draft, [key]: event.target.value})}/>
          <span className="block text-xs text-slate-600">{sources[key] || (key === "extraBed" ? draft.extraBed && terms.triple : terms[key])}</span>
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
                  ? draft[key].unit || (!draft[key].amount ? hotelOfferChargeUnit(sources[key] || terms[key], key) : "") : "";
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
          <p className="text-xs text-slate-600">{sources[key] || terms[key]}</p>
          {(hotelOfferPriceQualifier(terms[key]) || hotelOfferPriceQualifier(sources[key] ?? "")) && draft[key].amount ? <p className="text-xs font-medium text-amber-900">
            {hotelOfferPriceQualifier(terms[key]) || hotelOfferPriceQualifier(sources[key] ?? "")} in supplier offer
          </p> : null}
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
        onChange={event => setConfirmed(event.target.checked)}/>I reviewed the supplier’s offer and approve saving the available information.</label>
      {supplierInactive && <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={activateSupplier} onChange={event=>setActivateSupplier(event.target.checked)} />
        Activate this supplier when saving these rates so it can appear in the quote form.
      </label>}
      {error ? <p role="alert">{error}</p> : null}
    {draftRecorded && <p role="status">Draft saved with this offer. You can continue when more information is available.</p>}
    {warnings.length ? <div className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-950">
      <p className="font-semibold">Details to review</p>
      <ul className="list-disc pl-5">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
    </div> : null}
      <div aria-live="polite" id={approvalRequirementsId}>
        {approvalIssues.length ? <div className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-950">
          <p className="font-semibold">Complete before approving</p>
          <ul className="list-disc pl-5">
            {approvalIssues.map(issue => <li key={issue}>{issue}</li>)}
          </ul>
        </div> : null}
      </div>
        <button type="submit" disabled={busy || Boolean(approvalIssues.length)} aria-describedby={approvalRequirementsId}
        className="rounded border border-blue-500 bg-white px-3 py-2 font-semibold disabled:opacity-50">
        {busy ? "Saving…" : importingRates ? "Approve and save to Supplier CRM" : "Save partial draft with offer"}
      </button>
    </fieldset>
  </form>;
}
