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

export default function BookingDetailClient({ booking }: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    booking.paymentStatus
  );
  const [amountPaid, setAmountPaid] = useState<number>(
    booking.amountPaid || 0
  );

  const [loading, setLoading] = useState(false);

  const updateBooking = async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/bookings/${booking.id}/update`, {
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Update failed");
      }

      alert("Booking updated successfully");
      router.refresh();
    } catch (err: unknown) {
      alert((err as Error).message);
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Booking {booking.bookingReference}
        </h1>
        <p className="text-sm text-gray-500">
          Manage booking status and payments
        </p>
      </div>

      {/* STATUS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Booking Status</label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as BookingStatus)
            }
            className="w-full border rounded-md p-2 mt-1"
          >
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ON_REQUEST">On Request</option>
            <option value="WAITLIST">Waitlist</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Payment Status</label>
          <select
            value={paymentStatus}
            onChange={(e) =>
              setPaymentStatus(e.target.value as PaymentStatus)
            }
            className="w-full border rounded-md p-2 mt-1"
          >
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Amount Paid</label>
          <input
            type="number"
            value={amountPaid}
            onChange={(e) => setAmountPaid(Number(e.target.value))}
            className="w-full border rounded-md p-2 mt-1"
          />
        </div>
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border p-4 rounded-lg">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-lg font-semibold">
            {formatMoney(booking.totalPrice)}
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-lg font-semibold">
            {formatMoney(amountPaid)}
          </p>
        </div>

        <div className="border p-4 rounded-lg">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className="text-lg font-semibold">
            {formatMoney(booking.totalPrice - amountPaid)}
          </p>
        </div>
      </div>

      {/* ACTION */}
      <div>
        <button
          onClick={updateBooking}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}