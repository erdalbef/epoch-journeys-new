"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BillToData = {
  recipientName: string;
  recipientCompany: string;
  recipientEmail: string;
  recipientEmailSecondary: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPostalCode: string;
  recipientCountry: string;
  recipientTaxNumber: string;
  recipientVatNumber: string;
};

type BillToOption = BillToData & {
  key: string;
  label: string;
};

type BookingOption = {
  id: string;
  bookingReference: string;
  groupName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  agencyNameSnapshot: string | null;
  currency: string;
  netAmount: number;
  amountPaid: number;
  tourTitleSnapshot: string;
  departureDateSnapshot: string;
  billTo: BillToData;
};

type Line = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

const emptyBillTo: BillToData = {
  recipientName: "",
  recipientCompany: "",
  recipientEmail: "",
  recipientEmailSecondary: "",
  recipientAddress: "",
  recipientCity: "",
  recipientPostalCode: "",
  recipientCountry: "",
  recipientTaxNumber: "",
  recipientVatNumber: "",
};

export default function SalesDocumentForm({
  bookings,
  billToOptions,
}: {
  bookings: BookingOption[];
  billToOptions: BillToOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState("PROFORMA");
  const [bookingId, setBookingId] = useState("");
  const [billToProfileKey, setBillToProfileKey] = useState("");
  const [saveBillingProfile, setSaveBillingProfile] = useState(true);
  const [billTo, setBillTo] = useState<BillToData>(emptyBillTo);
  const [amountPaid, setAmountPaid] = useState(0);
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [serviceDescriptionEn, setServiceDescriptionEn] = useState(
    "Pilgrimage land arrangements including accommodation, transportation, licensed guides, entrance fees and operational services.",
  );
  const [serviceDescriptionBg, setServiceDescriptionBg] = useState(
    "Поклонническа програма, включваща хотелско настаняване, транспорт, лицензиран екскурзовод, входни такси и организационно обслужване.",
  );
  const [vatEn, setVatEn] = useState(
    "VAT not charged according to Article 21 of the Bulgarian VAT Act (Reverse Charge).",
  );
  const [vatBg, setVatBg] = useState(
    "Основание за неначисляване на ДДС: чл.21 от Закона за ДДС – Обратно начисляване.",
  );
  const [paymentEn, setPaymentEn] = useState(
    "Please include the document number and booking reference in the bank transfer.",
  );
  const [paymentBg, setPaymentBg] = useState(
    "Моля посочете номера на документа и референтния номер на резервацията при банковия превод.",
  );
  const [lines, setLines] = useState<Line[]>([
    { description: "Land arrangements", quantity: 1, unitPrice: 0, taxRate: 0 },
  ]);

  const selected = useMemo(
    () => bookings.find((booking) => booking.id === bookingId),
    [bookings, bookingId],
  );

  const total = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice * (1 + line.taxRate / 100),
    0,
  );

  function applyBillTo(data: BillToData) {
    setBillTo(data);
  }

  function selectBillToProfile(key: string) {
    setBillToProfileKey(key);
    const profile = billToOptions.find((option) => option.key === key);
    if (profile) {
      applyBillTo(profile);
    }
  }

  function selectBooking(id: string) {
    setBookingId(id);
    const booking = bookings.find((option) => option.id === id);

    if (!booking) {
      setAmountPaid(0);
      return;
    }

    applyBillTo(booking.billTo);
    setAmountPaid(booking.amountPaid);
    setLines([
      {
        description: `${booking.tourTitleSnapshot} - Land Arrangements`,
        quantity: 1,
        unitPrice: booking.netAmount,
        taxRate: 0,
      },
    ]);
  }

  function updateBillTo<K extends keyof BillToData>(key: K, value: BillToData[K]) {
    setBillTo((current) => ({ ...current, [key]: value }));
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, currentIndex) =>
        currentIndex === index ? { ...line, ...patch } : line,
      ),
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);

    const payload = {
      type,
      bookingId: bookingId || null,
      billToProfileKey: billToProfileKey || null,
      saveBillingProfile,
      ...billTo,
      amountPaid: bookingId ? undefined : amountPaid,
      dueDate: form.get("dueDate") || null,
      serviceDescriptionEn,
      serviceDescriptionBg,
      vatEn,
      vatBg,
      paymentEn,
      paymentBg,
      additionalNotes: additionalNotes || null,
      items: lines,
    };

    const response = await fetch("/api/admin/finance/sales-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(data?.error || "Could not create sales document.");
      return;
    }

    router.push(`/admin/finance/sales-documents/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#001F3F]">Document & Booking</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Document Type
            <select
              className={inputClass}
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="PROFORMA">Proforma Invoice</option>
              <option value="INVOICE">Invoice</option>
              <option value="CREDIT_NOTE">Credit Note</option>
            </select>
          </label>

          <label className={labelClass}>
            Select Booking (optional)
            <select
              className={inputClass}
              value={bookingId}
              onChange={(event) => selectBooking(event.target.value)}
            >
              <option value="">No booking / manual document</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.bookingReference} — {booking.groupName || booking.tourTitleSnapshot}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Due Date
            <input name="dueDate" type="date" className={inputClass} />
          </label>

          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            {selected ? (
              <>
                <strong>{selected.bookingReference}</strong>
                <div className="mt-1">
                  Booking total: {selected.currency} {selected.netAmount.toFixed(2)} · Paid: {selected.currency} {selected.amountPaid.toFixed(2)}
                </div>
              </>
            ) : (
              "Choose a booking above to prefill Bill To, tour item and paid deposit."
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#001F3F]">Bill To / Получател</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a registered agent/company or enter the billing details manually.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={`${labelClass} md:col-span-2`}>
            Bill To Profile
            <select
              className={inputClass}
              value={billToProfileKey}
              onChange={(event) => selectBillToProfile(event.target.value)}
            >
              <option value="">Manual / do not use saved profile</option>
              {billToOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Recipient / Contact Name *
            <input
              className={inputClass}
              value={billTo.recipientName}
              onChange={(event) => updateBillTo("recipientName", event.target.value)}
              required
            />
          </label>

          <label className={labelClass}>
            Company / Legal Name
            <input
              className={inputClass}
              value={billTo.recipientCompany}
              onChange={(event) => updateBillTo("recipientCompany", event.target.value)}
            />
          </label>

          <label className={labelClass}>
            Primary Billing Email
            <input
              type="email"
              className={inputClass}
              value={billTo.recipientEmail}
              onChange={(event) => updateBillTo("recipientEmail", event.target.value)}
            />
          </label>

          <label className={labelClass}>
            Secondary Billing Email / CC
            <input
              type="email"
              className={inputClass}
              value={billTo.recipientEmailSecondary}
              onChange={(event) => updateBillTo("recipientEmailSecondary", event.target.value)}
            />
          </label>

          <label className={labelClass}>
            Address
            <input
              className={inputClass}
              value={billTo.recipientAddress}
              onChange={(event) => updateBillTo("recipientAddress", event.target.value)}
            />
          </label>

          <label className={labelClass}>
            City
            <input
              className={inputClass}
              value={billTo.recipientCity}
              onChange={(event) => updateBillTo("recipientCity", event.target.value)}
            />
          </label>

          <label className={labelClass}>
            Postal Code
            <input
              className={inputClass}
              value={billTo.recipientPostalCode}
              onChange={(event) => updateBillTo("recipientPostalCode", event.target.value)}
            />
          </label>

          <label className={labelClass}>
            Country
            <input
              className={inputClass}
              value={billTo.recipientCountry}
              onChange={(event) => updateBillTo("recipientCountry", event.target.value)}
            />
          </label>

          <label className={labelClass}>
            Tax / Company ID
            <input
              className={inputClass}
              value={billTo.recipientTaxNumber}
              onChange={(event) => updateBillTo("recipientTaxNumber", event.target.value)}
            />
          </label>

          <label className={labelClass}>
            VAT Number
            <input
              className={inputClass}
              value={billTo.recipientVatNumber}
              onChange={(event) => updateBillTo("recipientVatNumber", event.target.value)}
            />
          </label>

          {billToProfileKey && (
            <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
              <input
                type="checkbox"
                checked={saveBillingProfile}
                onChange={(event) => setSaveBillingProfile(event.target.checked)}
              />
              Save these Bill To details back to the selected registered profile for future invoices.
            </label>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#001F3F]">Payments</h2>
        <p className="mt-1 text-sm text-slate-500">
          When a booking is selected, Paid / Deposit Received comes from the booking automatically.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Paid / Deposit Received
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={amountPaid}
              disabled={Boolean(bookingId)}
              onChange={(event) => setAmountPaid(Number(event.target.value))}
            />
          </label>

          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            Current balance due: {(selected?.currency || "EUR")} {Math.max(0, total - amountPaid).toFixed(2)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#001F3F]">Line Items</h2>
          <button
            type="button"
            className={secondaryButton}
            onClick={() =>
              setLines([
                ...lines,
                { description: "", quantity: 1, unitPrice: 0, taxRate: 0 },
              ])
            }
          >
            + Add Item
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-slate-200 p-3 lg:grid-cols-[1fr_110px_150px_110px_90px]"
            >
              <input
                className={inputClass}
                placeholder="Description"
                value={line.description}
                onChange={(event) => updateLine(index, { description: event.target.value })}
                required
              />
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={line.quantity}
                onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })}
              />
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={line.unitPrice}
                onChange={(event) => updateLine(index, { unitPrice: Number(event.target.value) })}
              />
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={line.taxRate}
                onChange={(event) => updateLine(index, { taxRate: Number(event.target.value) })}
              />
              <button
                type="button"
                className="text-sm font-semibold text-red-700"
                onClick={() => setLines(lines.filter((_, currentIndex) => currentIndex !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 text-right text-lg font-bold text-[#001F3F]">
          Draft Total: {selected?.currency || "EUR"} {total.toFixed(2)}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#001F3F]">Bilingual Invoice Text</h2>
        <p className="mt-1 text-sm text-slate-500">
          These fields remain easy to rewrite before the document is issued.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TextArea label="Service Description — English" value={serviceDescriptionEn} setValue={setServiceDescriptionEn} />
          <TextArea label="Описание на услугата — Български" value={serviceDescriptionBg} setValue={setServiceDescriptionBg} />
          <TextArea label="VAT Note — English" value={vatEn} setValue={setVatEn} />
          <TextArea label="ДДС — Български" value={vatBg} setValue={setVatBg} />
          <TextArea label="Payment Reference — English" value={paymentEn} setValue={setPaymentEn} />
          <TextArea label="Основание за плащане — Български" value={paymentBg} setValue={setPaymentBg} />

          <label className={`${labelClass} lg:col-span-2`}>
            Additional Information / Допълнителна информация
            <textarea
              className={`${inputClass} min-h-24 py-3`}
              value={additionalNotes}
              onChange={(event) => setAdditionalNotes(event.target.value)}
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          disabled={busy || lines.length === 0}
          className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save Draft"}
        </button>
      </div>
    </form>
  );
}

function TextArea({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <label className={labelClass}>
      {label}
      <textarea
        className={`${inputClass} min-h-28 py-3`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </label>
  );
}

const labelClass = "text-sm font-semibold text-slate-700";
const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#8B0000] focus:ring-4 focus:ring-red-50 disabled:bg-slate-100 disabled:text-slate-500";
const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#8B0000] hover:text-[#8B0000]";
