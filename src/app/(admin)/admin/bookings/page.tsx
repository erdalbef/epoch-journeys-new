import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Booking } from "@prisma/client";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFinancialStatus(booking: Booking) {
  const now = new Date();

  if (booking.amountPaid === 0) {
    if (booking.paymentDueDate && booking.paymentDueDate < now) {
      return "OVERDUE";
    }
    return "UNPAID";
  }

  if (booking.amountPaid < booking.totalPrice) {
    if (booking.paymentDueDate && booking.paymentDueDate < now) {
      return "OVERDUE";
    }
    return "PARTIAL";
  }

  return "PAID";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-800";
    case "PARTIAL":
      return "bg-amber-100 text-amber-800";
    case "UNPAID":
      return "bg-red-100 text-red-800";
    case "OVERDUE":
      return "bg-red-200 text-red-900 font-semibold";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default async function AdminBookingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const bookings = await db.booking.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalSales = bookings.reduce((sum, booking) => {
    return sum + booking.totalPrice;
  }, 0);

  const totalCommission = bookings.reduce((sum, booking) => {
    return sum + booking.commissionAmount;
  }, 0);

  const totalNet = bookings.reduce((sum, booking) => {
    return sum + booking.netAmount;
  }, 0);

  const totalOutstanding = bookings.reduce((sum, booking) => {
    return sum + (booking.totalPrice - booking.amountPaid);
  }, 0);

  return (
    <div className="mx-auto max-w-7xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Bookings</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Sales</p>
          <p className="text-xl font-bold">
            {formatCurrency(totalSales)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Commission</p>
          <p className="text-xl font-bold">
            {formatCurrency(totalCommission)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Net</p>
          <p className="text-xl font-bold">
            {formatCurrency(totalNet)}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-xl font-bold text-red-700">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Ref</th>
              <th className="p-3">Tour</th>
              <th className="p-3">Guests</th>
              <th className="p-3">Departure</th>
              <th className="p-3">Total</th>
              <th className="p-3">Commission</th>
              <th className="p-3">Net</th>
              <th className="p-3">Due</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {bookings.map((booking) => {
              const financialStatus = getFinancialStatus(booking);
              const due = booking.totalPrice - booking.amountPaid;

              return (
                <tr key={booking.id} className="border-t">
                  <td className="p-3">{booking.bookingReference}</td>

                  <td className="p-3">{booking.tourTitleSnapshot}</td>

                  <td className="p-3">{booking.numberOfGuests}</td>

                  <td className="p-3">
                    {formatDate(booking.departureDateSnapshot)}
                  </td>

                  <td className="p-3">
                    {formatCurrency(booking.totalPrice, booking.currency)}
                  </td>

                  <td className="p-3 text-green-700">
                    {formatCurrency(
                      booking.commissionAmount,
                      booking.currency
                    )}
                  </td>

                  <td className="p-3 font-medium">
                    {formatCurrency(booking.netAmount, booking.currency)}
                  </td>

                  <td className="p-3 text-red-700">
                    {formatCurrency(due, booking.currency)}
                  </td>

                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-1 text-xs ${getStatusBadge(
                        financialStatus
                      )}`}
                    >
                      {financialStatus}
                    </span>
                  </td>

                  <td className="p-3">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="rounded bg-black px-3 py-1 text-xs text-white"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}

            {bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="p-6 text-center text-sm text-gray-500"
                >
                  No bookings found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}