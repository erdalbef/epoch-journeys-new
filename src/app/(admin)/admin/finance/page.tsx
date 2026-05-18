import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ExpensePaymentStatus, Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/payments/formatCurrency";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type SummaryItem = {
  label: string;
  income: number;
  expenses: number;
  count: number;
};

function getResult(item: SummaryItem) {
  return item.income - item.expenses;
}

function getTopItem(map: Map<string, SummaryItem>) {
  return Array.from(map.values()).sort((a, b) => getResult(b) - getResult(a))[0];
}

export default async function AdminFinanceDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const [financeEntries, bankAccount] = await Promise.all([
    db.expense.findMany({
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      take: 300,
      include: {
        booking: {
          select: {
            id: true,
            bookingDisplayCode: true,
            bookingReference: true,
          },
        },
        tour: {
          select: {
            id: true,
            title: true,
            tourCode: true,
          },
        },
      },
    }),

    db.bankAccount.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  const getReportingAmount = (
    entry: (typeof financeEntries)[number]
  ) => {
    return entry.amount;
  };

  const addToSummary = (
    map: Map<string, SummaryItem>,
    key: string,
    label: string,
    direction: string,
    amount: number
  ) => {
    const existing = map.get(key) ?? {
      label,
      income: 0,
      expenses: 0,
      count: 0,
    };

    if (direction === "INCOME") {
      existing.income += amount;
    } else {
      existing.expenses += amount;
    }

    existing.count += 1;
    map.set(key, existing);
  };

  const totalIncome = financeEntries
    .filter((entry) => entry.direction === "INCOME")
    .reduce((sum, entry) => sum + getReportingAmount(entry), 0);

  const totalExpenses = financeEntries
    .filter((entry) => entry.direction === "EXPENSE")
    .reduce((sum, entry) => sum + getReportingAmount(entry), 0);

  const paidIncome = financeEntries
    .filter(
      (entry) =>
        entry.direction === "INCOME" &&
        entry.paymentStatus === ExpensePaymentStatus.PAID
    )
    .reduce((sum, entry) => sum + getReportingAmount(entry), 0);

  const pendingIncome = financeEntries
    .filter(
      (entry) =>
        entry.direction === "INCOME" &&
        entry.paymentStatus === ExpensePaymentStatus.PENDING
    )
    .reduce((sum, entry) => sum + getReportingAmount(entry), 0);

  const paidExpenses = financeEntries
    .filter(
      (entry) =>
        entry.direction === "EXPENSE" &&
        entry.paymentStatus === ExpensePaymentStatus.PAID
    )
    .reduce((sum, entry) => sum + getReportingAmount(entry), 0);

  const pendingExpenses = financeEntries
    .filter(
      (entry) =>
        entry.direction === "EXPENSE" &&
        entry.paymentStatus === ExpensePaymentStatus.PENDING
    )
    .reduce((sum, entry) => sum + getReportingAmount(entry), 0);

  const totalTax = financeEntries.reduce(
    (sum, entry) => sum + (entry.taxAmount || 0),
    0
  );

  const netProfit = totalIncome - totalExpenses;

  const openingBalance = bankAccount?.openingBalance || 0;
  const estimatedBankBalance = openingBalance + paidIncome - paidExpenses;

  const agencyMap = new Map<string, SummaryItem>();
  const tourMap = new Map<string, SummaryItem>();
  const groupMap = new Map<string, SummaryItem>();
  const supplierMap = new Map<string, SummaryItem>();

  for (const entry of financeEntries) {
    const amount = getReportingAmount(entry);

    const agencyLabel =
      entry.partnerCompanyName || entry.agentNameSnapshot || "Unassigned";

    addToSummary(agencyMap, agencyLabel, agencyLabel, entry.direction, amount);

    const tourLabel = entry.tour
      ? entry.tour.tourCode
        ? `${entry.tour.tourCode} — ${entry.tour.title}`
        : entry.tour.title
      : entry.customPackageName || "Unlinked Tour / Package";

    addToSummary(tourMap, tourLabel, tourLabel, entry.direction, amount);

    const groupLabel =
      entry.groupName || entry.customPackageName || "Unassigned Group";

    addToSummary(groupMap, groupLabel, groupLabel, entry.direction, amount);

    const supplierLabel = entry.vendorName || "Unassigned Supplier / Payer";

    addToSummary(
      supplierMap,
      supplierLabel,
      supplierLabel,
      entry.direction,
      amount
    );
  }

  const topAgency = getTopItem(agencyMap);
  const topTour = getTopItem(tourMap);
  const topGroup = getTopItem(groupMap);
  const topSupplier = Array.from(supplierMap.values()).sort(
    (a, b) => b.expenses - a.expenses
  )[0];

  const recentEntries = financeEntries.slice(0, 8);

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">
            Finance Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Executive overview of income, expenses, receivables, payables, tax,
            bank balance, agencies, tours, and operation profitability.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/finance/expenses"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Open Finance Ledger
          </Link>

          <Link
            href="/admin/finance/expenses/create"
            className="rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Add Finance Entry
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">
            Estimated Bank Balance
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-800">
            {formatCurrency(estimatedBankBalance, "EUR")}
          </p>
          <p className="mt-2 text-xs text-emerald-700">
            Opening balance + paid income - paid expenses
          </p>
        </div>

        <div className="rounded-2xl border bg-green-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-green-700">Total Income</p>
          <p className="mt-2 text-3xl font-bold text-green-800">
            {formatCurrency(totalIncome, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-red-700">Total Expenses</p>
          <p className="mt-2 text-3xl font-bold text-red-800">
            {formatCurrency(totalExpenses, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-blue-700">Net Profit</p>
          <p
            className={`mt-2 text-3xl font-bold ${
              netProfit >= 0 ? "text-blue-800" : "text-red-700"
            }`}
          >
            {formatCurrency(netProfit, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-700">VAT / Tax</p>
          <p className="mt-2 text-3xl font-bold text-amber-800">
            {formatCurrency(totalTax, "EUR")}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Opening Bank Balance</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">
            {formatCurrency(openingBalance, "EUR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {bankAccount?.name || "No active bank account selected"}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Paid Income</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(paidIncome, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Paid Expenses</p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(paidExpenses, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Cash Movement</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              paidIncome - paidExpenses >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {formatCurrency(paidIncome - paidExpenses, "EUR")}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending Receivables</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(pendingIncome, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending Payables</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(pendingExpenses, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Top Agency / Partner</p>
          <p className="mt-2 text-lg font-bold text-[#001F3F]">
            {topAgency?.label || "-"}
          </p>
          <p
            className={`mt-1 text-sm font-medium ${
              topAgency && getResult(topAgency) >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {topAgency
              ? formatCurrency(getResult(topAgency), "EUR")
              : formatCurrency(0, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Top Tour / Package</p>
          <p className="mt-2 text-lg font-bold text-[#001F3F]">
            {topTour?.label || "-"}
          </p>
          <p
            className={`mt-1 text-sm font-medium ${
              topTour && getResult(topTour) >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {topTour
              ? formatCurrency(getResult(topTour), "EUR")
              : formatCurrency(0, "EUR")}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Top Group</p>
          <p className="mt-2 text-lg font-bold text-[#001F3F]">
            {topGroup?.label || "-"}
          </p>
          <p
            className={`mt-1 text-sm font-medium ${
              topGroup && getResult(topGroup) >= 0
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {topGroup
              ? formatCurrency(getResult(topGroup), "EUR")
              : formatCurrency(0, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Largest Supplier / Payer</p>
          <p className="mt-2 text-lg font-bold text-[#001F3F]">
            {topSupplier?.label || "-"}
          </p>
          <p className="mt-1 text-sm font-medium text-red-700">
            {topSupplier
              ? formatCurrency(topSupplier.expenses, "EUR")
              : formatCurrency(0, "EUR")}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#001F3F]">
                Recent Finance Entries
              </h2>
              <p className="text-sm text-slate-500">
                Latest income and expense records.
              </p>
            </div>

            <Link
              href="/admin/finance/expenses"
              className="text-sm font-medium text-[#8B0000] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Title</th>
                  <th className="px-3 py-3 font-medium">Agency / Group</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>

              <tbody>
                {recentEntries.map((entry) => (
                  <tr key={entry.id} className="border-t">
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDate(entry.expenseDate)}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium text-[#001F3F]">
                        {entry.title}
                      </div>

                      {entry.tour && (
                        <div className="text-xs text-slate-500">
                          {entry.tour.tourCode
                            ? `${entry.tour.tourCode} — ${entry.tour.title}`
                            : entry.tour.title}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {entry.partnerCompanyName ||
                          entry.agentNameSnapshot ||
                          "-"}
                      </div>

                      {(entry.groupName || entry.customPackageName) && (
                        <div className="text-xs text-slate-500">
                          {entry.groupName || entry.customPackageName}
                        </div>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          entry.paymentStatus === "PAID"
                            ? "bg-green-100 text-green-700"
                            : entry.paymentStatus === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {entry.paymentStatus}
                      </span>
                    </td>

                    <td
                      className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${
                        entry.direction === "INCOME"
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {entry.direction === "INCOME" ? "+" : "-"}
                      {formatCurrency(getReportingAmount(entry), "EUR")}
                    </td>
                  </tr>
                ))}

                {recentEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-sm text-slate-500"
                    >
                      No finance entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Finance Actions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Quick access to operational finance tools.
          </p>
           <Link
              href="/admin/finance/bank-accounts"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Bank Accounts
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Manage opening balances and active company bank accounts.
              </p>
            </Link>

          <div className="mt-5 grid gap-3">
            <Link
              href="/admin/finance/expenses/create"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">Add Finance Entry</p>
              <p className="mt-1 text-sm text-slate-500">
                Add income, supplier expense, VAT, bank fee, commission, or
                operation finance record.
              </p>
            </Link>

            <Link
              href="/admin/finance/expenses"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">Open Ledger</p>
              <p className="mt-1 text-sm text-slate-500">
                View, filter, edit, and remove all finance entries.
              </p>
            </Link>

            <Link
              href="/admin/finance"
              className="rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
            >
              <p className="font-semibold text-[#001F3F]">
                Bank Accounts — Coming Soon
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Future page for bank account balances and account-level cash
                tracking.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}