"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const supplierTypes = [
  "HOTEL",
  "DMC",
  "TRANSPORT",
  "GUIDE",
  "TOUR_MANAGER",
  "RESTAURANT",
  "CHURCH_SHRINE",
  "ATTRACTION",
  "TICKET_PROVIDER",
  "AIRLINE",
  "CRUISE",
  "FERRY",
  "RAIL",
  "INSURANCE",
  "OTHER",
] as const;

const statuses = ["ACTIVE", "INACTIVE", "SUSPENDED", "BLACKLISTED"] as const;

type SupplierFormData = {
  id?: string;
  name: string;
  legalName?: string | null;
  code?: string | null;
  type: string;
  status: string;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  postalCode?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  emergencyPhone?: string | null;
  defaultCurrency?: string | null;
  taxNumber?: string | null;
  paymentTerms?: string | null;
  cancellationTerms?: string | null;
  preferred?: boolean;
  rating?: number | null;
  notes?: string | null;
};

function inputClass() {
  return "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#001F3F]/40 focus:ring-4 focus:ring-[#001F3F]/5";
}

export default function SupplierForm({
  initial,
}: {
  initial?: SupplierFormData;
}) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    legalName: initial?.legalName ?? "",
    code: initial?.code ?? "",
    type: initial?.type ?? "HOTEL",
    status: initial?.status ?? "ACTIVE",
    country: initial?.country ?? "",
    city: initial?.city ?? "",
    address: initial?.address ?? "",
    postalCode: initial?.postalCode ?? "",
    website: initial?.website ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    emergencyPhone: initial?.emergencyPhone ?? "",
    defaultCurrency: initial?.defaultCurrency ?? "EUR",
    taxNumber: initial?.taxNumber ?? "",
    paymentTerms: initial?.paymentTerms ?? "",
    cancellationTerms: initial?.cancellationTerms ?? "",
    preferred: initial?.preferred ?? false,
    rating: initial?.rating ? String(initial.rating) : "",
    notes: initial?.notes ?? "",
  });

  function update(name: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editing ? `/api/admin/suppliers/${initial?.id}` : "/api/admin/suppliers",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            rating: form.rating ? Number(form.rating) : null,
          }),
        },
      );

      const data = (await response.json()) as {
        error?: string;
        supplier?: { id: string };
      };

      if (!response.ok) {
        throw new Error(data.error || "Could not save supplier.");
      }

      const id = data.supplier?.id || initial?.id;
      router.push(id ? `/admin/suppliers/${id}` : "/admin/suppliers");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save supplier.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Supplier identity</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium text-slate-700 xl:col-span-2">
            Supplier name *
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClass()}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Supplier type *
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className={inputClass()}
            >
              {supplierTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Status
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className={inputClass()}
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700 xl:col-span-2">
            Legal name
            <input
              value={form.legalName}
              onChange={(e) => update("legalName", e.target.value)}
              className={inputClass()}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Internal code
            <input
              value={form.code}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
              className={inputClass()}
              placeholder="SUP-ITA-001"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Default currency
            <input
              value={form.defaultCurrency}
              onChange={(e) => update("defaultCurrency", e.target.value.toUpperCase())}
              className={inputClass()}
              maxLength={3}
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.preferred}
              onChange={(e) => update("preferred", e.target.checked)}
              className="h-4 w-4"
            />
            Preferred supplier
          </label>

          <label className="text-sm font-medium text-slate-700">
            Internal rating (1–5)
            <input
              type="number"
              min="1"
              max="5"
              value={form.rating}
              onChange={(e) => update("rating", e.target.value)}
              className={inputClass()}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Location & contact</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["country", "Country"],
            ["city", "City"],
            ["postalCode", "Postal code"],
            ["email", "General email"],
            ["phone", "Phone"],
            ["emergencyPhone", "Emergency phone"],
            ["website", "Website"],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-medium text-slate-700">
              {label}
              <input
                value={form[key as keyof typeof form] as string}
                onChange={(e) => update(key as keyof typeof form, e.target.value)}
                className={inputClass()}
              />
            </label>
          ))}

          <label className="text-sm font-medium text-slate-700 xl:col-span-2">
            Address
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className={inputClass()}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Commercial terms</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Tax / registration number
            <input
              value={form.taxNumber}
              onChange={(e) => update("taxNumber", e.target.value)}
              className={inputClass()}
            />
          </label>

          <div />

          <label className="text-sm font-medium text-slate-700">
            Payment terms
            <textarea
              value={form.paymentTerms}
              onChange={(e) => update("paymentTerms", e.target.value)}
              className={`${inputClass()} min-h-28`}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Cancellation terms
            <textarea
              value={form.cancellationTerms}
              onChange={(e) => update("cancellationTerms", e.target.value)}
              className={`${inputClass()} min-h-28`}
            />
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Internal notes
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className={`${inputClass()} min-h-32`}
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : editing ? "Save Supplier" : "Create Supplier"}
        </button>
      </div>
    </form>
  );
}
