"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  payoutId: string;
  status: string;
};

export function MarkPayoutPaidButton({ payoutId, status }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [notes, setNotes] = useState("");

  if (status === "PAID") {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        Paid
      </span>
    );
  }

  if (status === "CANCELLED") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
        Cancelled
      </span>
    );
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/pay`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentReference,
          paymentMethod,
          notes,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Failed to mark payout as paid."
        );
        return;
      }

      setOpen(false);
      setPaymentReference("");
      setPaymentMethod("BANK_TRANSFER");
      setNotes("");
      router.refresh();
    } catch (err) {
      console.error("MARK_PAYOUT_PAID_CLIENT_ERROR", err);
      setError("Unexpected error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          Mark as Paid
        </button>
      ) : (
        <div className="min-w-65 space-y-3 rounded-md border bg-white p-3 shadow-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              disabled={isSubmitting}
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="WIRE">Wire</option>
              <option value="PAYPAL">PayPal</option>
              <option value="CASH">Cash</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Payment Reference</label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Wire ref / bank ref / note"
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional internal note"
              rows={3}
              className="w-full rounded-md border px-2 py-1.5 text-xs"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Confirm Paid"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (isSubmitting) return;
                setOpen(false);
                setError(null);
              }}
              disabled={isSubmitting}
              className="rounded-md border px-3 py-1.5 text-xs font-medium"
            >
              Cancel
            </button>
          </div>

          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      )}
    </div>
  );
}