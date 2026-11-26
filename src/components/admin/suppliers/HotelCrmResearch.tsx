"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HotelCrmDraftEntries from "@/components/admin/epoch-ai/HotelCrmDraftEntries";
import { hotelCrmEntryKey, type HotelCrmEntry } from "@/lib/epoch-ai/hotelCrmProfile";

type Hotel = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  postalCode: string | null;
  notes: string | null;
  contactEmails: (string | null)[];
};

export default function HotelCrmResearch({hotel}: {hotel: Hotel}) {
  const router = useRouter();
  const [draft, setDraft] = useState<HotelCrmEntry[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [busy, setBusy] = useState<"research" | "save" | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const selected = draft.filter(entry => !excluded.includes(hotelCrmEntryKey(entry)));
  const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-[#001F3F] disabled:opacity-50";

  async function prepareDraft() {
    setBusy("research");
    setError("");
    setStatus("");
    setDraft([]);
    setExcluded([]);
    const contactEmails = new Set(hotel.contactEmails.map(email => email?.trim().toLowerCase()));
    const existingNotes = new Set(hotel.notes?.split("\n"));
    const missing = (entry: HotelCrmEntry) => {
      if (entry.kind === "contact") return !contactEmails.has(entry.value.toLowerCase());
      if (entry.kind === "fact") return !existingNotes.has(`Public research note: ${entry.value} | Public source: ${entry.sourceUrl}`);
      return !hotel[entry.kind]?.trim();
    };
    try {
      const response = await fetch("/api/admin/epoch-ai/hotel-research/evidence", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({hotelName: hotel.name, city: hotel.city, country: hotel.country, crmProfile: true}),
      });
      const result = await response.json() as {crmEntries?: HotelCrmEntry[]; partial?: boolean; error?: string};
      if (!response.ok || !result.crmEntries) throw Error(result.error || "Hotel research was unavailable.");
      const proposals = result.crmEntries.filter(missing);
      setDraft(proposals);
      if (!proposals.length) setStatus("No new source-backed details found.");
      if (result.partial) setError("Some research sources were unavailable. You can retry the search.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hotel research was unavailable.");
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft() {
    setBusy("save");
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/admin/suppliers/${encodeURIComponent(hotel.id)}/hotel-research`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({entries: selected, approved: true}),
      });
      const result = await response.json() as {saved?: number; error?: string};
      if (!response.ok) throw Error(result.error || "Could not save the draft.");
      setDraft([]);
      setStatus(result.saved ? `Saved ${result.saved} CRM detail(s).` : "The selected details are already on file.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the draft.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Hotel research with Epoch AI">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-semibold text-[#001F3F]">Fill hotel details with Epoch AI</h2>
      <button type="button" className={button} disabled={Boolean(busy) || !hotel.city || !hotel.country} onClick={() => void prepareDraft()}>
        {busy === "research" ? "Researching…" : "Find missing details"}
      </button>
    </div>
    {!hotel.city || !hotel.country ? <p className="text-sm">Add the hotel city and country to start research.</p> : null}
    {error ? <p role="alert" className="text-sm text-amber-900">{error}</p> : null}
    {status ? <p role="status" className="text-sm">{status}</p> : null}
    {draft.length ? <>
      <p className="text-sm">Check the property and its sources. Select the details to save.</p>
      <HotelCrmDraftEntries entries={draft} excluded={excluded} onToggle={key => setExcluded(previous =>
        previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key])} />
      <button type="button" className={button} disabled={Boolean(busy) || !selected.length} onClick={() => void saveDraft()}>
        {busy === "save" ? "Saving…" : "Approve and save details"}
      </button>
    </> : null}
  </section>;
}
