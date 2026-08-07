"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  type: string;
};

type Rate = {
  id: string;
  serviceId: string | null;
  name: string;
  amount: string;
  currency: string;
  unit: string;
};

type Supplier = {
  id: string;
  name: string;
  defaultCurrency: string;
  services: Service[];
  rates: Rate[];
};

type Tour = {
  id: string;
  title: string;
  departureDates: Array<{
    id: string;
    date: string;
  }>;
};

type Booking = {
  id: string;
  bookingReference: string;
  bookingDisplayCode: string | null;
  tourTitleSnapshot: string;
};

export default function SupplierPayableForm({
  suppliers,
  tours,
  bookings,
}: {
  suppliers: Supplier[];
  tours: Tour[];
  bookings: Booking[];
}) {
  const router = useRouter();

  const [supplierId, setSupplierId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [rateId, setRateId] = useState("");
  const [tourId, setTourId] = useState("");
  const [departureDateId, setDepartureDateId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [contractedAmount, setContractedAmount] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [creditAmount, setCreditAmount] = useState("0");
  const [loading, setLoading] = useState(false);

  const supplier = suppliers.find((item) => item.id === supplierId);
  const selectedTour = tours.find((item) => item.id === tourId);

  const services = supplier?.services ?? [];

  const rates =
    supplier?.rates.filter(
      (rate) => !serviceId || !rate.serviceId || rate.serviceId === serviceId,
    ) ?? [];

  const balancePreview = useMemo(() => {
    const approved = Number(approvedAmount || 0);
    const credit = Number(creditAmount || 0);
    return Math.max(0, approved - credit);
  }, [approvedAmount, creditAmount]);

  function chooseSupplier(value: string) {
    setSupplierId(value);
    setServiceId("");
    setRateId("");

    const selected = suppliers.find((item) => item.id === value);
    if (selected) setCurrency(selected.defaultCurrency || "EUR");
  }

  function chooseRate(value: string) {
    setRateId(value);

    const selected = rates.find((item) => item.id === value);
    if (!selected) return;

    setCurrency(selected.currency);
    setContractedAmount(selected.amount);

    if (!approvedAmount) {
      setApprovedAmount(selected.amount);
    }

    if (selected.serviceId) {
      setServiceId(selected.serviceId);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/admin/supplier-payables", {
        method: "POST",
        body: form,
      });

      const data = (await response.json()) as {
        error?: string;
        payable?: { id: string };
      };

      if (!response.ok || !data.payable?.id) {
        throw new Error(data.error || "Failed to create supplier payable.");
      }

      router.push(`/admin/supplier-payables/${data.payable.id}`);
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create supplier payable.",
      );
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FieldLabel label="Supplier *">
          <select
            name="supplierId"
            required
            value={supplierId}
            onChange={(event) => chooseSupplier(event.target.value)}
            className="input"
          >
            <option value="">Select supplier...</option>
            {suppliers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Service">
          <select
            name="serviceId"
            value={serviceId}
            onChange={(event) => {
              setServiceId(event.target.value);
              setRateId("");
            }}
            disabled={!supplierId}
            className="input"
          >
            <option value="">General supplier service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Contracted rate">
          <select
            name="rateId"
            value={rateId}
            onChange={(event) => chooseRate(event.target.value)}
            disabled={!supplierId}
            className="input"
          >
            <option value="">No rate / manual cost</option>
            {rates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.name} · {rate.currency} {rate.amount} /{" "}
                {rate.unit.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Currency *">
          <input
            name="currency"
            required
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            maxLength={3}
            className="input"
          />
        </FieldLabel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FieldLabel label="Contracted amount">
          <input
            name="contractedAmount"
            type="number"
            min="0"
            step="0.01"
            value={contractedAmount}
            onChange={(event) => setContractedAmount(event.target.value)}
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Approved amount *">
          <input
            name="approvedAmount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={approvedAmount}
            onChange={(event) => setApprovedAmount(event.target.value)}
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Credit / reduction">
          <input
            name="creditAmount"
            type="number"
            min="0"
            step="0.01"
            value={creditAmount}
            onChange={(event) => setCreditAmount(event.target.value)}
            className="input"
          />
        </FieldLabel>
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Initial balance after credit
        </p>
        <p className="mt-1 text-2xl font-bold text-[#001F3F]">
          {currency} {balancePreview.toFixed(2)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldLabel label="Payable title *">
          <input
            name="title"
            required
            placeholder="e.g. Rome Hotel – May 2027 group"
            className="input"
          />
        </FieldLabel>

        <FieldLabel label="Supplier invoice number">
          <input name="supplierInvoiceNumber" className="input" />
        </FieldLabel>

        <FieldLabel label="Supplier reference">
          <input name="supplierReference" className="input" />
        </FieldLabel>

        <FieldLabel label="Invoice date">
          <input name="invoiceDate" type="date" className="input" />
        </FieldLabel>

        <FieldLabel label="Due date">
          <input name="dueDate" type="date" className="input" />
        </FieldLabel>

        <FieldLabel label="Invoice / document URL">
          <input
            name="documentUrl"
            placeholder="/uploads/... or document link"
            className="input"
          />
        </FieldLabel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FieldLabel label="Tour">
          <select
            name="tourId"
            value={tourId}
            onChange={(event) => {
              setTourId(event.target.value);
              setDepartureDateId("");
            }}
            className="input"
          >
            <option value="">Not linked to a tour</option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.title}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Departure">
          <select
            name="departureDateId"
            value={departureDateId}
            onChange={(event) => setDepartureDateId(event.target.value)}
            disabled={!tourId}
            className="input"
          >
            <option value="">Not linked to a departure</option>
            {selectedTour?.departureDates.map((departure) => (
              <option key={departure.id} value={departure.id}>
                {new Date(departure.date).toLocaleDateString("en-GB")}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Booking">
          <select
            name="bookingId"
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
            className="input"
          >
            <option value="">Not linked to a booking</option>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.bookingDisplayCode || booking.bookingReference} ·{" "}
                {booking.tourTitleSnapshot}
              </option>
            ))}
          </select>
        </FieldLabel>
      </div>

      <FieldLabel label="Description">
        <textarea name="description" rows={3} className="input py-2" />
      </FieldLabel>

      <FieldLabel label="Internal notes">
        <textarea name="internalNotes" rows={4} className="input py-2" />
      </FieldLabel>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Payable"}
        </button>

        <button
          name="submitForApproval"
          value="true"
          disabled={loading}
          className="rounded-xl bg-[#001F3F] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Create & Submit for Approval
        </button>
      </div>

      <style jsx>{`
        .input {
          height: 44px;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding-left: 0.75rem;
          padding-right: 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        textarea.input {
          height: auto;
        }
        .input:focus {
          border-color: #001f3f;
        }
        .input:disabled {
          background: rgb(248 250 252);
          color: rgb(148 163 184);
        }
      `}</style>
    </form>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
