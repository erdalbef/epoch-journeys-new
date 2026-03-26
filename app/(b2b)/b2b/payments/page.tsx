import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

import { formatCurrency } from "@/lib/payments/formatCurrency";
import {
  getSmartPaymentClass,
  getSubmissionStatusClass,
} from "@/lib/payments/paymentBadges";
import {
  getSmartPaymentLabel,
  getSubmissionStatusLabel,
} from "@/lib/payments/paymentStatus";

import PayNowModal from "@/components/b2b/payments/PayNowModal";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getLast6Months() {
  const result: string[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(getMonthKey(d));
  }

  return result;
}

export default async function B2BPaymentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const bookings = await db.booking.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      bookingReference: true,
      bookingDisplayCode: true,
      totalPrice: true,
      amountPaid: true,
      amountDue: true,
      paymentDueDate: true,
      paymentStatus: true,
      commissionAmount: true,
      netAmount: true,
      currency: true,
      createdAt: true,
      departureDateSnapshot: true,
      tourTitleSnapshot: true,
      paymentSubmissions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  const totalSales = bookings.reduce((s, b) => s + b.totalPrice, 0);
  const totalPaid = bookings.reduce((s, b) => s + b.amountPaid, 0);
  const totalDue = bookings.reduce((s, b) => s + b.amountDue, 0);
  const totalCommission = bookings.reduce((s, b) => s + b.commissionAmount, 0);
  const totalNet = bookings.reduce((s, b) => s + b.netAmount, 0);

  const paid = bookings.filter((b) => b.paymentStatus === "PAID").length;
  const partial = bookings.filter(
    (b) => b.paymentStatus === "PARTIALLY_PAID"
  ).length;
  const unpaid = bookings.filter((b) => b.paymentStatus === "UNPAID").length;
  const refunded = bookings.filter((b) => b.paymentStatus === "REFUNDED").length;

  const months = getLast6Months();
  const monthly = new Map<string, number>();

  months.forEach((m) => monthly.set(m, 0));

  bookings.forEach((b) => {
    const key = getMonthKey(new Date(b.createdAt));
    if (monthly.has(key)) {
      monthly.set(key, monthly.get(key)! + b.totalPrice);
    }
  });

  const max = Math.max(...Array.from(monthly.values()), 1);

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">Payments</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track your bookings, submit payments, and download approved receipts.
          </p>
        </div>

        <Link
          href="/b2b/bookings"
          className="rounded-xl bg-[#001F3F] px-4 py-2 text-sm font-medium text-white"
        >
          View Bookings
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card title="Sales" value={totalSales} />
        <Card title="Paid" value={totalPaid} color="green" />
        <Card title="Outstanding" value={totalDue} color="red" />
        <Card title="Commission" value={totalCommission} color="green" />
        <Card title="Net" value={totalNet} />
      </div>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Last 6 Months</h2>

        <div className="flex h-56 items-end gap-3">
          {Array.from(monthly.entries()).map(([key, val]) => {
            const h = Math.max((val / max) * 100, 4);

            return (
              <div key={key} className="flex flex-1 flex-col items-center">
                <div className="mb-2 text-xs">
                  {val > 0 ? formatCurrency(val) : "—"}
                </div>

                <div className="flex h-40 items-end">
                  <div
                    className="w-8 rounded-t bg-[#001F3F]"
                    style={{ height: `${h}%` }}
                  />
                </div>

                <div className="mt-2 text-xs">{key.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard label="Paid" value={paid} color="green" />
        <StatusCard label="Partial" value={partial} color="blue" />
        <StatusCard label="Unpaid" value={unpaid} color="red" />
        <StatusCard label="Refunded" value={refunded} color="slate" />
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Ref</th>
              <th className="p-2 text-left">Tour</th>
              <th className="p-2 text-left">Departure</th>
              <th className="p-2 text-left">Total</th>
              <th className="p-2 text-left">Paid</th>
              <th className="p-2 text-left">Due</th>
              <th className="p-2 text-left">Payment Status</th>
              <th className="p-2 text-left">Submission</th>
              <th className="p-2 text-left">Receipt</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-muted-foreground">
                  No payment records found.
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const paymentLabel = getSmartPaymentLabel(
                  b.paymentStatus,
                  b.amountDue,
                  b.paymentDueDate
                );

                const latestSubmission = b.paymentSubmissions[0];

                return (
                  <tr key={b.id} className="border-t">
                    <td className="p-2">
                      {b.bookingDisplayCode || b.bookingReference}
                    </td>

                    <td className="p-2">{b.tourTitleSnapshot}</td>

                    <td className="p-2">
                      {formatDate(b.departureDateSnapshot)}
                    </td>

                    <td className="p-2">
                      {formatCurrency(b.totalPrice, b.currency)}
                    </td>

                    <td className="p-2 text-green-700">
                      {formatCurrency(b.amountPaid, b.currency)}
                    </td>

                    <td className="p-2 text-red-700">
                      {formatCurrency(b.amountDue, b.currency)}
                    </td>

                    <td className="p-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${getSmartPaymentClass(
                          paymentLabel
                        )}`}
                      >
                        {paymentLabel}
                      </span>
                    </td>

                    <td className="p-2">
                      {latestSubmission ? (
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${getSubmissionStatusClass(
                            latestSubmission.status
                          )}`}
                        >
                          {getSubmissionStatusLabel(latestSubmission.status)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    <td className="p-2">
                      {latestSubmission?.status === "APPROVED" ? (
                        <a
                          href={`/api/b2b/payments/${latestSubmission.id}/receipt`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold text-[#001F3F] transition hover:border-[#8B0000] hover:text-[#8B0000]"
                        >
                          Download Receipt
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    <td className="p-2">
                      {b.amountDue > 0 ? (
                        latestSubmission?.status === "PENDING" ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                            Waiting Approval
                          </span>
                        ) : (
                          <PayNowModal
                            bookingId={b.id}
                            bookingReference={
                              b.bookingDisplayCode || b.bookingReference
                            }
                            amountDue={b.amountDue}
                            currency={b.currency}
                          />
                        )
                      ) : (
                        <span className="text-xs text-gray-400">No action</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color?: "green" | "red";
}) {
  const colorClass =
    color === "green"
      ? "text-green-700"
      : color === "red"
      ? "text-red-700"
      : "";

  return (
    <div className="rounded border bg-white p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-xl font-semibold ${colorClass}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function StatusCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const colorClass =
    color === "green"
      ? "text-green-700"
      : color === "blue"
      ? "text-blue-700"
      : color === "red"
      ? "text-red-700"
      : "text-slate-700";

  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}