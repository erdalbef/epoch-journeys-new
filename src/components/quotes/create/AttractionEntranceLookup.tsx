"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Ticket } from "lucide-react";
import type { AttractionCatalogueItem } from "@/lib/attractions/catalogue";
import type { FixedCostRow } from "./FixedCostsSection";

type Props = {
  currency: string;
  onSelect: (row: FixedCostRow) => void;
  formatMoney: (amount: number, currency?: string) => string;
  embedded?: boolean;
  hideManual?: boolean;
};

/**
 * The catalogue is independent of Supplier CRM. An attraction's price is a
 * single per-person fee; the existing quote calculator handles COMP costs.
 */
export default function AttractionEntranceLookup({ currency, onSelect, formatMoney, embedded = false, hideManual = false }: Props) {
  const [attractions, setAttractions] = useState<AttractionCatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [manualName, setManualName] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const response = await fetch("/api/admin/attractions?active=true", {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        const data: { ok?: boolean; error?: string; attractions?: AttractionCatalogueItem[] } = await response.json();
        if (!response.ok || !data.ok || !Array.isArray(data.attractions)) {
          throw new Error(data.error || "Could not load entrance-fee catalogue.");
        }
        if (!controller.signal.aborted) setAttractions(data.attractions);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Unable to load attractions.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshCounter]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attractions.filter(entry =>
      !q || `${entry.name} ${entry.country} ${entry.city}`.toLowerCase().includes(q)
    );
  }, [search, attractions]);

  const selected = attractions.find(entry => entry.id === selectedId) ?? null;
  const quoteCurrency = currency.toUpperCase();
  const currencyMatches = selected?.currency.toUpperCase() === quoteCurrency;
  const canUse = Boolean(selected && selected.admissionFee !== null && currencyMatches);

  function addCatalogueRate() {
    if (!selected || !canUse || selected.admissionFee === null) return;
    onSelect({
      label: selected.name,
      category: "ENTRANCE",
      quantity: 1,
      unitCost: selected.admissionFee,
      attractionRateSource: {
        attractionId: selected.id,
        attractionName: selected.name,
        country: selected.country,
        city: selected.city,
        currency: selected.currency,
        admissionFee: selected.admissionFee,
        catalogueUpdatedAt: selected.updatedAt,
      },
    });
  }

  function addManual() {
    const label = (manualName.trim() || selected?.name || "").trim();
    if (!label) return;
    onSelect({ label, category: "ENTRANCE", quantity: 1, unitCost: 0 });
    setManualName("");
  }

  return (
    <section className={embedded ? "p-4" : "border-b border-slate-200 bg-blue-50/70 px-5 py-5"} aria-label="Entrance fee catalogue selection">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#001F3F]">Attractions &amp; Entrance Fees Catalogue</h3>
          <p className="mt-1 text-xs text-slate-600">Select an attraction to import its verified per-person admission rate. No tour dates or supplier record required.</p>
        </div>
        <a href="/admin/attractions" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#8B0000] underline underline-offset-2">Manage attraction prices</a>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.5fr_auto] lg:items-end">
        <label className="block text-xs font-semibold text-slate-700">
          Filter by name, country or city
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setSelectedId(""); }} placeholder="Ephesus, Italy, Rome..." className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" />
          </div>
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          Attraction name
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" aria-label="Choose attraction">
            <option value="">Select an attraction</option>
            {visible.map(entry => (
              <option value={entry.id} key={entry.id}>
                {entry.name} — {entry.city ? `${entry.city}, ` : ""}{entry.country}{entry.admissionFee === null ? " (rate missing)" : ` — ${entry.currency} ${entry.admissionFee.toFixed(2)}`}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setRefreshCounter(value => value + 1)} disabled={loading} className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>
      {loading && <p className="mt-2 text-xs text-slate-500">Loading catalogue...</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      {!loading && !error && attractions.length === 0 && (
        <p className="mt-2 text-xs text-amber-900">No active attractions yet. Add them under Products → Attractions &amp; Entrance Fees. You can also add a manual entrance below.</p>
      )}
      {selected && <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{selected.name} — {selected.city ? `${selected.city}, ` : ""}{selected.country}</span><strong>{selected.admissionFee === null ? "Rate not recorded" : formatMoney(selected.admissionFee, selected.currency)}</strong></div>
        {selected.admissionFee === null ? <p className="mt-1 text-amber-800">Enter a verified price in the catalogue or add a manual cost below.</p> : !currencyMatches ? <p className="mt-1 text-amber-800">Catalogue uses {selected.currency}; this quotation uses {currency}. Enter a manually verified converted amount or change the quotation currency.</p> : <p className="mt-1 text-slate-500">Rate snapshot will be saved with the quotation; later catalogue updates will not change existing quotes.</p>}
      </div>}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <button type="button" disabled={!canUse} onClick={addCatalogueRate} className="inline-flex items-center gap-2 rounded-md bg-[#001F3F] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Ticket className="h-4 w-4" /> Add selected entrance</button>
        {!hideManual && (<>
        <label className="flex-1 text-xs font-semibold text-slate-700" style={{ minWidth: "200px", maxWidth: "350px" }}>Or enter attraction manually<input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Attraction without a catalogue rate" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" /></label>
        <button type="button" onClick={addManual} disabled={!manualName.trim() && !selected} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Add manual entrance</button>
        </>)}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">The imported amount is a per-person fee. COMP costs remain separate in the existing quotation calculator. This action does not create a supplier, invoice or payable.</p>
    </section>
  );
}
