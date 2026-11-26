"use client";

import { useState } from "react";
import HotelOfferRateDraft, { SupplierRatesLink } from "./HotelOfferRateDraft";
import OfferDeadlines from "./OfferDeadlines";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hotelOfferFields, hotelOfferPolicyFields, maxHotelOfferFileSizeMB, readHotelOfferResponse, validateHotelOfferAttachment,
  type HotelOfferTerms, type ManualHotelOffer } from "@/lib/epoch-ai/receivedHotelOffer";

type Offer = {
  id: string;
  supplierId: string;
  version: number;
  sourceDate: string;
  sourceSender: string;
  sourceSubject: string;
  sourceMessageId: string | null;
  sourceBody: string | null;
  reviewStatus: string;
  acceptanceStatus: string;
  stay: {checkIn: string; checkOut: string} | null;
  ratesSaved: boolean;
  reviewedTerms: HotelOfferTerms | null;
  sourceDocument: { id: string; originalFileName: string } | null;
};
const fields = Object.entries(hotelOfferFields) as [keyof HotelOfferTerms, string][];
const emptyTerms = () => Object.fromEntries(fields.map(([key]) => [key, ""])) as HotelOfferTerms;

export default function HotelReceivedOffers(props: ({ inquiryId: string } | { manual: ManualHotelOffer; expanded?: boolean }) & {
  policiesHref?: string;
  suggestedSender?: string | null;
  suggestedSubject?: string;
}) {
  const router = useRouter();
  const manual = "manual" in props ? props.manual : null;
  const inquiryId = "inquiryId" in props ? props.inquiryId : "manual";
  const url = `/api/admin/epoch-ai/hotel-inquiries/${encodeURIComponent(inquiryId)}/offers`;
  const query = manual ? `?${new URLSearchParams(manual)}` : "";
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [terms, setTerms] = useState(emptyTerms);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [attachmentSize, setAttachmentSize] = useState<number | null>(null);

  async function load() {
    const response = await fetch(url + query, { cache: "no-store" });
    const result = await readHotelOfferResponse<{offers?: Offer[]}>(response, "Could not load received offers.");
    if (!Array.isArray(result.offers)) throw new Error("Could not load received offers.");
    setOffers(result.offers);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setStatus("");
    try { await action(); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Could not complete the offer action."); }
    finally { setBusy(false); }
  }

  async function record(form: HTMLFormElement) {
    const attachment = form.querySelector<HTMLInputElement>('input[name="attachment"]')?.files?.[0] ?? null;
    validateHotelOfferAttachment(attachment);
    const data = new FormData(form);
    data.set("confirmation", "RECORD_RECEIVED_OFFER");
    const response = await fetch(url + query, { method: "POST", body: data });
    const result = await readHotelOfferResponse<{recorded?: boolean; alreadyRecorded?: boolean}>(
      response, "Could not record the offer. Check received offers before retrying.",
    );
    if (!result.recorded && !result.alreadyRecorded) throw new Error("Could not confirm the save. Check received offers before retrying.");
    form.reset();
    setAttachmentSize(null);
    setStatus(result.alreadyRecorded ? "This offer is already in the history." : "Offer recorded for review.");
    await load();
    if (props.policiesHref) router.refresh();
  }

  async function offerAction(id: string, action: "analyze" | "review") {
    const response = await fetch(`${url}/${encodeURIComponent(id)}${query}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "review" ? { action, confirmation: "VERIFY_OFFER_TERMS", terms } : { action }),
    });
    const result = await readHotelOfferResponse<{terms?: HotelOfferTerms; reviewed?: boolean}>(
      response, "Could not complete the offer action.",
    );
    if (action === "review" && !result.reviewed) throw new Error("Could not confirm the review was saved.");
    if (action === "analyze" && result.terms) {
      setEditing(id);
      setTerms(result.terms);
      setStatus("Compare the extracted terms with the original offer before verifying.");
    }
    if (action === "review") {
      setEditing(null);
      setStatus("Reviewed terms saved. Offer acceptance is pending.");
      await load();
      if (props.policiesHref) router.refresh();
    }
  }

  const inputClass = "mt-1 block w-full rounded border bg-white p-2";
  const buttonClass = "rounded border border-blue-500 bg-white px-3 py-2 font-semibold disabled:opacity-50";

  return <details open={"expanded" in props ? props.expanded : undefined} className="space-y-3 rounded border border-blue-200 bg-blue-50 p-3"
    onToggle={event => {
      if (event.currentTarget.open && offers === null && !busy) void run(load);
    }}>
    <summary className="cursor-pointer font-semibold text-[#001F3F]">Received offers</summary>
    <form className="space-y-3" onSubmit={event => {
      event.preventDefault();
      const form = event.currentTarget;
      void run(() => record(form));
    }}>
      <fieldset disabled={busy} className="space-y-2">
        <legend className="mb-2 font-semibold">Add received offer</legend>
        {(props.suggestedSender || props.suggestedSubject) && <p className="text-xs text-slate-600">
          Check the suggested supplier email and subject against the reply. Enter the date you received it.
        </p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <label>Supplier email<input className={inputClass} type="email" name="sender" required maxLength={254} defaultValue={props.suggestedSender ?? ""} /></label>
          <label>Received date<input className={inputClass} type="date" name="receivedDate" required /></label>
          <label>Email subject<input className={inputClass} name="subject" required maxLength={300} defaultValue={props.suggestedSubject ?? ""} /></label>
          <label>Email message ID (optional)<input className={inputClass} name="messageId" maxLength={500} /></label>
        </div>
        <label className="block">Paste offer from email<textarea className={inputClass} name="body" rows={5} maxLength={32000} /></label>
        <label className="block">Or attach the original PDF or Word file (up to {maxHotelOfferFileSizeMB} MB)
          <input className={inputClass} type="file" name="attachment" accept=".pdf,.docx"
            onChange={event => setAttachmentSize(event.currentTarget.files?.[0]?.size ?? null)} />
        </label>
        {attachmentSize !== null && <p className="text-xs text-slate-600">
          Selected file: {(attachmentSize / (1024 * 1024)).toFixed(2)} MB
        </p>}
        <button type="submit" className={buttonClass}>Record received offer</button>
      </fieldset>
    </form>
    {status && <p role="status">{status}</p>}
    {busy && <p role="status">Working…</p>}
    {!busy && offers === null && <button type="button" className={buttonClass} onClick={()=>void run(load)}>Reload offers</button>}
    {offers?.map(offer => {
      const showPolicyLink = props.policiesHref && offer === offers[0] && offer.reviewStatus === "TERMS_VERIFIED" &&
        offer.reviewedTerms && !["REJECTED", "SUPERSEDED"].includes(offer.acceptanceStatus) &&
        hotelOfferPolicyFields.some(key => offer.reviewedTerms?.[key]);
      return (
      <section key={offer.id} className="space-y-2 rounded border bg-white p-3">
        <p className="font-semibold">Version {offer.version} · {offer.sourceSubject}</p>
        <p>{offer.sourceDate.slice(0, 10)} · {offer.sourceSender} · {offer.reviewStatus === "TERMS_VERIFIED" ? "Terms verified" : "Received — pending review"}</p>
        {offer.sourceMessageId && <p>Message ID: {offer.sourceMessageId}</p>}
        {offer.sourceBody && <details>
          <summary className="cursor-pointer">View original email text</summary>
          <pre className="whitespace-pre-wrap break-words">{offer.sourceBody}</pre>
        </details>}
        {offer.sourceDocument && <a className="inline-block text-blue-700 underline" href={`/api/admin/finance/documents/${offer.sourceDocument.id}/download`}>
          Download {offer.sourceDocument.originalFileName}
        </a>}
        {offer.reviewStatus === "REVIEW_PENDING" && <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} className={buttonClass} onClick={()=>void run(()=>offerAction(offer.id,"analyze"))}>Extract with Epoch AI</button>
          <button type="button" disabled={busy} className={buttonClass} onClick={()=>{
            if (editing !== offer.id) { setEditing(offer.id); setTerms(emptyTerms()); }
          }}>Enter terms manually</button>
        </div>}
        {offer.reviewedTerms && <dl className="grid gap-2 sm:grid-cols-2">
          {fields.filter(([key])=>offer.reviewedTerms?.[key] && (!showPolicyLink || !hotelOfferPolicyFields.some(field => field === key))).map(([key,label])=><div key={key}>
            <dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap">{offer.reviewedTerms?.[key]}</dd>
          </div>)}
        </dl>}
        {showPolicyLink && props.policiesHref ? <Link href={props.policiesHref}
          className="font-semibold text-blue-800 underline">View offer policies and deadlines</Link> :
          offer === offers[0] && offer.reviewStatus === "TERMS_VERIFIED" ? <OfferDeadlines offer={offer}/> : null}
        {offer.ratesSaved ? <p className="font-semibold">Rates saved in Supplier CRM. <SupplierRatesLink supplierId={offer.supplierId}/></p> :
          offer === offers[0] && offer.reviewStatus === "TERMS_VERIFIED" && offer.reviewedTerms && offer.stay &&
            !["REJECTED", "SUPERSEDED"].includes(offer.acceptanceStatus) ? <details className="rounded border border-blue-200 p-2">
              <summary className="cursor-pointer font-semibold text-[#001F3F]">Prepare rate draft with Epoch AI</summary>
              <HotelOfferRateDraft terms={offer.reviewedTerms} {...offer.stay} url={`${url}/${encodeURIComponent(offer.id)}/rates${query}`}/>
            </details> : null}
        {editing === offer.id && <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">{fields.map(([key,label])=><label key={key}>{label}
            <textarea className={inputClass} value={terms[key]} rows={2} maxLength={2000} disabled={busy}
              onChange={event=>setTerms({...terms,[key]:event.target.value})} />
          </label>)}</div>
          <button type="button" disabled={busy || !Object.values(terms).some(t=>t.trim())} className={buttonClass}
            onClick={()=>{
              if (window.confirm("Verify these terms against the original offer and save the review?")) {
                void run(()=>offerAction(offer.id,"review"));
              }
            }}>Verify and save reviewed terms</button>
        </div>}
      </section>
      );
    })}
    {offers?.length === 0 && <p>No received offers recorded for this inquiry.</p>}
  </details>;
}
