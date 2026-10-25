"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Pencil, Plus, RefreshCw, Search, X } from "lucide-react";
import type { AttractionCatalogueItem } from "@/lib/attractions/catalogue";

type FormData = {
  name: string;
  country: string;
  city: string;
  admissionFee: string;
  currency: string;
  isActive: boolean;
  notes: string;
};
const BLANK: FormData = {
  name: "", country: "", city: "", admissionFee: "", currency: "EUR", isActive: true, notes: "",
};
const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#001F3F]";

function formFrom(item: AttractionCatalogueItem): FormData {
  return {
    name: item.name, country: item.country, city: item.city,
    admissionFee: item.admissionFee === null ? "" : String(item.admissionFee),
    currency: item.currency, isActive: item.isActive, notes: item.notes ?? "",
  };
}

function money(item: AttractionCatalogueItem) {
  if (item.admissionFee === null) return "Not entered";
  return `${item.currency} ${item.admissionFee.toFixed(2)}`;
}

export function AttractionsCatalogueManager() {
  const [items, setItems] = useState<AttractionCatalogueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormData>(BLANK);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/attractions", { credentials: "same-origin", cache: "no-store" });
      const data: { ok?: boolean; error?: string; attractions?: AttractionCatalogueItem[] } = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.attractions)) {
        throw new Error(data.error || "Could not load attraction catalogue.");
      }
      setItems(data.attractions);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load attractions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const visible = useMemo(() => items.filter(item => {
    if (!showInactive && !item.isActive) return false;
    const value = `${item.name} ${item.country} ${item.city}`.toLowerCase();
    return value.includes(query.trim().toLowerCase());
  }), [items, query, showInactive]);

  function beginCreate() { setForm(BLANK); setEditingId(null); setFormOpen(true); setError(""); setMessage(""); }
  function beginEdit(item: AttractionCatalogueItem) {
    setForm(formFrom(item)); setEditingId(item.id); setFormOpen(true); setError(""); setMessage("");
  }
  function setField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.country.trim()) {
      setError("Attraction name and country are required."); return;
    }
    const key = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
    const existing = items.find(item => item.id !== editingId && key(item.name) === key(form.name) &&
      key(item.country) === key(form.country) && key(item.city) === key(form.city));
    if (existing) {
      setError(`${existing.name} is already in the attractions catalogue for this location. Edit its existing rate instead of adding a duplicate.`);
      setMessage("");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(
        editingId ? `/api/admin/attractions/${encodeURIComponent(editingId)}` : "/api/admin/attractions",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            ...form,
            admissionFee: form.admissionFee.trim() === "" ? null : form.admissionFee.trim(),
          }),
        },
      );
      const data: { ok?: boolean; error?: string } = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save attraction.");
      setFormOpen(false); setMessage(editingId ? `${form.name} rate updated successfully.` : `${form.name} rate added successfully.`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save attraction.");
    } finally { setBusy(false); }
  }

  async function toggleActive(item: AttractionCatalogueItem) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/attractions/${encodeURIComponent(item.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ ...formFrom(item), isActive: !item.isActive }),
      });
      const data: { ok?: boolean; error?: string } = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not change attraction status.");
      setMessage(item.isActive ? "Attraction deactivated." : "Attraction activated.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update status.");
    } finally { setBusy(false); }
  }

  const activeCount = items.filter(item => item.isActive).length;
  const pricedCount = items.filter(item => item.isActive && item.admissionFee !== null).length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">Products / Pricing master data</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Attractions &amp; Entrance Fees</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Maintain per-person entrance prices independently of commercial suppliers. Quotation prices are copied when selected and do not change if this catalogue is updated later.
          </p>
        </div>
        <button type="button" onClick={beginCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#760000]">
          <Plus className="h-4 w-4"/> New attraction
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total attractions" value={items.length} />
        <Metric label="Active" value={activeCount} />
        <Metric label="Active with prices" value={pricedCount} />
      </div>

      {(error || message) && (
        <div className="fixed right-5 top-5 z-50 max-w-md rounded-xl border bg-white p-4 shadow-xl" role={error ? "alert" : "status"} aria-live="polite">
          <div className="flex items-start gap-3">
            <span className={`text-sm font-semibold ${error ? "text-red-800" : "text-emerald-800"}`}>{error ? `Not saved: ${error}` : message}</span>
            <button type="button" aria-label="Dismiss notification" className="ml-auto text-slate-500" onClick={() => { setError(""); setMessage(""); }}><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {formOpen && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Attraction editor">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit attraction" : "New attraction"}</h2>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close editor"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={save} className="grid gap-4 md:grid-cols-3">
            <Field label="Attraction name *"><input className={inputClass} required maxLength={180} value={form.name} onChange={e => setField("name", e.target.value)} placeholder="Ephesus" /></Field>
            <Field label="Country *"><input className={inputClass} required maxLength={100} value={form.country} onChange={e => setField("country", e.target.value)} placeholder="Türkiye" /></Field>
            <Field label="City / area"><input className={inputClass} maxLength={100} value={form.city} onChange={e => setField("city", e.target.value)} placeholder="Selçuk" /></Field>
            <Field label="Admission fee per person (tax included)"><input className={inputClass} inputMode="decimal" type="number" min={0} step="0.01" value={form.admissionFee} onChange={e => setField("admissionFee", e.target.value)} placeholder="Leave blank if not verified" /></Field>
            <Field label="Currency"><select className={inputClass} value={form.currency} onChange={e => setField("currency", e.target.value)}><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="TRY">TRY</option><option value="BGN">BGN</option></select></Field>
            <Field label="Status"><select className={inputClass} value={form.isActive ? "active" : "inactive"} onChange={e => setField("isActive", e.target.value === "active")}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
            <div className="md:col-span-3"><Field label="Notes (optional)"><textarea rows={2} maxLength={2000} className={inputClass} value={form.notes} onChange={e => setField("notes", e.target.value)} placeholder="Ticket conditions, concessions, booking instructions..." /></Field></div>
            <div className="flex gap-3 md:col-span-3">
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#001F3F] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />{busy ? "Saving..." : "Save attraction"}</button>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium">Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input aria-label="Search attractions" value={query} onChange={e => setQuery(e.target.value)} className={`${inputClass} pl-9`} placeholder="Search attraction, city or country..." />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Show inactive</label>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr>
              <th className="px-4 py-3">Attraction</th><th className="px-4 py-3">Country / City</th><th className="px-4 py-3">Fee per person</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {visible.map(item => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3"><div className="font-semibold text-slate-900">{item.name}</div>{item.notes && <div className="mt-1 max-w-sm truncate text-xs text-slate-500" title={item.notes}>{item.notes}</div>}</td>
                  <td className="px-4 py-3 text-slate-700">{item.country}{item.city && ` / ${item.city}`}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{money(item)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{item.isActive ? "Active" : "Inactive"}</span></td>
                  <td className="px-4 py-3 text-slate-500">{item.updatedAt.slice(0, 10)}</td>
                  <td className="space-x-3 px-4 py-3 text-right whitespace-nowrap"><button type="button" onClick={() => beginEdit(item)} className="inline-flex items-center gap-1 text-sm font-semibold text-[#001F3F]"><Pencil className="h-3.5 w-3.5"/> Edit</button><button type="button" disabled={busy} onClick={() => void toggleActive(item)} className="text-sm font-medium text-slate-600 disabled:opacity-50">{item.isActive ? "Deactivate" : "Activate"}</button></td>
                </tr>
              ))}
              {loading && <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading attractions...</td></tr>}
              {!loading && visible.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No matching attractions. Choose “New attraction” to start your catalogue.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 p-4 text-xs text-slate-500"><BookOpen className="h-4 w-4"/> This catalogue is independent of commercial supplier records and never creates invoices or payables.</div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="block text-xs font-semibold text-slate-700">{label}</span>{children}</label>;
}
function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-[#001F3F]">{value}</p></div>;
}
