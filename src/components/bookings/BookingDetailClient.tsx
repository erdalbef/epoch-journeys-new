"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ON_REQUEST"
  | "WAITLIST"
  | "CANCELLED";

type PaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "REFUNDED";

type Props = {
  booking: {
    id: string;
    bookingReference: string;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    totalPrice: number;
    amountPaid: number;
    amountDue: number;
    currency: string;
  };
};

function isBookingStatus(value: string): value is BookingStatus {
  return (
    value === "PENDING" ||
    value === "CONFIRMED" ||
    value === "ON_REQUEST" ||
    value === "WAITLIST" ||
    value === "CANCELLED"
  );
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return (
    value === "UNPAID" ||
    value === "PARTIALLY_PAID" ||
    value === "PAID" ||
    value === "REFUNDED"
  );
}

export default function BookingDetailClient({ booking }: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    booking.paymentStatus
  );
  const [amountPaid, setAmountPaid] = useState<number>(booking.amountPaid || 0);
  const [loading, setLoading] = useState(false);

  const updateBooking = async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/admin/bookings/${booking.id}/update-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          paymentStatus,
          amountPaid,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!res.ok) {
        throw new Error(data.error || "Update failed");
      }

      alert("Booking updated successfully");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unexpected error occurred";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: booking.currency,
    }).format(value);
  };

  const remainingAmount = Math.max(0, booking.totalPrice - amountPaid);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Booking {booking.bookingReference}
        </h1>
        <p className="text-sm text-gray-500">
          Manage booking status and payments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="booking-status"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Booking Status
          </label>
          <select
            id="booking-status"
            value={status}
            onChange={(e) => {
              const value = e.target.value;
              if (isBookingStatus(value)) {
                setStatus(value);
              }
            }}
            className="w-full rounded-md border p-2"
          >
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ON_REQUEST">On Request</option>
            <option value="WAITLIST">Waitlist</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="payment-status"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Payment Status
          </label>
          <select
            id="payment-status"
            value={paymentStatus}
            onChange={(e) => {
              const value = e.target.value;
              if (isPaymentStatus(value)) {
                setPaymentStatus(value);
              }
            }}
            className="w-full rounded-md border p-2"
          >
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="amount-paid"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Amount Paid
          </label>
          <input
            id="amount-paid"
            type="number"
            min="0"
            step="0.01"
            value={amountPaid}
            onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
            className="w-full rounded-md border p-2"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-lg font-semibold">
            {formatMoney(booking.totalPrice)}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-lg font-semibold">{formatMoney(amountPaid)}</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className="text-lg font-semibold">
            {formatMoney(remainingAmount)}
          </p>
        </div>
      </div>

      <div>
        <button
          onClick={updateBooking}
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}