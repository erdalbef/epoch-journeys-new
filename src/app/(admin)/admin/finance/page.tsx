import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Prisma, Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/payments/formatCurrency";
import { getSmartPaymentClass } from "@/lib/payments/paymentBadges";
import { getSmartPaymentLabel } from "@/lib/payments/paymentStatus";

type SearchParams = {
  from?: string;
  to?: string;
  agent?: string;
  tour?: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

function getLast12MonthKeys() {
  const result: string[] = [];
  const today = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    result.push(getMonthKey(d));
  }

  return result;
}

function calculateMargin(total: number, net: number) {
  if (!total) return 0;
  return ((total - net) / total) * 100;
}

function isOverdue(dueDate?: Date | string | null, amountDue?: number) {
  if (!dueDate || !amountDue || amountDue <= 0) return false;

  const due = new Date(dueDate);
  const now = new Date();

  return due.getTime() < now.getTime();
}

function isDueSoon(dueDate?: Date | string | null, amountDue?: number) {
  if (!dueDate || !amountDue || amountDue <= 0) return false;

  const due = new Date(dueDate);
  const now = new Date();

  const diffInDays =
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  return diffInDays <= 7 && diffInDays >= 0;
}

function formatDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}

function buildFinanceHref(params: {
  from?: string;
  to?: string;
  agent?: string;
  tour?: string;
}) {
  const search = new URLSearchParams();

  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.agent) search.set("agent", params.agent);
  if (params.tour) search.set("tour", params.tour);

  const query = search.toString();
  return query ? `/admin/finance?${query}` : "/admin/finance";
}

function formatCategoryLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = (await searchParams) ?? {};

  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";
  const agent = params.agent?.trim() ?? "";
  const tour = params.tour?.trim() ?? "";

  const bookingWhere: Prisma.BookingWhereInput = {
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(agent
      ? {
          OR: [
            {
              agentNameSnapshot: {
                contains: agent,
                mode: "insensitive",
              },
            },
            {
              agencyNameSnapshot: {
                contains: agent,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(tour
      ? {
          tourTitleSnapshot: {
            contains: tour,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const expenseWhere: Prisma.ExpenseWhereInput = {
    ...(from || to
      ? {
          expenseDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(tour
      ? {
          OR: [
            {
              title: {
                contains: tour,
                mode: "insensitive",
              },
            },
            {
              vendorName: {
                contains: tour,
                mode: "insensitive",
              },
            },
            {
              tour: {
                title: {
                  contains: tour,
                  mode: "insensitive",
                },
              },
            },
            {
              booking: {
                tourTitleSnapshot: {
                  contains: tour,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
    ...(agent
      ? {
          booking: {
            OR: [
              {
                agentNameSnapshot: {
                  contains: agent,
                  mode: "insensitive",
                },
              },
              {
                agencyNameSnapshot: {
                  contains: agent,
                  mode: "insensitive",
                },
              },
            ],
          },
        }
      : {}),
  };

  const [bookings, expenses] = await Promise.all([
    db.booking.findMany({
      where: bookingWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        totalPrice: true,
        amountPaid: true,
        amountDue: true,
        paymentDueDate: true,
        commissionAmount: true,
        netAmount: true,
        currency: true,
        paymentStatus: true,
        departureDateSnapshot: true,
        tourTitleSnapshot: true,
        agentNameSnapshot: true,
        agencyNameSnapshot: true,
        createdAt: true,
      },
    }),
    db.expense.findMany({
      where: expenseWhere,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        category: true,
        paymentStatus: true,
        expenseDate: true,
      },
    }),
  ]);

  const totalSales = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const totalPaid = bookings.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalDue = bookings.reduce((sum, b) => sum + b.amountDue, 0);
  const totalCommission = bookings.reduce(
    (sum, b) => sum + b.commissionAmount,
    0
  );
  const totalNet = bookings.reduce((sum, b) => sum + b.netAmount, 0);

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const paidExpenses = expenses
    .filter((item) => item.paymentStatus === "PAID")
    .reduce((sum, item) => sum + item.amount, 0);
  const pendingExpenses = expenses
    .filter((item) => item.paymentStatus === "PENDING")
    .reduce((sum, item) => sum + item.amount, 0);
  const cancelledExpenses = expenses
    .filter((item) => item.paymentStatus === "CANCELLED")
    .reduce((sum, item) => sum + item.amount, 0);

  const grossProfit = totalSales - totalCommission;
  const operatingProfit = totalNet - totalExpenses;
  const cashResult = totalPaid - paidExpenses;
  const profitMargin = totalSales ? (operatingProfit / totalSales) * 100 : 0;

  const avgBookingValue = bookings.length ? totalSales / bookings.length : 0;
  const avgCommission = bookings.length
    ? totalCommission / bookings.length
    : 0;
  const avgExpense = expenses.length ? totalExpenses / expenses.length : 0;
  const collectionRate = totalSales ? (totalPaid / totalSales) * 100 : 0;

  const paidCount = bookings.filter((b) => b.paymentStatus === "PAID").length;
  const partialCount = bookings.filter(
    (b) => b.paymentStatus === "PARTIALLY_PAID"
  ).length;
  const unpaidCount = bookings.filter(
    (b) => b.paymentStatus === "UNPAID"
  ).length;
  const refundedCount = bookings.filter(
    (b) => b.paymentStatus === "REFUNDED"
  ).length;

  const overdueCount = bookings.filter((b) =>
    isOverdue(b.paymentDueDate, b.amountDue)
  ).length;

  const dueSoonCount = bookings.filter((b) =>
    isDueSoon(b.paymentDueDate, b.amountDue)
  ).length;

  const monthKeys = getLast12MonthKeys();

  const bookingMonthlyMap = new Map<
    string,
    {
      sales: number;
      paid: number;
      due: number;
      bookings: number;
    }
  >();

  const expenseMonthlyMap = new Map<
    string,
    {
      expenses: number;
      paidExpenses: number;
    }
  >();

  for (const key of monthKeys) {
    bookingMonthlyMap.set(key, {
      sales: 0,
      paid: 0,
      due: 0,
      bookings: 0,
    });

    expenseMonthlyMap.set(key, {
      expenses: 0,
      paidExpenses: 0,
    });
  }

  for (const booking of bookings) {
    const key = getMonthKey(new Date(booking.createdAt));
    const current = bookingMonthlyMap.get(key);

    if (!current) continue;

    current.sales += booking.totalPrice;
    current.paid += booking.amountPaid;
    current.due += booking.amountDue;
    current.bookings += 1;
  }

  for (const expense of expenses) {
    const key = getMonthKey(new Date(expense.expenseDate));
    const current = expenseMonthlyMap.get(key);

    if (!current) continue;

    current.expenses += expense.amount;

    if (expense.paymentStatus === "PAID") {
      current.paidExpenses += expense.amount;
    }
  }

  const monthlyData = monthKeys.map((key) => {
    const bookingRow = bookingMonthlyMap.get(key);
    const expenseRow = expenseMonthlyMap.get(key);

    const sales = bookingRow?.sales ?? 0;
    const paid = bookingRow?.paid ?? 0;
    const due = bookingRow?.due ?? 0;
    const bookingsCount = bookingRow?.bookings ?? 0;
    const expensesTotal = expenseRow?.expenses ?? 0;
    const paidExpensesTotal = expenseRow?.paidExpenses ?? 0;

    return {
      key,
      label: getMonthLabel(key),
      sales,
      paid,
      due,
      bookings: bookingsCount,
      expenses: expensesTotal,
      paidExpenses: paidExpensesTotal,
    };
  });

  const maxSales = Math.max(...monthlyData.map((m) => m.sales), 1);
  const maxExpenses = Math.max(...monthlyData.map((m) => m.expenses), 1);

  const categorySummaryMap = new Map<
    string,
    {
      amount: number;
      count: number;
    }
  >();

  for (const expense of expenses) {
    const key = expense.category;

    if (!categorySummaryMap.has(key)) {
      categorySummaryMap.set(key, { amount: 0, count: 0 });
    }

    const current = categorySummaryMap.get(key);
    if (!current) continue;

    current.amount += expense.amount;
    current.count += 1;
  }

  const categorySummary = Array.from(categorySummaryMap.entries())
    .map(([category, value]) => ({
      category,
      amount: value.amount,
      count: value.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  const exportHref = (() => {
    const search = new URLSearchParams();

    if (from) search.set("from", from);
    if (to) search.set("to", to);
    if (agent) search.set("agent", agent);
    if (tour) search.set("tour", tour);

    const query = search.toString();
    return query
      ? `/api/admin/finance/export?${query}`
      : "/api/admin/finance/export";
  })();

  const today = new Date();
  const last7 = new Date(today);
  last7.setDate(today.getDate() - 7);

  const last30 = new Date(today);
  last30.setDate(today.getDate() - 30);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const quickFilters = [
    {
      label: "Last 7 Days",
      href: buildFinanceHref({
        from: formatDateInput(last7),
        to: formatDateInput(today),
        agent,
        tour,
      }),
    },
    {
      label: "Last 30 Days",
      href: buildFinanceHref({
        from: formatDateInput(last30),
        to: formatDateInput(today),
        agent,
        tour,
      }),
    },
    {
      label: "This Month",
      href: buildFinanceHref({
        from: formatDateInput(monthStart),
        to: formatDateInput(today),
        agent,
        tour,
      }),
    },
    {
      label: "This Year",
      href: buildFinanceHref({
        from: formatDateInput(yearStart),
        to: formatDateInput(today),
        agent,
        tour,
      }),
    },
  ];

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">
            Finance Overview
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor revenue, collections, commissions, expenses, and real
            operating result across bookings and tours.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/finance/expenses"
            className="inline-flex rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            View Expenses
          </Link>

          <Link
            href="/admin/finance/expenses/create"
            className="inline-flex rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Add Expense
          </Link>

          <Link
            href={exportHref}
            className="inline-flex rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Export CSV
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">Filters</h2>
            <p className="text-sm text-muted-foreground">
              Narrow the finance view by date range, agent, or tour.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickFilters.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full border px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-4">
          <div>
            <label
              htmlFor="from"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              From
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from}
              className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              To
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={to}
              className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="agent"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Agent / Agency
            </label>
            <input
              id="agent"
              name="agent"
              defaultValue={agent}
              placeholder="Search by agent or agency"
              className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="tour"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Tour
            </label>
            <input
              id="tour"
              name="tour"
              defaultValue={tour}
              placeholder="Search by tour"
              className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-4">
            <button
              type="submit"
              className="rounded-xl bg-[#001F3F] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Apply Filters
            </button>

            <Link
              href="/admin/finance"
              className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Sales</p>
          <p className="text-2xl font-semibold">{formatCurrency(totalSales)}</p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-semibold text-green-700">
            {formatCurrency(totalPaid)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-2xl font-semibold text-red-700">
            {formatCurrency(totalDue)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Commission</p>
          <p className="text-2xl font-semibold text-green-700">
            {formatCurrency(totalCommission)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Net After Commission</p>
          <p className="text-2xl font-semibold">{formatCurrency(totalNet)}</p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-semibold text-amber-700">
            {formatCurrency(totalExpenses)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Gross Profit</p>
          <p className="text-2xl font-semibold text-blue-700">
            {formatCurrency(grossProfit)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Operating Profit</p>
          <p
            className={`text-2xl font-semibold ${
              operatingProfit >= 0 ? "text-green-700" : "text-red-700"
            }`}
          >
            {formatCurrency(operatingProfit)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Avg Booking</p>
          <p className="text-xl font-semibold">
            {formatCurrency(avgBookingValue)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Avg Commission</p>
          <p className="text-xl font-semibold text-green-700">
            {formatCurrency(avgCommission)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Avg Expense</p>
          <p className="text-xl font-semibold text-amber-700">
            {formatCurrency(avgExpense)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Collection Rate</p>
          <p className="text-xl font-semibold text-blue-700">
            {collectionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Paid Expenses</p>
          <p className="text-xl font-semibold text-green-700">
            {formatCurrency(paidExpenses)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending Expenses</p>
          <p className="text-xl font-semibold text-amber-700">
            {formatCurrency(pendingExpenses)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Cash Result</p>
          <p
            className={`text-xl font-semibold ${
              cashResult >= 0 ? "text-green-700" : "text-red-700"
            }`}
          >
            {formatCurrency(cashResult)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Profit Margin</p>
          <p
            className={`text-xl font-semibold ${
              profitMargin >= 0 ? "text-blue-700" : "text-red-700"
            }`}
          >
            {profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Monthly Sales
            </h2>
            <p className="text-sm text-muted-foreground">
              Total booking value created per month.
            </p>
          </div>

          <div className="flex h-72 items-end gap-3 overflow-x-auto">
            {monthlyData.map((item) => {
              const heightPercent = Math.max((item.sales / maxSales) * 100, 4);

              return (
                <div
                  key={item.key}
                  className="flex min-w-14 flex-1 flex-col items-center justify-end"
                >
                  <div className="mb-2 text-center text-[11px] text-slate-500">
                    {item.sales > 0 ? formatCurrency(item.sales) : "—"}
                  </div>

                  <div className="flex h-52 items-end">
                    <div
                      className="w-10 rounded-t-md bg-[#001F3F]"
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.label}: ${formatCurrency(item.sales)}`}
                    />
                  </div>

                  <div className="mt-2 text-xs font-medium text-slate-700">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Monthly Expenses
            </h2>
            <p className="text-sm text-muted-foreground">
              Total expenses recorded per month.
            </p>
          </div>

          <div className="flex h-72 items-end gap-3 overflow-x-auto">
            {monthlyData.map((item) => {
              const heightPercent = Math.max(
                (item.expenses / maxExpenses) * 100,
                4
              );

              return (
                <div
                  key={item.key}
                  className="flex min-w-14 flex-1 flex-col items-center justify-end"
                >
                  <div className="mb-2 text-center text-[11px] text-slate-500">
                    {item.expenses > 0 ? formatCurrency(item.expenses) : "—"}
                  </div>

                  <div className="flex h-52 items-end">
                    <div
                      className="w-10 rounded-t-md bg-amber-500"
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.label}: ${formatCurrency(item.expenses)}`}
                    />
                  </div>

                  <div className="mt-2 text-xs font-medium text-slate-700">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Expense Category Summary
            </h2>
            <p className="text-sm text-muted-foreground">
              Where your costs are concentrated in the selected period.
            </p>
          </div>

          {categorySummary.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No expense data found for the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {categorySummary.map((item) => {
                const percent = totalExpenses
                  ? (item.amount / totalExpenses) * 100
                  : 0;

                return (
                  <div
                    key={item.category}
                    className="rounded-xl border p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-slate-900">
                          {formatCategoryLabel(item.category)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.count} record{item.count === 1 ? "" : "s"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-amber-700">
                          {formatCurrency(item.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {percent.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-amber-500"
                        style={{ width: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Finance Health Snapshot
            </h2>
            <p className="text-sm text-muted-foreground">
              Quick view of booking and expense risk indicators.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-xs uppercase text-muted-foreground">Paid</div>
              <div className="mt-2 text-2xl font-bold text-green-700">
                {paidCount}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-xs uppercase text-muted-foreground">
                Partial
              </div>
              <div className="mt-2 text-2xl font-bold text-blue-700">
                {partialCount}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-xs uppercase text-muted-foreground">
                Unpaid
              </div>
              <div className="mt-2 text-2xl font-bold text-red-700">
                {unpaidCount}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-xs uppercase text-muted-foreground">
                Refunded
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-700">
                {refundedCount}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-xs uppercase text-muted-foreground">
                Overdue
              </div>
              <div className="mt-2 text-2xl font-bold text-red-700">
                {overdueCount}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-xs uppercase text-muted-foreground">
                Due Soon
              </div>
              <div className="mt-2 text-2xl font-bold text-orange-600">
                {dueSoonCount}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-xs uppercase text-muted-foreground">
                Pending Expenses
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-700">
                {expenses.filter((item) => item.paymentStatus === "PENDING").length}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-xs uppercase text-muted-foreground">
                Cancelled Expenses
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-700">
                {
                  expenses.filter((item) => item.paymentStatus === "CANCELLED")
                    .length
                }
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-350 text-sm">
          <thead className="sticky top-0 z-10 bg-gray-100">
            <tr className="text-slate-700">
              <th className="p-3 text-left font-semibold">Ref</th>
              <th className="p-3 text-left font-semibold">Agent</th>
              <th className="p-3 text-left font-semibold">Tour</th>
              <th className="p-3 text-left font-semibold">Created</th>
              <th className="p-3 text-left font-semibold">Departure</th>
              <th className="p-3 text-right font-semibold">Total</th>
              <th className="p-3 text-right font-semibold">Paid</th>
              <th className="p-3 text-right font-semibold">Due</th>
              <th className="p-3 text-left font-semibold">Payment Status</th>
              <th className="p-3 text-right font-semibold">Commission</th>
              <th className="p-3 text-right font-semibold">Net</th>
              <th className="p-3 text-left font-semibold">Margin</th>
              <th className="p-3 text-left font-semibold">Risk</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="p-8 text-center text-muted-foreground"
                >
                  No finance records found.
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const paymentLabel = getSmartPaymentLabel(
                  b.paymentStatus,
                  b.amountDue,
                  b.paymentDueDate
                );

                const overdue = isOverdue(b.paymentDueDate, b.amountDue);
                const dueSoon = isDueSoon(b.paymentDueDate, b.amountDue);
                const margin = calculateMargin(b.totalPrice, b.netAmount);

                return (
                  <tr
                    key={b.id}
                    className="border-t transition hover:bg-slate-50"
                  >
                    <td className="p-3">
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="font-medium text-[#001F3F] hover:text-[#8B0000]"
                      >
                        {b.bookingDisplayCode || b.bookingReference}
                      </Link>
                    </td>

                    <td className="p-3">
                      <div>{b.agentNameSnapshot || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.agencyNameSnapshot || "-"}
                      </div>
                    </td>

                    <td className="p-3">{b.tourTitleSnapshot || "-"}</td>

                    <td className="p-3">{formatDate(b.createdAt)}</td>

                    <td className="p-3">{formatDate(b.departureDateSnapshot)}</td>

                    <td className="p-3 text-right font-medium">
                      {formatCurrency(b.totalPrice, b.currency)}
                    </td>

                    <td className="p-3 text-right font-medium text-green-700">
                      {formatCurrency(b.amountPaid, b.currency)}
                    </td>

                    <td className="p-3 text-right font-medium text-red-700">
                      {formatCurrency(b.amountDue, b.currency)}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getSmartPaymentClass(
                          paymentLabel
                        )}`}
                      >
                        {paymentLabel}
                      </span>
                    </td>

                    <td className="p-3 text-right font-medium text-green-700">
                      {formatCurrency(b.commissionAmount, b.currency)}
                    </td>

                    <td className="p-3 text-right font-medium">
                      {formatCurrency(b.netAmount, b.currency)}
                    </td>

                    <td className="p-3">
                      <span className="font-medium">{margin.toFixed(1)}%</span>
                    </td>

                    <td className="p-3">
                      {overdue ? (
                        <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          OVERDUE
                        </span>
                      ) : dueSoon ? (
                        <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                          DUE SOON
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {bookings.length > 0 && (
            <tfoot className="bg-slate-50 font-semibold">
              <tr className="border-t">
                <td className="p-3" colSpan={5}>
                  Totals
                </td>

                <td className="p-3 text-right">
                  {formatCurrency(totalSales)}
                </td>

                <td className="p-3 text-right text-green-700">
                  {formatCurrency(totalPaid)}
                </td>

                <td className="p-3 text-right text-red-700">
                  {formatCurrency(totalDue)}
                </td>

                <td className="p-3">—</td>

                <td className="p-3 text-right text-green-700">
                  {formatCurrency(totalCommission)}
                </td>

                <td className="p-3 text-right">
                  {formatCurrency(totalNet)}
                </td>

                <td className="p-3">—</td>
                <td className="p-3">—</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Expense Totals
            </h2>
            <p className="text-sm text-muted-foreground">
              Summary of expenses included in this finance view.
            </p>
          </div>

          <Link
            href="/admin/finance/expenses"
            className="text-sm font-medium text-[#001F3F] hover:text-[#8B0000]"
          >
            Open expense list
          </Link>
        </div>

        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-180 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left font-semibold">Metric</th>
                <th className="p-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-t">
                <td className="p-3">Total Expenses</td>
                <td className="p-3 text-right font-medium text-amber-700">
                  {formatCurrency(totalExpenses)}
                </td>
              </tr>

              <tr className="border-t">
                <td className="p-3">Paid Expenses</td>
                <td className="p-3 text-right font-medium text-green-700">
                  {formatCurrency(paidExpenses)}
                </td>
              </tr>

              <tr className="border-t">
                <td className="p-3">Pending Expenses</td>
                <td className="p-3 text-right font-medium text-amber-700">
                  {formatCurrency(pendingExpenses)}
                </td>
              </tr>

              <tr className="border-t">
                <td className="p-3">Cancelled Expenses</td>
                <td className="p-3 text-right font-medium text-slate-700">
                  {formatCurrency(cancelledExpenses)}
                </td>
              </tr>

              <tr className="border-t bg-slate-50 font-semibold">
                <td className="p-3">Operating Profit After Expenses</td>
                <td
                  className={`p-3 text-right ${
                    operatingProfit >= 0 ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {formatCurrency(operatingProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}