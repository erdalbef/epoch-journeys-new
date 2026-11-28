"use client";

import { useEffect, useState } from "react";
import {
  applyOperationalSupplierRate, operationalCategoryLabels, operationalRateUnitLabel, validOperationalRateDates,
  type OperationalCostCategory, type OperationalCostScope, type OperationalRateDates, type OperationalSupplierService,
} from "@/lib/quotes/operationalSupplierRates";

type Props = {
  category: OperationalCostCategory;
  initialScope: OperationalCostScope;
  changingScope?: boolean;
  adding?: boolean;
  quoteDates: OperationalRateDates;
  initialDates?: OperationalRateDates;
  totalTravelers: number;
  currency: string;
  formatMoney: (amount: number, currency?: string) => string;
  onSelect: (rate: ReturnType<typeof applyOperationalSupplierRate>) => void;
  onClose: () => void;
};

const control = "mt-1 block w-full rounded-md border bg-white p-2 text-sm";

export default function OperationalSupplierRatePicker({
  category, initialScope, changingScope, adding, quoteDates, initialDates, totalTravelers, currency, formatMoney, onSelect, onClose,
}: Props) {
  const [scope, setScope] = useState(initialScope);
  const [dates, setDates] = useState(initialDates ?? (initialScope === "CORE" ? quoteDates : {startDate: "", endDate: ""}));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState<{request: string; services?: OperationalSupplierService[]; error?: string}>();
  const [retry, setRetry] = useState(0);
  const request = validOperationalRateDates(dates) && totalTravelers > 0 && /^[A-Z]{3}$/i.test(currency)
    ? new URLSearchParams({
      operationalCategory: category, ...dates, pax: String(totalTravelers), currency, retry: String(retry),
    }).toString()
    : "";

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/admin/quotes/supplier-services?${request}`, {
          cache: "no-store", signal: controller.signal,
        });
        const data = await response.json() as {ok?: boolean; services?: OperationalSupplierService[]; error?: string};
        if (!response.ok || !data.ok || !Array.isArray(data.services)) {
          throw new Error(data.error || "Could not load Supplier CRM rates.");
        }
        if (!controller.signal.aborted) setResult({request, services: data.services});
      } catch (cause) {
        if (!controller.signal.aborted) setResult({
          request, error: cause instanceof Error ? cause.message : "Could not load Supplier CRM rates.",
        });
      }
    }
    void load();
    return () => controller.abort();
  }, [request]);

  const loaded = result?.request === request ? result : undefined;
  const searching = Boolean(request && !loaded);
  const text = query.trim().toLowerCase();
  const options = (loaded?.services ?? []).flatMap(service =>
    service.rates.flatMap(rate => {
      const name = [service.supplier.name, service.service.name, rate.name, service.service.city, service.service.country]
        .filter(Boolean).join(" · ");
      return name.toLowerCase().includes(text) ? [{name, service, rate}] : [];
    }),
  );
  const selected = options.find(option => option.rate.id === selectedId);
  const selection = selected ? applyOperationalSupplierRate(selected.service, selected.rate, dates, quoteDates, scope) : null;

  return <section aria-label="Find operational rates in Supplier CRM" className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold text-[#001F3F]">{operationalCategoryLabels[category]} · Supplier CRM</h3>
      <button type="button" onClick={onClose} className="text-sm font-medium underline">Close rate search</button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {changingScope && <label className="text-sm font-medium">Cost scope
        <select className={control} value={scope} onChange={event => {
          const next = event.target.value as OperationalCostScope;
          setScope(next);
          setDates(next === "CORE" ? quoteDates : {startDate: "", endDate: ""});
          setSelectedId("");
        }}>
          <option value="CORE">Core Tour</option><option value="PRE">Pre-Stay</option><option value="POST">Post-Stay</option>
        </select>
      </label>}
      <label className="text-sm font-medium">First service date
        <input type="date" className={control} value={dates.startDate} onChange={event => {
          setDates({...dates, startDate: event.target.value});
          setSelectedId("");
        }}/>
      </label>
      <label className="text-sm font-medium">Last service date
        <input type="date" className={control} value={dates.endDate} onChange={event => {
          setDates({...dates, endDate: event.target.value});
          setSelectedId("");
        }}/>
      </label>
      <label className="text-sm font-medium">Find supplier or service
        <input type="search" className={control} value={query} onChange={event => {
          setQuery(event.target.value);
          setSelectedId("");
        }} placeholder="e.g. Sarajevo"/>
      </label>
    </div>
    <p className="text-xs text-slate-700">Use the same date for a one-day service. Rates are checked for {totalTravelers} participants and {currency}.</p>
    {searching && <p role="status" className="text-sm">Checking Supplier CRM rates…</p>}
    {!request && <p className="text-sm text-amber-900">Enter the service dates and set the quote currency and group size.</p>}
    {loaded?.error && <div role="alert" className="text-sm text-red-800">{loaded.error}{" "}
      <button type="button" className="font-semibold underline" onClick={() => {setSelectedId(""); setRetry(value => value + 1);}}>Retry</button>
    </div>}
    {loaded?.services && options.length === 0 && <p className="text-sm text-amber-900">
      No matching active CRM rates with tax included for this service, date range, group size and currency.
    </p>}
    {options.length > 0 && <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-64 flex-1 text-sm font-medium">Supplier rate
        <select className={control} value={selectedId} onChange={event => setSelectedId(event.target.value)}>
          <option value="">Choose a rate</option>
          {options.map(({name, rate}) => <option key={rate.id} value={rate.id}>
            {name} · {formatMoney(rate.amount, rate.currency)} {operationalRateUnitLabel(rate.unit)}
          </option>)}
        </select>
      </label>
      <button type="button" disabled={!selection} onClick={() => {if (selection) onSelect(selection);}}
        className="rounded-md bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {adding ? "Add service to quote" : "Use CRM rate"}
      </button>
    </div>}
    {selected && selection?.costMode === "DAILY" && <p className="text-xs text-slate-700">
      Starting quantity {selection.numberOfDays}. Set the actual billable quantity in the cost row.
    </p>}
  </section>;
}
