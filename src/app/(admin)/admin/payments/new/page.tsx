import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | null) {
  if (!value) return "Date TBC";

  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminNewPaymentPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const bookings = await db.booking.findMany({
    where: {
      amountDue: {
        gt: 0,
      },
      status: {
        not: "CANCELLED",
      },
    },
    orderBy: [
      {
        paymentDueDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      id: true,
      bookingReference: true,
      bookingDisplayCode: true,
      tourTitleSnapshot: true,
      agencyNameSnapshot: true,
      agentNameSnapshot: true,
      customerName: true,
      totalPrice: true,
      amountPaid: true,
      amountDue: true,
      currency: true,
      paymentStatus: true,
      paymentDueDate: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#001F3F]">
            Record Customer Payment
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Select the booking that received the payment; the booking page will
            open directly at its controlled payment-recording section.
          </p>
        </div>

        <Link
          href="/admin/payments"
          className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Payments
        </Link>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="font-semibold text-[#001F3F]">
            Open Booking Balances
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Only bookings with an outstanding customer balance are shown.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Booking</th>
                <th className="px-4 py-3 text-left">Partner / Customer</th>
                <th className="px-4 py-3 text-left">Next Due</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-left">Payment Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No bookings currently have an outstanding balance.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const bookingRef =
                    booking.bookingDisplayCode ||
                    booking.bookingReference;

                  const party =
                    booking.agencyNameSnapshot ||
                    booking.agentNameSnapshot ||
                    booking.customerName ||
                    "-";

                  return (
                    <tr
                      key={booking.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#001F3F]">
                          {bookingRef}
                        </div>

                        <div className="mt-1 max-w-64 truncate text-xs text-slate-500">
                          {booking.tourTitleSnapshot}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {party}
                      </td>

                      <td className="px-4 py-3">
                        {formatDate(booking.paymentDueDate)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatCurrency(
                          booking.totalPrice,
                          booking.currency,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {formatCurrency(
                          booking.amountPaid,
                          booking.currency,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(
                          booking.amountDue,
                          booking.currency,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {booking.paymentStatus.replaceAll("_", " ")}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/bookings/${booking.id}#record-payment`}
                          className="inline-flex rounded-lg bg-[#8B0000] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6f0000]"
                        >
                          Record Payment
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
