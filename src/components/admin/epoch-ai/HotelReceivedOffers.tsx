"use client";

import { useState } from "react";
import { hotelOfferFields, type HotelOfferTerms } from "@/lib/epoch-ai/receivedHotelOffer";

type Offer = {
  id: string;
  version: number;
  sourceDate: string;
  sourceSender: string;
  sourceSubject: string;
  sourceMessageId: string | null;
  sourceBody: string | null;
  reviewStatus: string;
  reviewedTerms: HotelOfferTerms | null;
  sourceDocument: { id: string; originalFileName: string } | null;
};
const fields = Object.entries(hotelOfferFields) as [keyof HotelOfferTerms, string][];
const emptyTerms = () => Object.fromEntries(fields.map(([key]) => [key, ""])) as HotelOfferTerms;

export default function HotelReceivedOffers({ inquiryId }: { inquiryId: string }) {
  const url = `/api/admin/epoch-ai/hotel-inquiries/${encodeURIComponent(inquiryId)}/offers`;
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [terms, setTerms] = useState(emptyTerms);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function load() {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load received offers.");
    const result = await response.json() as { offers: Offer[] };
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
    const data = new FormData(form);
    data.set("confirmation", "RECORD_RECEIVED_OFFER");
    const response = await fetch(url, { method: "POST", body: data });
    const result = await response.json() as { error?: string; alreadyRecorded?: boolean };
    if (!response.ok) throw new Error(result.error || "Could not record the offer.");
    form.reset();
    setStatus(result.alreadyRecorded ? "This offer is already in the history." : "Offer recorded for review.");
    await load();
  }

  async function offerAction(id: string, action: "analyze" | "review") {
    const response = await fetch(`${url}/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "review" ? { action, confirmation: "VERIFY_OFFER_TERMS", terms } : { action }),
    });
    const result = await response.json() as { error?: string; terms?: HotelOfferTerms };
    if (!response.ok) throw new Error(result.error || "Could not complete the offer action.");
    if (action === "analyze" && result.terms) {
      setEditing(id);
      setTerms(result.terms);
      setStatus("Compare the extracted terms with the original offer before verifying.");
    }
    if (action === "review") {
      setEditing(null);
      setStatus("Reviewed terms saved. Offer acceptance is pending.");
      await load();
    }
  }

  const inputClass = "mt-1 block w-full rounded border bg-white p-2";
  const buttonClass = "rounded border border-blue-500 bg-white px-3 py-2 font-semibold disabled:opacity-50";

  return <details className="space-y-3 rounded border border-blue-200 bg-blue-50 p-3"
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
        <div className="grid gap-2 sm:grid-cols-2">
          <label>Supplier email<input className={inputClass} type="email" name="sender" required maxLength={254} /></label>
          <label>Received date<input className={inputClass} type="date" name="receivedDate" required /></label>
          <label>Email subject<input className={inputClass} name="subject" required maxLength={300} /></label>
          <label>Email message ID (optional)<input className={inputClass} name="messageId" maxLength={500} /></label>
        </div>
        <label className="block">Paste offer from email<textarea className={inputClass} name="body" rows={5} maxLength={32000} /></label>
        <label className="block">Or attach the original PDF or Word file (up to 3 MB)
          <input className={inputClass} type="file" name="attachment" accept=".pdf,.docx" />
        </label>
        <button type="submit" className={buttonClass}>Record received offer</button>
      </fieldset>
    </form>
    {status && <p role="status">{status}</p>}
    {busy && <p role="status">Working…</p>}
    {!busy && offers === null && <button type="button" className={buttonClass} onClick={()=>void run(load)}>Reload offers</button>}
    {offers?.map(offer => (
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
          {fields.filter(([key])=>offer.reviewedTerms?.[key]).map(([key,label])=><div key={key}>
            <dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap">{offer.reviewedTerms?.[key]}</dd>
          </div>)}
        </dl>}
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
    ))}
    {offers?.length === 0 && <p>No received offers recorded for this inquiry.</p>}
  </details>;
}
