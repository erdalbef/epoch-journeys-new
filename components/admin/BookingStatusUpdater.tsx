"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  bookingId: string;
  currentStatus: string;
  currentPayment: string;
};

export default function BookingStatusUpdater({
  bookingId,
  currentStatus,
  currentPayment,
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState(currentPayment);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    try {
      setIsSaving(true);
      setMessage(null);

      const response = await fetch(
        `/api/admin/bookings/${bookingId}/update-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            paymentStatus,
          }),
        }
      );

      const data = (await response.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok) {
        setMessage(data.error ?? "Update failed.");
        return;
      }

      setMessage("Booking updated successfully.");

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage("Something went wrong while updating the booking.");
    } finally {
      setIsSaving(false);
    }
  }

  const disabled = isSaving || isPending;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="bookingStatus"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Booking Status
          </label>
          <select
            id="bookingStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={disabled}
            className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="ON_REQUEST">ON REQUEST</option>
            <option value="WAITLIST">WAITLIST</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="paymentStatus"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Payment Status
          </label>
          <select
            id="paymentStatus"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            disabled={disabled}
            className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="UNPAID">UNPAID</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PAID">PAID</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled}
          className="rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving || isPending ? "Saving..." : "Save Changes"}
        </button>

        {message ? (
          <p
            className={`text-sm ${
              message.toLowerCase().includes("success")
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}