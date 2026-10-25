"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import {
  SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, SERVICE_UNIT_LABELS, SUPPLIER_SERVICE_TYPES_BY_CATEGORY,
  supplierServiceRateIssue, type StandardServiceCategory, type StandardServiceItem, type StandardServiceUnit,
} from "@/lib/per-person-services/catalogue";
import type { FixedCostRow } from "./FixedCostsSection";

type SupplierRate = {
  id: string; name: string; amount: number | null; currency: string; unit: string; taxIncluded: boolean;
  minPax?: number | null; maxPax?: number | null; validFrom?: string; validTo?: string;
  lastVerifiedAt?: string | null;
};
type SupplierService = {
  supplier: { id: string; name: string; preferred?: boolean };
  service: { id: string; name: string; type: string; description?: string | null };
  rates: SupplierRate[];
};
type Props = { currency: string; totalTravelers: number; onSelect: (row: FixedCostRow) => void;
  formatMoney: (amount: number, currency?: string) => string;
  fixedSource?: "STANDARD" | "SUPPLIER";
  hideManual?: boolean;
  embedded?: boolean;
};

/** Reads either real supplier rates or Epoch's independent fixed-price catalogue. */
export default function OtherPerPersonServiceLookup({ currency, totalTravelers, onSelect, formatMoney, fixedSource, hideManual = false, embedded = false }: Props) {
  const [category, setCategory] = useState<StandardServiceCategory>("BOTTLED_WATER");
  const [source, setSource] = useState<"STANDARD" | "SUPPLIER">("STANDARD");
  const activeSource = fixedSource ?? source;
  const [query, setQuery] = useState("");
  const [standardServices, setStandardServices] = useState<StandardServiceItem[]>([]);
  const [supplierServices, setSupplierServices] = useState<SupplierService[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState("");
  const [selectedSupplierRateId, setSelectedSupplierRateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [error, setError] = useState("");
  const [manualPrice, setManualPrice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(""); setSelectedStandardId(""); setSelectedSupplierRateId("");
      try {
        if (activeSource === "STANDARD") {
          const response = await fetch(`/api/admin/standard-services?active=true&category=${category}`, {
            credentials: "same-origin", cache: "no-store", signal: controller.signal,
          });
          const data: { ok?: boolean; error?: string; services?: StandardServiceItem[] } = await response.json();
          if (!response.ok || !data.ok || !Array.isArray(data.services)) throw new Error(data.error || "Could not load Epoch standard prices.");
          if (!controller.signal.aborted) setStandardServices(data.services);
        } else {
          const types = SUPPLIER_SERVICE_TYPES_BY_CATEGORY[category];
          const responseSets = await Promise.all(types.map(async type => {
            const response = await fetch(`/api/admin/quotes/supplier-services?type=${encodeURIComponent(type)}`, {
              credentials: "same-origin", cache: "no-store", signal: controller.signal,
            });
            const data: { ok?: boolean; error?: string; services?: SupplierService[] } = await response.json();
            if (!response.ok || !data.ok || !Array.isArray(data.services)) throw new Error(data.error || `Could not load ${type} supplier services.`);
            return data.services;
          }));
          if (!controller.signal.aborted) {
            const unique = new Map<string, SupplierService>();
            for (const entry of responseSets.flat()) unique.set(entry.service.id, entry);
            setSupplierServices([...unique.values()]);
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load service prices.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [category, activeSource, refreshCounter]);

  const standardOptions = useMemo(() => standardServices.filter(entry =>
    `${entry.name} ${entry.notes ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())), [standardServices, query]);
  const supplierOptions = useMemo(() => supplierServices.flatMap(service =>
    service.rates.map(rate => ({ key: `${service.service.id}:${rate.id}`, service, rate })))
    .filter(entry => `${entry.service.service.name} ${entry.service.supplier.name} ${entry.rate.name}`
      .toLowerCase().includes(query.trim().toLowerCase())), [supplierServices, query]);
  const standard = standardServices.find(entry => entry.id === selectedStandardId);
  const supplier = supplierOptions.find(entry => entry.key === selectedSupplierRateId);
  const standardIssue = !standard ? null : standard.price === null ? "Rate not recorded."
    : standard.currency.toUpperCase() !== currency.toUpperCase() ? `Rate uses ${standard.currency}; quotation uses ${currency}.` : null;
  const supplierIssue = supplier ? supplierServiceRateIssue(supplier.rate, currency, totalTravelers) : null;
  const money = formatMoney;

  function addStandard() {
    if (!standard || standardIssue || standard.price === null) return;
    onSelect({ label: standard.name, category: standard.category, quantity: 1, unitCost: standard.price,
      standardRateSource: { serviceId: standard.id, serviceName: standard.name, category: standard.category,
        unit: standard.unit, currency: standard.currency, price: standard.price, catalogueUpdatedAt: standard.updatedAt },
    });
  }
  function addSupplier() {
    if (!supplier || supplierIssue || supplier.rate.amount === null) return;
    const { service, rate } = supplier;
    if (rate.amount === null) return;
    onSelect({ label: service.service.name, category, quantity: 1, unitCost: rate.amount,
      supplierServiceRateSource: {
        supplierId: service.supplier.id, supplierName: service.supplier.name,
        supplierServiceId: service.service.id, supplierServiceName: service.service.name,
        supplierRateId: rate.id, supplierRateName: rate.name, supplierRateUnit: rate.unit,
        currency: rate.currency, price: rate.amount, verifiedAt: rate.lastVerifiedAt ?? null,
      },
    });
  }
  function addManual() {
    const name = query.trim();
    const raw = manualPrice.trim();
    if (!name || !/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(Number(raw))) return;
    onSelect({ label: name, category, quantity: 1, unitCost: Number(raw) });
    setManualPrice("");
  }

  return <section className={embedded ? "p-4" : "border-b border-slate-200 bg-slate-50 px-5 py-5"} aria-label="Select per-person services">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-sm font-semibold text-[#001F3F]">{fixedSource === "STANDARD" ? "Epoch standard service prices" : fixedSource === "SUPPLIER" ? "Real Supplier CRM rates" : "Other Per-Person Services"}</h3>
        <p className="mt-1 text-xs text-slate-600">Choose an Epoch standard price or a genuine Supplier CRM per-traveler rate. For meals, enter the number of lunches/dinners actually included; for a fixed-price boat charter, bus or private transfer use Group Operations instead.</p></div>
      <a href="/admin/standard-services" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#8B0000] underline">Manage standard prices</a>
    </div>
    <div className={`mt-4 grid gap-3 ${fixedSource ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
      <label className="block text-xs font-semibold text-slate-700">Service category
        <select value={category} onChange={event => { setCategory(event.target.value as StandardServiceCategory); setQuery(""); }} className="mt-1 w-full rounded-md border bg-white p-2 text-sm">
          {SERVICE_CATEGORIES.map(value => <option key={value} value={value}>{SERVICE_CATEGORY_LABELS[value]}</option>)}
        </select>
      </label>
      {!fixedSource && (
        <label className="block text-xs font-semibold text-slate-700">Price source
          <select value={source} onChange={event => setSource(event.target.value as "STANDARD" | "SUPPLIER")} className="mt-1 w-full rounded-md border bg-white p-2 text-sm">
            <option value="STANDARD">Epoch standard prices</option><option value="SUPPLIER">Supplier CRM (real suppliers)</option>
          </select>
        </label>
      )}
      <label className="block text-xs font-semibold text-slate-700">Find service
        <div className="relative mt-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
          <input value={query} onChange={event => { setQuery(event.target.value); setSelectedStandardId(""); setSelectedSupplierRateId(""); }}
            placeholder="Water, VOX, lunch..." className="w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm"/></div>
      </label>
    </div>
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="min-w-64 flex-1 text-xs font-semibold text-slate-700">{activeSource === "STANDARD" ? "Standard service" : "Supplier service and rate"}
        {activeSource === "STANDARD" ? <select value={selectedStandardId} onChange={event => setSelectedStandardId(event.target.value)} className="mt-1 w-full rounded-md border bg-white p-2 text-sm">
          <option value="">Choose a standard service</option>{standardOptions.map(item => <option key={item.id} value={item.id}>{item.name} — {SERVICE_UNIT_LABELS[item.unit]} — {item.price === null ? "Rate missing" : `${item.currency} ${item.price.toFixed(2)}`}</option>)}
        </select> : <select value={selectedSupplierRateId} onChange={event => setSelectedSupplierRateId(event.target.value)} className="mt-1 w-full rounded-md border bg-white p-2 text-sm">
          <option value="">Choose a real supplier rate</option>{supplierOptions.map(entry => <option key={entry.key} value={entry.key}>{entry.service.supplier.name} / {entry.service.service.name} / {entry.rate.name} — {entry.rate.amount === null ? "No rate" : money(entry.rate.amount, entry.rate.currency)} — {entry.rate.unit}</option>)}
        </select>}
      </label>
      <button type="button" onClick={() => setRefreshCounter(x => x + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50"><RefreshCw className="h-4 w-4"/> Refresh</button>
      <button type="button" onClick={activeSource === "STANDARD" ? addStandard : addSupplier}
        disabled={activeSource === "STANDARD" ? !standard || Boolean(standardIssue) : !supplier || Boolean(supplierIssue)}
        className="rounded-md bg-[#001F3F] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Add selected service</button>
    </div>
    {loading && <p className="mt-2 text-xs text-slate-500">Loading rates...</p>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    {standardIssue && activeSource === "STANDARD" && <p className="mt-2 text-xs text-amber-800">{standardIssue}</p>}
    {supplierIssue && activeSource === "SUPPLIER" && <p className="mt-2 text-xs text-amber-800">{supplierIssue} Enter a verified manual rate if needed.</p>}
    {!loading && !error && activeSource === "STANDARD" && !standardOptions.length && <p className="mt-2 text-xs text-amber-800">No matching standard rate. Add one in the catalogue, or use manual entry.</p>}
    {!loading && !error && activeSource === "SUPPLIER" && !supplierOptions.length && <p className="mt-2 text-xs text-amber-800">No matching real supplier rates. Keep a standard price or use a verified manual price.</p>}
    {!hideManual && (
    <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-3">
      <label className="min-w-48 flex-1 text-xs font-semibold text-slate-700">Manual service name
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Service name" className="mt-1 w-full rounded-md border bg-white p-2 text-sm"/></label>
      <label className="w-32 text-xs font-semibold text-slate-700">Price / unit ({currency})
        <input type="number" min="0" step="0.01" value={manualPrice} onChange={event => setManualPrice(event.target.value)} placeholder="0.00" className="mt-1 w-full rounded-md border bg-white p-2 text-sm"/></label>
      <button type="button" disabled={!query.trim() || !/^\d+(\.\d{1,2})?$/.test(manualPrice.trim())} onClick={addManual}
        className="rounded-md border bg-white px-4 py-2 text-xs font-semibold text-slate-800 disabled:opacity-40">Add manual cost</button>
    </div>
    )}
    <p className="mt-3 text-[11px] text-slate-500">These are per-traveler prices only. Set the actual number of Meals / Days / Tickets in the row below (e.g. two dinners, not an eight-day tour). Do not re-enter services already included in hotel prices. No invoices, Supplier Payables or accounting entries are created.</p>
  </section>;
}
