"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  agentId: string;
  fullName: string | null;
  travelAgency: string | null;
  phone: string | null;
  website: string | null;
  membership: string | null;
  notes: string | null;

  billingCompanyName: string | null;
  billingCompanyRegNo: string | null;
  billingTaxNumber: string | null;
  billingVatNumber: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  billingContactName: string | null;
  billingEmail: string | null;
  billingEmailSecondary: string | null;
  billingPhone: string | null;
};

export function EditAgentForm({
  agentId,
  fullName,
  travelAgency,
  phone,
  website,
  membership,
  notes,
  billingCompanyName,
  billingCompanyRegNo,
  billingTaxNumber,
  billingVatNumber,
  billingAddress,
  billingCity,
  billingState,
  billingPostalCode,
  billingCountry,
  billingContactName,
  billingEmail,
  billingEmailSecondary,
  billingPhone,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    fullName: fullName ?? "",
    travelAgency: travelAgency ?? "",
    phone: phone ?? "",
    website: website ?? "",
    membership: membership ?? "",
    notes: notes ?? "",

    billingCompanyName: billingCompanyName ?? "",
    billingCompanyRegNo: billingCompanyRegNo ?? "",
    billingTaxNumber: billingTaxNumber ?? "",
    billingVatNumber: billingVatNumber ?? "",
    billingAddress: billingAddress ?? "",
    billingCity: billingCity ?? "",
    billingState: billingState ?? "",
    billingPostalCode: billingPostalCode ?? "",
    billingCountry: billingCountry ?? "",
    billingContactName: billingContactName ?? "",
    billingEmail: billingEmail ?? "",
    billingEmailSecondary: billingEmailSecondary ?? "",
    billingPhone: billingPhone ?? "",
  });

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

    setError(null);
    setSaved(false);
  }

  function onSave() {
    setError(null);
    setSaved(false);

    if (!form.billingCompanyName.trim()) {
      setError("Legal company / organization name is required.");
      return;
    }

    if (
      !form.billingAddress.trim() ||
      !form.billingCity.trim() ||
      !form.billingPostalCode.trim() ||
      !form.billingCountry.trim()
    ) {
      setError("Please complete the required billing address fields.");
      return;
    }

    if (!form.billingEmail.trim()) {
      setError("Primary billing email is required.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/agents/${agentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.fullName || null,
          travelAgency: form.travelAgency || null,
          phone: form.phone || null,
          website: form.website || null,
          membership: form.membership || null,
          notes: form.notes || null,

          billingCompanyName: form.billingCompanyName || null,
          billingCompanyRegNo: form.billingCompanyRegNo || null,
          billingTaxNumber: form.billingTaxNumber || null,
          billingVatNumber: form.billingVatNumber || null,
          billingAddress: form.billingAddress || null,
          billingCity: form.billingCity || null,
          billingState: form.billingState || null,
          billingPostalCode: form.billingPostalCode || null,
          billingCountry: form.billingCountry || null,
          billingContactName: form.billingContactName || null,
          billingEmail: form.billingEmail || null,
          billingEmailSecondary: form.billingEmailSecondary || null,
          billingPhone: form.billingPhone || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        setError(
          data?.error
            ? String(data.error)
            : `Failed to save changes (HTTP ${response.status})`,
        );
        return;
      }

      setSaved(true);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Partner Profile
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#001F3F]">
            Contact & Business Information
          </h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Full Name">
            <Input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>

          <Field label="Travel Agency / Organization">
            <Input
              name="travelAgency"
              value={form.travelAgency}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>

          <Field label="Phone">
            <Input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>

          <Field label="Website">
            <Input
              name="website"
              value={form.website}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>

          <Field label="Membership (ASTA / NTA / IATA / CLIA)">
            <Input
              name="membership"
              value={form.membership}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Finance
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#001F3F]">
            Billing & Invoice Details
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            These details can later be used as the partner&apos;s default Bill To
            information for quotations, proformas, invoices, and other commercial
            documents.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Legal Company / Organization Name *">
            <Input
              name="billingCompanyName"
              value={form.billingCompanyName}
              onChange={handleChange}
              disabled={isPending}
              required
            />
          </Field>

          <Field label="Company Registration Number">
            <Input
              name="billingCompanyRegNo"
              value={form.billingCompanyRegNo}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>

          <Field label="Tax Number / Tax ID">
            <Input
              name="billingTaxNumber"
              value={form.billingTaxNumber}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>

          <Field label="VAT Number">
            <Input
              name="billingVatNumber"
              value={form.billingVatNumber}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>

          <Field label="Billing Address *">
            <Input
              name="billingAddress"
              value={form.billingAddress}
              onChange={handleChange}
              disabled={isPending}
              required
            />
          </Field>

          <Field label="City *">
            <Input
              name="billingCity"
              value={form.billingCity}
              onChange={handleChange}
              disabled={isPending}
              required
            />
          </Field>

          <Field label="State / Province">
            <Input
              name="billingState"
              value={form.billingState}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>

          <Field label="Postal / ZIP Code *">
            <Input
              name="billingPostalCode"
              value={form.billingPostalCode}
              onChange={handleChange}
              disabled={isPending}
              required
            />
          </Field>

          <Field label="Country *">
            <Input
              name="billingCountry"
              value={form.billingCountry}
              onChange={handleChange}
              disabled={isPending}
              required
            />
          </Field>

          <Field label="Invoice Contact Person">
            <Input
              name="billingContactName"
              value={form.billingContactName}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>

          <Field label="Primary Billing Email *">
            <Input
              type="email"
              name="billingEmail"
              value={form.billingEmail}
              onChange={handleChange}
              disabled={isPending}
              required
            />
          </Field>

          <Field label="Secondary Billing Email / CC">
            <Input
              type="email"
              name="billingEmailSecondary"
              value={form.billingEmailSecondary}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>

          <Field label="Invoice Phone">
            <Input
              name="billingPhone"
              value={form.billingPhone}
              onChange={handleChange}
              disabled={isPending}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <Field label="Internal Notes">
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className="min-h-28 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#8B0000] focus:ring-4 focus:ring-red-50"
            disabled={isPending}
          />
        </Field>
      </section>

      <section className="rounded-xl border bg-slate-50 p-5">
        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        {saved ? (
          <div
            role="status"
            className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
          >
            Saved successfully.
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Partner Details"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
