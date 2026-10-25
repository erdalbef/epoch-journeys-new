"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, RefreshCw, Search, X } from "lucide-react";
import {
  SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, SERVICE_UNIT_LABELS, SERVICE_UNITS,
  type StandardServiceCategory, type StandardServiceItem, type StandardServiceUnit,
} from "@/lib/per-person-services/catalogue";

type Form = { name: string; category: StandardServiceCategory; unit: StandardServiceUnit;
  price: string; currency: string; isActive: boolean; notes: string; };
const EMPTY: Form = { name: "", category: "BOTTLED_WATER", unit: "PER_DAY", price: "", currency: "EUR", isActive: true, notes: "" };
const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#001F3F]";

// Suggested names only: prices still come from Epoch standard-service records.
// No prices are hard-coded into these presets.
const SERVICE_NAME_PRESETS: ReadonlyArray<{
  name: string;
  category: StandardServiceCategory;
  unit: StandardServiceUnit;
}> = [
  { name: "Bottled Water", category: "BOTTLED_WATER", unit: "PER_DAY" },
  { name: "Lunch", category: "LUNCH", unit: "PER_MEAL" },
  { name: "Dinner", category: "DINNER", unit: "PER_MEAL" },
  { name: "Drinks", category: "DRINKS", unit: "PER_MEAL" },
  { name: "Packed Lunch", category: "LUNCH", unit: "PER_MEAL" },
  { name: "Headsets / Audio System", category: "HEADSETS", unit: "PER_DAY" },
  { name: "Porterage", category: "PORTERAGE", unit: "PER_STAY" },
  { name: "Driver Tips", category: "TIPS", unit: "PER_DAY" },
  { name: "Guide Tips", category: "TIPS", unit: "PER_DAY" },
  { name: "Tour Manager Tips", category: "TIPS", unit: "PER_DAY" },
  { name: "Church Donation", category: "MASS_CHURCH", unit: "PER_PERSON" },
  { name: "Domestic Flight", category: "FLIGHT", unit: "PER_TICKET" },
  { name: "Ferry / Boat Ticket", category: "CRUISE", unit: "PER_TICKET" },
  { name: "Train Ticket", category: "LOCAL_TRANSPORT", unit: "PER_TICKET" },
];
const normalizedServiceName = (name: string) => name.trim().toLocaleLowerCase();

function fromItem(item: StandardServiceItem): Form {
  return { name: item.name, category: item.category, unit: item.unit, price: item.price == null ? "" : String(item.price),
    currency: item.currency, isActive: item.isActive, notes: item.notes || "" };
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-semibold text-slate-700">{label}</span>{children}</label>;
}
export default function StandardServicesManager() {
  const [items, setItems] = useState<StandardServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [serviceNameChoice, setServiceNameChoice] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/standard-services", { credentials: "same-origin", cache: "no-store" });
      const data: { ok?: boolean; error?: string; services?: StandardServiceItem[] } = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.services)) throw new Error(data.error || "Unable to load standard services.");
      setItems(data.services);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load standard services."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const visible = useMemo(() => items.filter(item => (showInactive || item.isActive) &&
    `${item.name} ${SERVICE_CATEGORY_LABELS[item.category]} ${item.unit}`.toLowerCase().includes(query.toLowerCase())), [items, showInactive, query]);
  function beginCreate() {
    setForm({ ...EMPTY }); setEditingId(null); setServiceNameChoice("");
    setFormOpen(true); setError(""); setMessage("");
  }
  // A direct shortcut to the existing custom-service editor. It creates a
  // standard-price record, NOT an extra charge in the current quotation.
  function beginOtherExtra() {
    setForm({ ...EMPTY, category: "OTHER", unit: "PER_PERSON" });
    setEditingId(null);
    setServiceNameChoice("custom");
    setFormOpen(true);
    setError("");
    setMessage("");
  }
  function beginEdit(item: StandardServiceItem) {
    setForm(fromItem(item)); setEditingId(item.id); setServiceNameChoice(`saved:${item.id}`);
    setFormOpen(true); setError(""); setMessage("");
  }
  function chooseServiceName(choice: string) {
    setError(""); setMessage("");
    if (choice.startsWith("saved:")) {
      const existing = items.find(item => item.id === choice.slice("saved:".length));
      if (existing) {
        beginEdit(existing);
        setMessage("Editing the existing service. Saving updates its standard rate, not earlier quotations.");
      }
      return;
    }
    setServiceNameChoice(choice);
    setEditingId(null);
    if (choice.startsWith("preset:")) {
      const preset = SERVICE_NAME_PRESETS.find(item => item.name === choice.slice("preset:".length));
      if (preset) {
        setForm(prev => ({ ...prev, name: preset.name, category: preset.category, unit: preset.unit, price: "" }));
      }
    } else {
      setForm(prev => ({ ...prev, name: "", price: "" }));
    }
  }
  function update<K extends keyof Form>(key: K, value: Form[K]) { setForm(prev => ({ ...prev, [key]: value })); }
  const isMealService = form.category === "LUNCH" || form.category === "DINNER";
  const isDrinksService = form.category === "DRINKS";
  const mealUnitNeedsReview = isMealService && form.unit !== "PER_MEAL" && form.unit !== "PER_PERSON";
  const unitOptions = isMealService
    ? SERVICE_UNITS.filter(unit => unit === "PER_MEAL" || unit === "PER_PERSON" || unit === form.unit)
    : SERVICE_UNITS;
  const unusedPresets = SERVICE_NAME_PRESETS.filter(preset =>
    !items.some(item => normalizedServiceName(item.name) === normalizedServiceName(preset.name))
  );
  async function write(data: Form, id?: string) {
    const duplicate = items.find(item => item.id !== id &&
      normalizedServiceName(item.name) === normalizedServiceName(data.name) &&
      item.category === data.category && item.unit === data.unit);
    if (duplicate) {
      setError(`"${duplicate.name}" already exists with this category and unit. Select the saved service to update its rate instead.`);
      setMessage("");
      return;
    }
    if ((data.category === "LUNCH" || data.category === "DINNER") &&
        data.unit !== "PER_MEAL" && data.unit !== "PER_PERSON") {
      setError("Lunch and dinner must be priced per meal (or as one per-person meal package). Select the number of meals separately in the quotation. No changes saved.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(id ? `/api/admin/standard-services/${encodeURIComponent(id)}` : "/api/admin/standard-services", {
        method: id ? "PATCH" : "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, price: data.price.trim() ? data.price : null }),
      });
      const result: { ok?: boolean; error?: string } = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to save service.");
      setMessage(id ? `Rate for ${data.name} updated successfully.` : `Rate for ${data.name} added successfully.`);
      setFormOpen(false); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save service."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-[#8B0000]">Products / Pricing master data</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Standard Per-Person Services</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">Maintain reference prices for services charged per traveler, including drinks. Select actual meals/days, not the whole tour automatically. Use <strong>Add Other Extra</strong> for a custom per-person service. Boat charters, fixed Mass offerings, private buses and group transfers belong in Group Operations. Hotel-included extras must not be added again. Existing saved quotations remain unchanged.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={beginOtherExtra}
          className="inline-flex items-center gap-2 rounded-xl border border-[#8B0000] bg-white px-5 py-2.5 text-sm font-semibold text-[#8B0000]">
          <Plus className="h-4 w-4"/> Add Other Extra
        </button>
        <button type="button" onClick={beginCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4"/> New service
        </button>
      </div>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      {[["Total services", items.length], ["Active", items.filter(x => x.isActive).length], ["Active with price", items.filter(x => x.isActive && x.price !== null).length]].map(([label, value]) =>
        <div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-[#001F3F]">{value}</p></div>)}
    </div>
    {(error || message) && (
      <div className="fixed right-5 top-5 z-50 max-w-md rounded-xl border bg-white p-4 shadow-xl" role={error ? "alert" : "status"} aria-live="polite">
        <div className="flex items-start gap-3">
          <span className={`text-sm font-semibold ${error ? "text-red-800" : "text-emerald-800"}`}>{error ? `Not saved: ${error}` : message}</span>
          <button type="button" aria-label="Dismiss notification" className="ml-auto text-slate-500" onClick={() => { setError(""); setMessage(""); }}><X className="h-4 w-4" /></button>
        </div>
      </div>
    )}
    {formOpen && <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex justify-between"><h2 className="font-semibold">{editingId ? "Edit standard service" : "New standard service"}</h2>
        <button type="button" onClick={() => setFormOpen(false)} aria-label="Close editor"><X className="h-5 w-5"/></button></div>
      <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">This catalogue is for <strong>individual traveler charges only</strong>. A group Mass confirmation fee, whole-group boat charter, private bus or transfer belongs in <strong>Group Operations &amp; Staff Expenses</strong> on the quotation form. A ferry passenger ticket or drinks charged per traveler may be entered here. Use the custom extra option for other individual services.</p>
      <form onSubmit={event => { event.preventDefault(); void write(form, editingId || undefined); }} className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="standard-service-name" className="block text-xs font-semibold text-slate-700">Service name *</label>
          <select
            id="standard-service-name"
            required
            className={inputClass}
            aria-label="Select service name"
            value={serviceNameChoice}
            onChange={event => chooseServiceName(event.target.value)}
          >
            <option value="">Select a service...</option>
            {items.length > 0 && (
              <optgroup label="Saved services - select to edit">
                {[...items].sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                  <option key={item.id} value={`saved:${item.id}`}>
                    {item.name}{item.isActive ? "" : " (Inactive)"}
                  </option>
                ))}
              </optgroup>
            )}
            {unusedPresets.length > 0 && (
              <optgroup label="Common services - add new">
                {unusedPresets.map(preset => (
                  <option key={preset.name} value={`preset:${preset.name}`}>{preset.name} — {SERVICE_UNIT_LABELS[preset.unit]}</option>
                ))}
              </optgroup>
            )}
            <option value="custom">Other / Custom Service...</option>
          </select>
          {serviceNameChoice === "custom" && (
            <label htmlFor="standard-custom-service-name" className="block pt-2 text-xs font-semibold text-slate-700">
              Custom service name *
              <input
                id="standard-custom-service-name" required maxLength={180} className={`${inputClass} mt-1`}
                value={form.name} onChange={event => update("name", event.target.value)}
                placeholder="Enter a new service name"
              />
            </label>
          )}
          {serviceNameChoice.startsWith("saved:") && (
            <span className="block text-xs text-blue-800">Existing service selected - changes update its standard price.</span>
          )}
          {serviceNameChoice.startsWith("preset:") && (
            <span className="block text-xs text-slate-500">Category and rate unit were selected automatically. Lunch and dinner default to per meal, not per day.</span>
          )}
        </div>
        <Field label="Category"><select className={inputClass} value={form.category} onChange={e => {
          const category = e.target.value as StandardServiceCategory;
          setForm(prev => ({ ...prev, category, unit: (category === "LUNCH" || category === "DINNER") && prev.unit !== "PER_MEAL" && prev.unit !== "PER_PERSON" ? "PER_MEAL" : prev.unit }));
        }}>{SERVICE_CATEGORIES.map(category => <option key={category} value={category}>{SERVICE_CATEGORY_LABELS[category]}</option>)}</select></Field>
        <Field label="Rate unit"><select className={inputClass} value={form.unit} onChange={e => update("unit", e.target.value as StandardServiceUnit)}>{unitOptions.map(unit => <option key={unit} value={unit}>{SERVICE_UNIT_LABELS[unit]}</option>)}</select>
          {isMealService && <span className="block pt-1 text-xs text-slate-600">Use per meal for individual lunches or dinners. In a quotation, choose how many meals are planned (e.g. 3 lunches), not how many tour days.</span>}
          {isDrinksService && <span className="block pt-1 text-xs text-slate-600">For drinks served with meals, use per traveler / meal; for daily water or drinks, select per traveler / day. Enter only the applicable meals/days in the quotation. Do not add drinks already included in a hotel package.</span>}
          {mealUnitNeedsReview && <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            This saved {form.name || "meal"} service has a daily or other non-meal unit. Its existing price has NOT changed. Select "Per traveler / meal" (or a per-person package) and save only after checking that the amount applies to that unit.
          </div>}
        </Field>
        <Field label="Standard price (tax included)"><input className={inputClass} type="number" min="0" step="0.01" value={form.price} onChange={e => update("price", e.target.value)} placeholder="Leave blank if unverified"/></Field>
        <Field label="Currency"><select className={inputClass} value={form.currency} onChange={e => update("currency", e.target.value)}>{["EUR", "USD", "GBP", "TRY", "BGN"].map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Status"><select className={inputClass} value={form.isActive ? "active" : "inactive"} onChange={e => update("isActive", e.target.value === "active")}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
        <div className="md:col-span-3"><Field label="Notes (optional)"><textarea rows={2} maxLength={2000} className={inputClass} value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Supplier-inclusive items, price assumptions, conditions..."/></Field></div>
        <div className="flex gap-3 md:col-span-3"><button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#001F3F] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4"/>Save service</button><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border px-5 py-2">Cancel</button></div>
      </form>
    </section>}
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap gap-3 border-b p-4">
        <div className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
          <input className={`${inputClass} pl-9`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search service or category"/></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}/> Show inactive</label>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RefreshCw className="h-4 w-4"/> Refresh</button>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-4 py-3">Service</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Rate unit</th><th className="px-4 py-3">Standard price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
        <tbody>{visible.map(item => <tr key={item.id} className="border-t"><td className="px-4 py-3"><strong>{item.name}</strong>{item.notes && <p className="max-w-xs truncate text-xs text-slate-500">{item.notes}</p>}</td><td className="px-4 py-3">{SERVICE_CATEGORY_LABELS[item.category]}</td><td className="px-4 py-3">{SERVICE_UNIT_LABELS[item.unit]}</td><td className="px-4 py-3 font-semibold">{item.price === null ? "Unverified" : `${item.currency} ${item.price.toFixed(2)}`}</td><td className="px-4 py-3">{item.isActive ? "Active" : "Inactive"}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => beginEdit(item)} className="inline-flex items-center gap-1 text-[#001F3F]"><Pencil className="h-4 w-4"/>Edit</button><button type="button" disabled={busy} onClick={() => void write({ ...fromItem(item), isActive: !item.isActive }, item.id)} className="ml-4 text-slate-600">{item.isActive ? "Deactivate" : "Activate"}</button></td></tr>)}
          {loading && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading standard rates...</td></tr>}
          {!loading && !visible.length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No services to show. Choose New service to set your first standard rate.</td></tr>}
        </tbody></table></div>
      <p className="border-t p-4 text-xs text-slate-500">These are cost references, not supplier invoices or payables. Hotel-included services must not be added again to a quotation.</p>
    </section>
  </div>;
}
