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

function paymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "PARTIALLY_PAID":
      return "Partially Paid";
    case "PAID":
      return "Paid";
    case "REFUNDED":
      return "Refunded";
    default:
      return "Unpaid";
  }
}

function paymentStatusClass(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "border-green-200 bg-green-50 text-green-800";
    case "PARTIALLY_PAID":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "REFUNDED":
      return "border-slate-300 bg-slate-100 text-slate-700";
    default:
      return "border-red-200 bg-red-50 text-red-800";
  }
}

export default function BookingDetailClient({ booking }: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [loading, setLoading] = useState(false);

  const updateBooking = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/admin/bookings/${booking.id}/update-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        },
      );

      const data = (await res.json().catch(() => null)) as
        | {
            error?: string;
            success?: boolean;
          }
        | null;

      if (!res.ok) {
        throw new Error(data?.error || "Update failed");
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

  const remainingAmount = Math.max(
    0,
    booking.amountDue ?? booking.totalPrice - booking.amountPaid,
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Booking {booking.bookingReference}
        </h1>

        <p className="text-sm text-gray-500">
          Manage booking status; payment information is controlled by recorded
          customer receipts.
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
          <p className="mb-2 block text-sm font-medium text-gray-700">
            Payment Status
          </p>

          <div
            className={`flex h-[42px] items-center rounded-md border px-3 text-sm font-semibold ${paymentStatusClass(
              booking.paymentStatus,
            )}`}
          >
            {paymentStatusLabel(booking.paymentStatus)}
          </div>

          <p className="mt-1.5 text-xs text-gray-500">
            Updated automatically from recorded customer payments.
          </p>
        </div>

        <div>
          <p className="mb-2 block text-sm font-medium text-gray-700">
            Amount Paid
          </p>

          <div className="flex h-[42px] items-center rounded-md border bg-gray-50 px-3 text-sm font-semibold text-gray-900">
            {formatMoney(booking.amountPaid)}
          </div>

          <p className="mt-1.5 text-xs text-gray-500">
            Record new receipts using the Record Payment section below.
          </p>
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
          <p className="text-lg font-semibold">
            {formatMoney(booking.amountPaid)}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className="text-lg font-semibold">
            {formatMoney(remainingAmount)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        Payment Status and Amount Paid are read-only here to protect the finance
        record; use <strong>Record Customer Payment</strong> to register money
        actually received and allocate it to the payment schedule.
      </div>

      <div>
        <button
          onClick={updateBooking}
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Save Booking Status"}
        </button>
      </div>
    </div>
  );
}
