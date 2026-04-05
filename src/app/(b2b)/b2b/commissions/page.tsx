import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import CommissionsCharts from "@/components/b2b/CommissionsCharts";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type SearchParams = Promise<{
  search?: string;
  bookingStatus?: string;
  paymentStatus?: string;
  lockState?: string;
  payoutStatus?: string;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
}>;

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildQueryString(
  params: Record<string, string | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function bookingStatusClasses(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700";
    case "QUOTED":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function paymentStatusClasses(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "PARTIAL":
      return "bg-blue-100 text-blue-700";
    case "UNPAID":
      return "bg-amber-100 text-amber-700";
    case "REFUNDED":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function payoutStatusClasses(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "APPROVED":
      return "bg-blue-100 text-blue-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getDefaultDateRange() {
  const today = new Date();
  const last30 = new Date();
  last30.setDate(today.getDate() - 30);

  return {
    dateFrom: last30.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
  };
}

function getThisMonthDateRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    dateFrom: first.toISOString().slice(0, 10),
    dateTo: last.toISOString().slice(0, 10),
  };
}

function getLastDaysRange(days: number) {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - days);

  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
  };
}

function getMonthKey(date: Date | string) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

type ChartBarData = {
  month: string;
  amount: number;
};

type PieData = {
  name: string;
  value: number;
};

export default async function B2BCommissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "AGENT") {
    redirect("/agent-signin");
  }

  const resolvedSearchParams = await searchParams;
  const defaults = getDefaultDateRange();

  const search = resolvedSearchParams.search ?? "";
  const bookingStatus = resolvedSearchParams.bookingStatus ?? "";
  const paymentStatus = resolvedSearchParams.paymentStatus ?? "";
  const lockState = resolvedSearchParams.lockState ?? "";
  const payoutStatus = resolvedSearchParams.payoutStatus ?? "";
  const method = resolvedSearchParams.method ?? "";
  const dateFrom = resolvedSearchParams.dateFrom ?? defaults.dateFrom;
  const dateTo = resolvedSearchParams.dateTo ?? defaults.dateTo;

  const bookings = await db.booking.findMany({
    where: {
      userId: session.user.id,
      ...(search
        ? {
            OR: [
              {
                bookingReference: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                tour: {
                  title: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
      ...(bookingStatus ? { status: bookingStatus as never } : {}),
      ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
      ...(lockState === "LOCKED"
        ? {
            payoutId: {
              not: null,
            },
          }
        : {}),
      ...(lockState === "UNLOCKED"
        ? {
            payoutId: null,
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      bookingReference: true,
      status: true,
      paymentStatus: true,
      grossAmount: true,
      commissionAmount: true,
      netAmount: true,
      currency: true,
      createdAt: true,
      payoutId: true,
      tour: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const payouts = await db.partnerPayout.findMany({
    where: {
      agentId: session.user.id,
      ...(payoutStatus ? { status: payoutStatus as never } : {}),
      ...(method ? { paymentMethod: method } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      totalAmount: true,
      currency: true,
      status: true,
      paymentMethod: true,
      paymentReference: true,
      createdAt: true,
      approvedAt: true,
      paidAt: true,
      lockedAt: true,
      bookings: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalGross = bookings.reduce((sum, booking) => sum + booking.grossAmount, 0);
  const totalCommission = bookings.reduce(
    (sum, booking) => sum + (booking.commissionAmount ?? 0),
    0
  );
  const totalNet = bookings.reduce((sum, booking) => sum + booking.netAmount, 0);

  const totalPaidOut = payouts
    .filter((payout) => payout.status === "PAID")
    .reduce((sum, payout) => sum + payout.totalAmount, 0);

  const pendingPayouts = payouts
    .filter((payout) => payout.status === "PENDING" || payout.status === "APPROVED")
    .reduce((sum, payout) => sum + payout.totalAmount, 0);

  const bookingExportHref = `/api/b2b/commissions/bookings/export${buildQueryString({
    search,
    bookingStatus,
    paymentStatus,
    lockState,
    dateFrom,
    dateTo,
  })}`;

  const payoutExportHref = `/api/b2b/commissions/payouts/export${buildQueryString({
    payoutStatus,
    method,
    dateFrom,
    dateTo,
  })}`;

  const baseFilterParams = {
    search,
    bookingStatus,
    paymentStatus,
    lockState,
    payoutStatus,
    method,
  };

  const last7 = getLastDaysRange(7);
  const last30 = getLastDaysRange(30);
  const thisMonth = getThisMonthDateRange();

  const quickFilterLinks = [
    {
      label: "Last 7 Days",
      href: `/b2b/commissions${buildQueryString({
        ...baseFilterParams,
        dateFrom: last7.dateFrom,
        dateTo: last7.dateTo,
      })}`,
    },
    {
      label: "Last 30 Days",
      href: `/b2b/commissions${buildQueryString({
        ...baseFilterParams,
        dateFrom: last30.dateFrom,
        dateTo: last30.dateTo,
      })}`,
    },
    {
      label: "This Month",
      href: `/b2b/commissions${buildQueryString({
        ...baseFilterParams,
        dateFrom: thisMonth.dateFrom,
        dateTo: thisMonth.dateTo,
      })}`,
    },
    {
      label: "All Time",
      href: `/b2b/commissions${buildQueryString({
        search,
        bookingStatus,
        paymentStatus,
        lockState,
        payoutStatus,
        method,
      })}`,
    },
  ];

  const bookingChartMap = new Map<string, number>();
  for (const booking of bookings) {
    const key = getMonthKey(booking.createdAt);
    bookingChartMap.set(
      key,
      (bookingChartMap.get(key) ?? 0) + (booking.commissionAmount ?? 0)
    );
  }

  const bookingChartData: ChartBarData[] = Array.from(bookingChartMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({
      month: getMonthLabel(key),
      amount: Number(amount.toFixed(2)),
    }));

  const payoutChartMap = new Map<string, number>();
  for (const payout of payouts) {
    const key = getMonthKey(payout.createdAt);
    payoutChartMap.set(key, (payoutChartMap.get(key) ?? 0) + payout.totalAmount);
  }

  const payoutChartData: ChartBarData[] = Array.from(payoutChartMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({
      month: getMonthLabel(key),
      amount: Number(amount.toFixed(2)),
    }));

  const payoutPieData: PieData[] = [
    { name: "Paid", value: Number(totalPaidOut.toFixed(2)) },
    { name: "Pending / Approved", value: Number(pendingPayouts.toFixed(2)) },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Commissions
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Review booking-based earnings and payout history.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={bookingExportHref}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Export Booking Earnings CSV
          </Link>

          <Link
            href={payoutExportHref}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Export Payout History CSV
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Gross Bookings</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalGross)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Commission</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalCommission)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Net Amount</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalNet)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Paid Out</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(totalPaidOut)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending / Approved</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(pendingPayouts)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
            <p className="text-sm text-slate-500">
              Filter booking earnings and payout history.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickFilterLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="search" className="text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              id="search"
              name="search"
              defaultValue={search}
              placeholder="Reference or tour"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="bookingStatus" className="text-sm font-medium text-slate-700">
              Booking Status
            </label>
            <select
              id="bookingStatus"
              name="bookingStatus"
              defaultValue={bookingStatus}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="QUOTED">Quoted</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="paymentStatus" className="text-sm font-medium text-slate-700">
              Payment Status
            </label>
            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={paymentStatus}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="lockState" className="text-sm font-medium text-slate-700">
              Lock State
            </label>
            <select
              id="lockState"
              name="lockState"
              defaultValue={lockState}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All</option>
              <option value="LOCKED">Locked</option>
              <option value="UNLOCKED">Unlocked</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="payoutStatus" className="text-sm font-medium text-slate-700">
              Payout Status
            </label>
            <select
              id="payoutStatus"
              name="payoutStatus"
              defaultValue={payoutStatus}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="method" className="text-sm font-medium text-slate-700">
              Payment Method
            </label>
            <input
              id="method"
              name="method"
              defaultValue={method}
              placeholder="Bank, wire, etc."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="dateFrom" className="text-sm font-medium text-slate-700">
              Date From
            </label>
            <input
              id="dateFrom"
              name="dateFrom"
              type="date"
              defaultValue={dateFrom}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="dateTo" className="text-sm font-medium text-slate-700">
              Date To
            </label>
            <input
              id="dateTo"
              name="dateTo"
              type="date"
              defaultValue={dateTo}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Apply Filters
            </button>

            <Link
              href="/b2b/commissions"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <CommissionsCharts
        bookingChartData={bookingChartData}
        payoutChartData={payoutChartData}
        payoutPieData={payoutPieData}
      />

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Booking-Based Earnings
          </h2>
          <p className="text-sm text-slate-500">
            Commissionable earnings by booking.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Reference</th>
                <th className="px-6 py-3 font-medium">Tour</th>
                <th className="px-6 py-3 font-medium">Booking Status</th>
                <th className="px-6 py-3 font-medium">Payment Status</th>
                <th className="px-6 py-3 font-medium">Gross</th>
                <th className="px-6 py-3 font-medium">Commission / Payout</th>
                <th className="px-6 py-3 font-medium">Net</th>
                <th className="px-6 py-3 font-medium">Lock State</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {booking.bookingReference}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {booking.tour?.title ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${bookingStatusClasses(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatusClasses(
                          booking.paymentStatus
                        )}`}
                      >
                        {booking.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {formatCurrency(booking.grossAmount, booking.currency ?? "EUR")}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatCurrency(
                        booking.commissionAmount ?? 0,
                        booking.currency ?? "EUR"
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {formatCurrency(booking.netAmount, booking.currency ?? "EUR")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          booking.payoutId
                            ? "bg-slate-200 text-slate-800"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {booking.payoutId ? "LOCKED" : "UNLOCKED"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {formatDate(booking.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Payout History</h2>
          <p className="text-sm text-slate-500">
            Track approved and paid partner payouts.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Payout ID</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Bookings</th>
                <th className="px-6 py-3 font-medium">Method</th>
                <th className="px-6 py-3 font-medium">Reference</th>
                <th className="px-6 py-3 font-medium">Locked</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium">Approved</th>
                <th className="px-6 py-3 font-medium">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                    No payouts found.
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {payout.id}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatCurrency(payout.totalAmount, payout.currency ?? "EUR")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${payoutStatusClasses(
                          payout.status
                        )}`}
                      >
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {payout.bookings.length}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {payout.paymentMethod || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {payout.paymentReference || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          payout.lockedAt
                            ? "bg-slate-200 text-slate-800"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {payout.lockedAt ? "LOCKED" : "OPEN"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {formatDate(payout.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {formatDate(payout.approvedAt)}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {formatDate(payout.paidAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}