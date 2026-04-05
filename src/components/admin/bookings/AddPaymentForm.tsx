"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethod, PaymentRecordStatus } from "@prisma/client";

type AddPaymentFormProps = {
  bookingId: string;
  defaultCurrency?: string;
  disabled?: boolean; // ✅ NEW
};

export default function AddPaymentForm({
  bookingId,
  defaultCurrency = "EUR",
  disabled = false, // ✅ NEW
}: AddPaymentFormProps) {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [status, setStatus] = useState<PaymentRecordStatus>("RECEIVED");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ BLOCK FORM IF FULLY PAID
  if (disabled) {
    return (
      <div className="rounded-xl border bg-gray-50 p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Add Payment
        </h2>
        <p className="text-sm text-gray-600">
          This booking is fully paid. No further payments are required.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(amount),
          currency,
          method,
          status,
          reference,
          paidAt: paidAt || null,
          notes,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to add payment.");
      }

      setSuccess("Payment added successfully.");
      setAmount("");
      setReference("");
      setPaidAt("");
      setNotes("");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Add Payment</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-700"
              placeholder="Enter payment amount"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Currency
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-700"
              placeholder="EUR"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-700"
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="STRIPE">Stripe</option>
              <option value="PAYPAL">PayPal</option>
              <option value="CASH">Cash</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Record Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as PaymentRecordStatus)
              }
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-700"
            >
              <option value="RECEIVED">Received</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Paid Date
            </label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-700"
              placeholder="Bank ref / transaction id"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-25 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-700"
            placeholder="Optional notes"
          />
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Add Payment"}
        </button>
      </form>
    </div>
  );
}