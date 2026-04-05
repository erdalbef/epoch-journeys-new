import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

type AdminDashboardPageProps = {
  searchParams?: Promise<{
    from?: string;
    to?: string;
    agent?: string;
  }>;
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function getFinancialStatus(booking: {
  amountPaid: number;
  totalPrice: number;
  paymentDueDate: Date | null;
}) {
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

function getFinancialStatusClasses(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-800 border-green-200";
    case "PARTIAL":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "UNPAID":
      return "bg-red-100 text-red-800 border-red-200";
    case "OVERDUE":
      return "bg-red-200 text-red-900 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getRiskLevel(outstanding: number, revenue: number) {
  if (revenue <= 0) return "LOW";

  const ratio = outstanding / revenue;

  if (ratio >= 0.6) return "HIGH";
  if (ratio >= 0.3) return "MEDIUM";
  return "LOW";
}

function getRiskClasses(level: string) {
  switch (level) {
    case "HIGH":
      return "bg-red-200 text-red-900 border-red-300";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "LOW":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function buildUrl(params: {
  from?: string;
  to?: string;
  agent?: string;
}) {
  const search = new URLSearchParams();

  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.agent) search.set("agent", params.agent);

  const query = search.toString();
  return query ? `/admin/dashboard?${query}` : "/admin/dashboard";
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const from = resolvedSearchParams?.from?.trim() || "";
  const to = resolvedSearchParams?.to?.trim() || "";
  const agent = resolvedSearchParams?.agent?.trim() || "";

  const createdAtFilter: Prisma.DateTimeFilter = {};

  if (from) {
    createdAtFilter.gte = new Date(`${from}T00:00:00.000Z`);
  }

  if (to) {
    createdAtFilter.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const where: Prisma.BookingWhereInput = {
    ...(from || to ? { createdAt: createdAtFilter } : {}),
    ...(agent
      ? {
          agentNameSnapshot: {
            equals: agent,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const [bookings, payouts, agents] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        payout: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            currency: true,
            paidAt: true,
          },
        },
      },
      take: 50,
    }),
    db.partnerPayout.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        agent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            travelAgency: true,
          },
        },
      },
    }),
    db.booking.findMany({
      select: {
        agentNameSnapshot: true,
      },
      distinct: ["agentNameSnapshot"],
      orderBy: {
        agentNameSnapshot: "asc",
      },
    }),
  ]);

  const totalRevenue = bookings.reduce((sum, booking) => {
    return sum + booking.totalPrice;
  }, 0);

  const totalPaid = bookings.reduce((sum, booking) => {
    return sum + booking.amountPaid;
  }, 0);

  const totalOutstanding = bookings.reduce((sum, booking) => {
    return sum + Math.max(booking.totalPrice - booking.amountPaid, 0);
  }, 0);

  const totalCommission = bookings.reduce((sum, booking) => {
    return sum + booking.commissionAmount;
  }, 0);

  const totalNet = bookings.reduce((sum, booking) => {
    return sum + booking.netAmount;
  }, 0);

  const now = new Date();
  const next30Days = new Date();
  next30Days.setDate(next30Days.getDate() + 30);

  const overdueBookings = bookings.filter((booking) => {
    return getFinancialStatus(booking) === "OVERDUE";
  });

  const unpaidBookings = bookings.filter((booking) => {
    return getFinancialStatus(booking) === "UNPAID";
  });

  const partialBookings = bookings.filter((booking) => {
    return getFinancialStatus(booking) === "PARTIAL";
  });

  const expectedCashNext30Days = bookings.reduce((sum, booking) => {
    const dueAmount = Math.max(booking.totalPrice - booking.amountPaid, 0);

    if (
      dueAmount > 0 &&
      booking.paymentDueDate &&
      booking.paymentDueDate >= now &&
      booking.paymentDueDate <= next30Days
    ) {
      return sum + dueAmount;
    }

    return sum;
  }, 0);

  const agentPerformanceMap = new Map<
    string,
    {
      name: string;
      revenue: number;
      commission: number;
      bookings: number;
      paid: number;
      outstanding: number;
      riskLevel: string;
    }
  >();

  for (const booking of bookings) {
    const key = booking.agentNameSnapshot?.trim() || "Unknown Agent";

    const current = agentPerformanceMap.get(key) ?? {
      name: key,
      revenue: 0,
      commission: 0,
      bookings: 0,
      paid: 0,
      outstanding: 0,
      riskLevel: "LOW",
    };

    const outstanding = Math.max(booking.totalPrice - booking.amountPaid, 0);

    current.revenue += booking.totalPrice;
    current.commission += booking.commissionAmount;
    current.bookings += 1;
    current.paid += booking.amountPaid;
    current.outstanding += outstanding;

    agentPerformanceMap.set(key, current);
  }

  const allAgentPerformance = Array.from(agentPerformanceMap.values()).map(
    (agentItem) => ({
      ...agentItem,
      riskLevel: getRiskLevel(agentItem.outstanding, agentItem.revenue),
    })
  );

  const topAgents = [...allAgentPerformance]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const riskAgents = [...allAgentPerformance]
    .filter((agentItem) => agentItem.outstanding > 0)
    .sort((a, b) => {
      if (a.riskLevel === b.riskLevel) {
        return b.outstanding - a.outstanding;
      }

      const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return rank[b.riskLevel as keyof typeof rank] -
        rank[a.riskLevel as keyof typeof rank];
    })
    .slice(0, 8);

  const csvExportUrl = `/api/admin/finance/export?${new URLSearchParams({
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(agent ? { agent } : {}),
  }).toString()}`;

  const availableAgents = agents
    .map((item) => item.agentNameSnapshot)
    .filter((value): value is string => Boolean(value && value.trim()));

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-gray-500">Admin / Dashboard</p>
          <h1 className="text-3xl font-bold text-gray-900">
            Finance Control Center
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Executive view of revenue, collections, cash flow, overdue balances,
            and agent financial risk.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={csvExportUrl}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export CSV
          </a>

          <Link
            href="/admin/bookings"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            View Bookings
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-4">
          <div>
            <label
              htmlFor="from"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              From
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              To
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={to}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>

          <div>
            <label
              htmlFor="agent"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Agent
            </label>
            <select
              id="agent"
              name="agent"
              defaultValue={agent}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            >
              <option value="">All Agents</option>
              {availableAgents.map((agentName) => (
                <option key={agentName} value={agentName}>
                  {agentName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Apply Filters
            </button>

            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(totalRevenue)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Collected</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(totalPaid)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Commission</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(totalCommission)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Net Revenue</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(totalNet)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Expected Cash (30d)</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">
            {formatCurrency(expectedCashNext30Days)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Overdue Bookings</p>
          <p className="mt-2 text-2xl font-bold text-red-800">
            {overdueBookings.length}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Unpaid Bookings</p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {unpaidBookings.length}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Partial Payments</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {partialBookings.length}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Overdue Bookings
            </h2>
            <Link
              href={buildUrl({ from, to, agent })}
              className="text-sm text-gray-500"
            >
              Filtered View
            </Link>
          </div>

          {overdueBookings.length === 0 ? (
            <p className="text-sm text-gray-500">No overdue bookings found.</p>
          ) : (
            <div className="space-y-3">
              {overdueBookings.slice(0, 8).map((booking) => {
                const dueAmount = Math.max(
                  booking.totalPrice - booking.amountPaid,
                  0
                );

                return (
                  <div
                    key={booking.id}
                    className="rounded-xl border border-red-200 bg-red-50 p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {booking.bookingReference}
                        </p>
                        <p className="text-sm text-gray-600">
                          {booking.tourTitleSnapshot}
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="font-semibold text-red-800">
                          {formatCurrency(dueAmount, booking.currency)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Due: {formatDate(booking.paymentDueDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Agents
            </h2>
          </div>

          {topAgents.length === 0 ? (
            <p className="text-sm text-gray-500">No agent data available.</p>
          ) : (
            <div className="space-y-4">
              {topAgents.map((agentItem, index) => (
                <div
                  key={`${agentItem.name}-${index}`}
                  className="rounded-xl border bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {agentItem.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {agentItem.bookings} booking
                        {agentItem.bookings === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(agentItem.revenue)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Comm. {formatCurrency(agentItem.commission)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Risk Agents
            </h2>
            <p className="text-sm text-gray-500">
              Agents with elevated outstanding balances relative to revenue.
            </p>
          </div>

          {riskAgents.length === 0 ? (
            <p className="text-sm text-gray-500">No risk agents found.</p>
          ) : (
            <div className="space-y-4">
              {riskAgents.map((agentItem, index) => (
                <div
                  key={`${agentItem.name}-risk-${index}`}
                  className="rounded-xl border bg-gray-50 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {agentItem.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {agentItem.bookings} booking
                        {agentItem.bookings === 1 ? "" : "s"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRiskClasses(
                        agentItem.riskLevel
                      )}`}
                    >
                      {agentItem.riskLevel} RISK
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-gray-500">Revenue</p>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(agentItem.revenue)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Paid</p>
                      <p className="font-medium text-green-700">
                        {formatCurrency(agentItem.paid)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Outstanding</p>
                      <p className="font-medium text-red-700">
                        {formatCurrency(agentItem.outstanding)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Payouts
            </h2>
          </div>

          {payouts.length === 0 ? (
            <p className="text-sm text-gray-500">No payouts found.</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="rounded-xl border bg-gray-50 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {payout.agent.fullName ||
                          payout.agent.travelAgency ||
                          payout.agent.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {payout.agent.travelAgency || payout.agent.email}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(payout.totalAmount, payout.currency)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatStatus(payout.status)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Paid: {formatDate(payout.paidAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Bookings Finance Watch
            </h2>
            <p className="text-sm text-gray-500">
              Overdue rows are highlighted for immediate attention.
            </p>
          </div>

          <Link
            href="/admin/bookings"
            className="text-sm text-black underline"
          >
            Open Full Bookings List
          </Link>
        </div>

        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500">No bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Ref
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Agent
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Tour
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Due
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {bookings.slice(0, 12).map((booking) => {
                  const financialStatus = getFinancialStatus(booking);
                  const dueAmount = Math.max(
                    booking.totalPrice - booking.amountPaid,
                    0
                  );
                  const isOverdue = financialStatus === "OVERDUE";

                  return (
                    <tr
                      key={booking.id}
                      className={
                        isOverdue
                          ? "border-b bg-red-50"
                          : "border-b bg-white"
                      }
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {booking.bookingReference}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {booking.agentNameSnapshot || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {booking.tourTitleSnapshot}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatCurrency(booking.totalPrice, booking.currency)}
                      </td>
                      <td className="px-4 py-3 text-green-700">
                        {formatCurrency(booking.amountPaid, booking.currency)}
                      </td>
                      <td className="px-4 py-3 font-medium text-red-700">
                        {formatCurrency(dueAmount, booking.currency)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(booking.paymentDueDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getFinancialStatusClasses(
                            financialStatus
                          )}`}
                        >
                          {financialStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="text-sm text-black underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}