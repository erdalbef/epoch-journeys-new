import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  BookingStatus,
  ExpenseApprovalStatus,
  ExpenseCostType,
  RefundReason,
  RefundStatus,
  Role,
  SupplierPayableApprovalStatus,
  SupplierPayablePaymentStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type PageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
};

type CurrencySummary = {
  recognizedRevenue: number;
  receivables: number;
  supplierCommitted: number;
  supplierOutstanding: number;
  directCosts: number;
  overhead: number;
  revenueRefunds: number;
  cashOnlyRefunds: number;
  cashIn: number;
  cashOut: number;
};

function emptySummary(): CurrencySummary {
  return {
    recognizedRevenue: 0,
    receivables: 0,
    supplierCommitted: 0,
    supplierOutstanding: 0,
    directCosts: 0,
    overhead: 0,
    revenueRefunds: 0,
    cashOnlyRefunds: 0,
    cashIn: 0,
    cashOut: 0,
  };
}

function normalizeCurrency(value: string | null | undefined) {
  return value?.trim().toUpperCase() || "EUR";
}

function getSummary(
  map: Record<string, CurrencySummary>,
  currency: string,
) {
  const key = normalizeCurrency(currency);
  map[key] ??= emptySummary();
  return map[key];
}

function parseStart(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseEnd(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function refundReducesRevenue(reason: RefundReason) {
  switch (reason) {
    case RefundReason.OVERPAYMENT:
    case RefundReason.DUPLICATE_PAYMENT:
      return false;
    default:
      return true;
  }
}

export default async function FinanceManagementSummaryPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = await searchParams;
  const from = parseStart(params.from);
  const to = parseEnd(params.to);

  const dateRange = from || to
    ? {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      }
    : undefined;

  const now = new Date();

  const [
    bookings,
    supplierPayables,
    expenses,
    refunds,
    cashRows,
    overduePayables,
    pendingExpenseApprovals,
    pendingRefunds,
    unreconciledTransactions,
  ] = await Promise.all([
    db.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        ...(dateRange ? { createdAt: dateRange } : {}),
      },
      select: {
        currency: true,
        netAmount: true,
        amountDue: true,
      },
    }),

    db.supplierPayable.findMany({
      where: {
        approvalStatus: SupplierPayableApprovalStatus.APPROVED,
        ...(dateRange ? { createdAt: dateRange } : {}),
      },
      select: {
        currency: true,
        approvedAmount: true,
        creditAmount: true,
        balance: true,
        paymentStatus: true,
      },
    }),

    db.expense.findMany({
      where: {
        approvalStatus: ExpenseApprovalStatus.APPROVED,
        ...(dateRange ? { expenseDate: dateRange } : {}),
      },
      select: {
        currency: true,
        amount: true,
        costType: true,
      },
    }),

    db.refund.findMany({
      where: {
        status: {
          in: [RefundStatus.APPROVED, RefundStatus.PAID],
        },
        ...(dateRange ? { refundDate: dateRange } : {}),
      },
      select: {
        currency: true,
        amount: true,
        reason: true,
      },
    }),

    db.bankTransaction.groupBy({
      by: ["currency", "direction"],
      where: {
        status: BankTransactionStatus.POSTED,
        type: {
          notIn: [
            BankTransactionType.TRANSFER_IN,
            BankTransactionType.TRANSFER_OUT,
            BankTransactionType.OPENING_BALANCE,
          ],
        },
        ...(dateRange ? { transactionDate: dateRange } : {}),
      },
      _sum: {
        amount: true,
      },
    }),

    db.supplierPayable.count({
      where: {
        approvalStatus: SupplierPayableApprovalStatus.APPROVED,
        paymentStatus: {
          in: [
            SupplierPayablePaymentStatus.UNPAID,
            SupplierPayablePaymentStatus.PARTIALLY_PAID,
            SupplierPayablePaymentStatus.OVERDUE,
          ],
        },
        dueDate: {
          lt: now,
        },
      },
    }),

    db.expense.count({
      where: {
        approvalStatus: ExpenseApprovalStatus.PENDING_APPROVAL,
      },
    }),

    db.refund.count({
      where: {
        status: RefundStatus.PENDING,
      },
    }),

    db.bankTransaction.count({
      where: {
        status: BankTransactionStatus.POSTED,
        reconciliationId: null,
        type: {
          not: BankTransactionType.OPENING_BALANCE,
        },
      },
    }),
  ]);

  const summaries: Record<string, CurrencySummary> = {};

  for (const booking of bookings) {
    const row = getSummary(summaries, booking.currency);
    row.recognizedRevenue += booking.netAmount;
    row.receivables += booking.amountDue;
  }

  for (const payable of supplierPayables) {
    const row = getSummary(summaries, payable.currency);
    row.supplierCommitted +=
      Number(payable.approvedAmount) - Number(payable.creditAmount);

    if (
      payable.paymentStatus !== SupplierPayablePaymentStatus.PAID &&
      payable.paymentStatus !== SupplierPayablePaymentStatus.CANCELLED
    ) {
      row.supplierOutstanding += Number(payable.balance);
    }
  }

  for (const expense of expenses) {
    const row = getSummary(summaries, expense.currency);

    if (expense.costType === ExpenseCostType.DIRECT_TOUR_COST) {
      row.directCosts += expense.amount;
    } else {
      row.overhead += expense.amount;
    }
  }

  for (const refund of refunds) {
    const row = getSummary(summaries, refund.currency);

    if (refundReducesRevenue(refund.reason)) {
      row.revenueRefunds += Number(refund.amount);
    } else {
      row.cashOnlyRefunds += Number(refund.amount);
    }
  }

  for (const cash of cashRows) {
    const row = getSummary(summaries, cash.currency);
    const amount = Number(cash._sum.amount ?? 0);

    if (cash.direction === BankTransactionDirection.IN) {
      row.cashIn += amount;
    } else {
      row.cashOut += amount;
    }
  }

  const currencies = Object.keys(summaries).sort();

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Management Summary
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Executive finance view of recognized revenue, receivables,
            supplier commitments, direct costs, overhead, refunds and posted
            external cash movement.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/finance" className={secondaryButton}>
            ← Finance Center
          </Link>

          <Link href="/admin/finance/reports" className={secondaryButton}>
            Finance Reports
          </Link>

          <Link
            href="/admin/finance/profitability"
            className="rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002b57]"
          >
            Profitability
          </Link>
        </div>
      </div>

      <form
        method="GET"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <label className="text-sm font-semibold text-slate-700">
            From
            <input
              name="from"
              type="date"
              defaultValue={params.from || ""}
              className={inputClass}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            To
            <input
              name="to"
              type="date"
              defaultValue={params.to || ""}
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6f0000]"
          >
            Apply Period
          </button>

          <Link href="/admin/finance/reports/management-summary" className={secondaryButton}>
            Clear
          </Link>
        </div>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AlertCard
          title="Overdue Supplier Payables"
          value={overduePayables}
          href="/admin/supplier-payables"
          danger={overduePayables > 0}
        />

        <AlertCard
          title="Expense Approvals"
          value={pendingExpenseApprovals}
          href="/admin/finance/expenses"
          danger={pendingExpenseApprovals > 0}
        />

        <AlertCard
          title="Pending Refunds"
          value={pendingRefunds}
          href="/admin/finance/reports/refunds"
          danger={pendingRefunds > 0}
        />

        <AlertCard
          title="Unreconciled Ledger Items"
          value={unreconciledTransactions}
          href="/admin/finance/reconciliation"
          danger={unreconciledTransactions > 0}
        />
      </section>

      {currencies.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No finance records match the selected period.
        </section>
      ) : (
        currencies.map((currency) => {
          const row = summaries[currency];

          const grossContribution =
            row.recognizedRevenue -
            row.revenueRefunds -
            row.supplierCommitted -
            row.directCosts;

          const operatingContribution =
            grossContribution - row.overhead;

          const margin =
            row.recognizedRevenue > 0
              ? (operatingContribution / row.recognizedRevenue) * 100
              : null;

          const netCash = row.cashIn - row.cashOut;

          return (
            <section key={currency} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#001F3F]">
                  {currency} Management Position
                </h2>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {margin === null ? "No revenue" : `${margin.toFixed(1)}% operating margin`}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Recognized Revenue"
                  value={money(row.recognizedRevenue, currency)}
                  subtitle="Confirmed booking net revenue"
                />

                <MetricCard
                  title="Customer Receivables"
                  value={money(row.receivables, currency)}
                  subtitle="Outstanding confirmed booking balances"
                  warning={row.receivables > 0}
                />

                <MetricCard
                  title="Supplier Commitments"
                  value={money(row.supplierCommitted, currency)}
                  subtitle={`Outstanding: ${money(row.supplierOutstanding, currency)}`}
                />

                <MetricCard
                  title="Direct Tour Costs"
                  value={money(row.directCosts, currency)}
                  subtitle="Approved direct expenses"
                />

                <MetricCard
                  title="Revenue-Reducing Refunds"
                  value={money(row.revenueRefunds, currency)}
                  subtitle={`Cash-correction refunds: ${money(row.cashOnlyRefunds, currency)}`}
                  warning={row.revenueRefunds > 0}
                />

                <MetricCard
                  title="Overhead"
                  value={money(row.overhead, currency)}
                  subtitle="Approved overhead expenses"
                />

                <MetricCard
                  title="Operating Contribution"
                  value={money(operatingContribution, currency)}
                  subtitle={`Gross contribution: ${money(grossContribution, currency)}`}
                  positive={operatingContribution >= 0}
                  danger={operatingContribution < 0}
                />

                <MetricCard
                  title="Net External Cash Flow"
                  value={money(netCash, currency)}
                  subtitle={`${money(row.cashIn, currency)} in · ${money(row.cashOut, currency)} out`}
                  positive={netCash >= 0}
                  danger={netCash < 0}
                />
              </div>
            </section>
          );
        })
      )}

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs leading-5 text-blue-800">
          <strong>Management accounting basis:</strong> confirmed booking
          net revenue is compared with approved supplier commitments, approved
          direct expenses, revenue-reducing refunds and approved overhead.
          Cash flow is shown separately from profitability and excludes internal
          bank transfers and opening-balance transactions.
        </p>
      </section>
    </div>
  );
}

function AlertCard({
  title,
  value,
  href,
  danger,
}: {
  title: string;
  value: number;
  href: string;
  danger: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#8B0000]/40"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className={`mt-2 text-3xl font-bold ${danger ? "text-amber-700" : "text-[#001F3F]"}`}>
        {value}
      </p>

      <p className="mt-2 text-xs font-semibold text-[#8B0000]">
        Review →
      </p>
    </Link>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  positive = false,
  warning = false,
  danger = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          danger
            ? "text-red-700"
            : warning
              ? "text-amber-700"
              : positive
                ? "text-emerald-700"
                : "text-[#001F3F]"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
