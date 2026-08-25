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
  PaymentRecordStatus,
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
  customerReceived: number;
  receivables: number;

  supplierCommitted: number;
  supplierPaid: number;
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
    customerReceived: 0,
    receivables: 0,

    supplierCommitted: 0,
    supplierPaid: 0,
    supplierOutstanding: 0,

    directCosts: 0,
    overhead: 0,

    revenueRefunds: 0,
    cashOnlyRefunds: 0,

    cashIn: 0,
    cashOut: 0,
  };
}

function normalizeCurrency(
  value: string | null | undefined,
) {
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
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function parseEnd(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T23:59:59.999Z`);

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function money(
  value: number,
  currency: string,
) {
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

function refundReducesRevenue(
  reason: RefundReason,
) {
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

  const dateRange =
    from || to
      ? {
          ...(from
            ? {
                gte: from,
              }
            : {}),

          ...(to
            ? {
                lte: to,
              }
            : {}),
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
    // ====================================================
    // BOOKINGS / REVENUE / RECEIVABLES
    // ====================================================

    db.booking.findMany({
      where: {
        status: {
          not: BookingStatus.CANCELLED,
        },

        ...(dateRange
          ? {
              createdAt: dateRange,
            }
          : {}),
      },

      select: {
        id: true,
        currency: true,
        totalPrice: true,
        netAmount: true,
        amountPaid: true,

        payments: {
          where: {
            status: PaymentRecordStatus.RECEIVED,
          },

          select: {
            amount: true,
          },
        },
      },
    }),

    // ====================================================
    // SUPPLIER PAYABLES
    // ====================================================

    db.supplierPayable.findMany({
      where: {
        approvalStatus:
          SupplierPayableApprovalStatus.APPROVED,

        ...(dateRange
          ? {
              createdAt: dateRange,
            }
          : {}),
      },

      select: {
        id: true,
        bookingId: true,
        supplierId: true,
        tourId: true,
        currency: true,
        approvedAmount: true,
        creditAmount: true,
        amountPaid: true,
        balance: true,
        paymentStatus: true,
      },
    }),

    // ====================================================
    // ADDITIONAL EXPENSES
    // ====================================================

    db.expense.findMany({
      where: {
        approvalStatus:
          ExpenseApprovalStatus.APPROVED,

        ...(dateRange
          ? {
              expenseDate: dateRange,
            }
          : {}),
      },

      select: {
        id: true,
        currency: true,
        amount: true,
        costType: true,
        bookingId: true,
        supplierId: true,
        tourId: true,
      },
    }),

    // ====================================================
    // REFUNDS
    // ====================================================

    db.refund.findMany({
      where: {
        status: {
          in: [
            RefundStatus.APPROVED,
            RefundStatus.PAID,
          ],
        },

        ...(dateRange
          ? {
              refundDate: dateRange,
            }
          : {}),
      },

      select: {
        currency: true,
        amount: true,
        reason: true,
      },
    }),

    // ====================================================
    // CASH MOVEMENT
    // ====================================================

    db.bankTransaction.groupBy({
      by: [
        "currency",
        "direction",
      ],

      where: {
        status:
          BankTransactionStatus.POSTED,

        type: {
          notIn: [
            BankTransactionType.TRANSFER_IN,
            BankTransactionType.TRANSFER_OUT,
            BankTransactionType.OPENING_BALANCE,
          ],
        },

        ...(dateRange
          ? {
              transactionDate: dateRange,
            }
          : {}),
      },

      _sum: {
        amount: true,
      },
    }),

    // ====================================================
    // CONTROL COUNTERS
    // ====================================================

    db.supplierPayable.count({
      where: {
        approvalStatus:
          SupplierPayableApprovalStatus.APPROVED,

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
        approvalStatus:
          ExpenseApprovalStatus.PENDING_APPROVAL,
      },
    }),

    db.refund.count({
      where: {
        status: RefundStatus.PENDING,
      },
    }),

    db.bankTransaction.count({
      where: {
        status:
          BankTransactionStatus.POSTED,

        reconciliationId: null,

        type: {
          not:
            BankTransactionType.OPENING_BALANCE,
        },
      },
    }),
  ]);

  // ========================================================
  // SUMMARY STORAGE
  // ========================================================

  const summaries: Record<
    string,
    CurrencySummary
  > = {};

  // ========================================================
  // BOOKING REVENUE + RECEIVABLES
  // ========================================================

  for (const booking of bookings) {
    const row = getSummary(
      summaries,
      booking.currency,
    );

    const receivedFromPayments =
      booking.payments.reduce(
        (sum, payment) =>
          sum + payment.amount,
        0,
      );

    const received =
      booking.amountPaid > 0
        ? booking.amountPaid
        : receivedFromPayments;

    const outstanding = Math.max(
      booking.totalPrice - received,
      0,
    );

    row.recognizedRevenue +=
      booking.netAmount;

    row.customerReceived +=
      received;

    row.receivables +=
      outstanding;
  }

  // ========================================================
  // SUPPLIER PAYABLES
  // ========================================================

  for (const payable of supplierPayables) {
    const row = getSummary(
      summaries,
      payable.currency,
    );

    const approved = Number(
      payable.approvedAmount,
    );

    const credit = Number(
      payable.creditAmount,
    );

    const committed = Math.max(
      approved - credit,
      0,
    );

    const paid = Number(
      payable.amountPaid,
    );

    const outstanding =
      payable.paymentStatus ===
      SupplierPayablePaymentStatus.CANCELLED
        ? 0
        : Math.max(
            Number(payable.balance),
            0,
          );

    row.supplierCommitted +=
      committed;

    row.supplierPaid +=
      paid;

    row.supplierOutstanding +=
      outstanding;
  }

  // ========================================================
  // PREVENT DOUBLE COUNTING
  // ========================================================

  const automaticSupplierKeys = new Set(
    supplierPayables.map((payable) =>
      [
        payable.bookingId ?? "",
        payable.supplierId,
        payable.tourId ?? "",
      ].join("|"),
    ),
  );

  const validExpenses = expenses.filter(
    (expense) => {
      if (!expense.supplierId) {
        return true;
      }

      const key = [
        expense.bookingId ?? "",
        expense.supplierId,
        expense.tourId ?? "",
      ].join("|");

      return !automaticSupplierKeys.has(key);
    },
  );

  // ========================================================
  // ADDITIONAL EXPENSES
  // ========================================================

  for (const expense of validExpenses) {
    const row = getSummary(
      summaries,
      expense.currency,
    );

    if (
      expense.costType ===
      ExpenseCostType.DIRECT_TOUR_COST
    ) {
      row.directCosts += expense.amount;
    } else {
      row.overhead += expense.amount;
    }
  }

  // ========================================================
  // REFUNDS
  // ========================================================

  for (const refund of refunds) {
    const row = getSummary(
      summaries,
      refund.currency,
    );

    if (
      refundReducesRevenue(
        refund.reason,
      )
    ) {
      row.revenueRefunds += Number(
        refund.amount,
      );
    } else {
      row.cashOnlyRefunds += Number(
        refund.amount,
      );
    }
  }

  // ========================================================
  // CASH
  // ========================================================

  for (const cash of cashRows) {
    const row = getSummary(
      summaries,
      cash.currency,
    );

    const amount = Number(
      cash._sum.amount ?? 0,
    );

    if (
      cash.direction ===
      BankTransactionDirection.IN
    ) {
      row.cashIn += amount;
    } else {
      row.cashOut += amount;
    }
  }

  const currencies =
    Object.keys(summaries).sort();

  const secondaryButton =
    "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";

  const primaryButton =
    "rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002d5a]";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Management Summary
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Executive financial position covering booking revenue,
            collections, receivables, supplier commitments, additional
            costs, refunds and actual external cash movement.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance/reports"
            className={secondaryButton}
          >
            ← Back to Reports
          </Link>

          <Link
            href="/admin/finance"
            className={primaryButton}
          >
            Finance Dashboard
          </Link>
        </div>
      </div>

      {/* DATE FILTER */}

      <form className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div>
            <label
              htmlFor="from"
              className="text-sm font-semibold text-slate-700"
            >
              From
            </label>

            <input
              id="from"
              name="from"
              type="date"
              defaultValue={params.from || ""}
              className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="text-sm font-semibold text-slate-700"
            >
              To
            </label>

            <input
              id="to"
              name="to"
              type="date"
              defaultValue={params.to || ""}
              className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
          >
            Apply Filter
          </button>

          <Link
            href="/admin/finance/reports/management-summary"
            className={secondaryButton}
          >
            Clear
          </Link>
        </div>
      </form>

      {/* CONTROL COUNTERS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/admin/finance/reports/accounts-payable"
          className="rounded-2xl border bg-red-50 p-5 shadow-sm transition hover:border-red-300"
        >
          <p className="text-sm font-medium text-red-700">
            Overdue Supplier Payables
          </p>

          <p className="mt-2 text-3xl font-bold text-red-800">
            {overduePayables}
          </p>
        </Link>

        <Link
          href="/admin/finance/expenses"
          className="rounded-2xl border bg-amber-50 p-5 shadow-sm transition hover:border-amber-300"
        >
          <p className="text-sm font-medium text-amber-700">
            Expenses Awaiting Approval
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-800">
            {pendingExpenseApprovals}
          </p>
        </Link>

        <Link
          href="/admin/finance/reports/refunds"
          className="rounded-2xl border bg-blue-50 p-5 shadow-sm transition hover:border-blue-300"
        >
          <p className="text-sm font-medium text-blue-700">
            Pending Refunds
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-800">
            {pendingRefunds}
          </p>
        </Link>

        <Link
          href="/admin/finance/reconciliation"
          className="rounded-2xl border bg-slate-50 p-5 shadow-sm transition hover:border-slate-400"
        >
          <p className="text-sm font-medium text-slate-600">
            Unreconciled Bank Transactions
          </p>

          <p className="mt-2 text-3xl font-bold text-[#001F3F]">
            {unreconciledTransactions}
          </p>
        </Link>
      </section>

      {/* CURRENCY SUMMARY */}

      {currencies.length > 0 ? (
        <div className="space-y-6">
          {currencies.map((currency) => {
            const row = summaries[currency];

            const netRevenue =
              row.recognizedRevenue -
              row.revenueRefunds;

            const totalOperatingCosts =
              row.supplierCommitted +
              row.directCosts +
              row.overhead;

            const managementProfit =
              netRevenue -
              totalOperatingCosts;

            const netCashMovement =
              row.cashIn -
              row.cashOut;

            const margin =
              netRevenue > 0
                ? (managementProfit /
                    netRevenue) *
                  100
                : 0;

            return (
              <section
                key={currency}
                className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[#001F3F]">
                      {currency} Management Position
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Values are shown in their original currency.
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                    {currency}
                  </span>
                </div>

                {/* REVENUE */}

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Revenue & Receivables
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-sm text-green-700">
                        Recognized Revenue
                      </p>

                      <p className="mt-2 text-2xl font-bold text-green-800">
                        {money(
                          row.recognizedRevenue,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="text-sm text-emerald-700">
                        Customer Received
                      </p>

                      <p className="mt-2 text-2xl font-bold text-emerald-800">
                        {money(
                          row.customerReceived,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-50 p-4">
                      <p className="text-sm text-amber-700">
                        Receivables
                      </p>

                      <p className="mt-2 text-2xl font-bold text-amber-800">
                        {money(
                          row.receivables,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-sm text-red-700">
                        Revenue Refunds
                      </p>

                      <p className="mt-2 text-2xl font-bold text-red-800">
                        {money(
                          row.revenueRefunds,
                          currency,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SUPPLIERS */}

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Supplier Position
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-slate-500">
                        Supplier Committed
                      </p>

                      <p className="mt-2 text-2xl font-bold text-[#001F3F]">
                        {money(
                          row.supplierCommitted,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-slate-500">
                        Supplier Paid
                      </p>

                      <p className="mt-2 text-2xl font-bold text-red-700">
                        {money(
                          row.supplierPaid,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-slate-500">
                        Supplier Outstanding
                      </p>

                      <p className="mt-2 text-2xl font-bold text-amber-700">
                        {money(
                          row.supplierOutstanding,
                          currency,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* COSTS */}

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Additional Costs
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-slate-500">
                        Direct Tour Costs
                      </p>

                      <p className="mt-2 text-2xl font-bold text-red-700">
                        {money(
                          row.directCosts,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-slate-500">
                        Overhead / Other Costs
                      </p>

                      <p className="mt-2 text-2xl font-bold text-red-700">
                        {money(
                          row.overhead,
                          currency,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* PROFIT */}

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Management Result
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-sm text-blue-700">
                        Net Revenue
                      </p>

                      <p className="mt-2 text-2xl font-bold text-blue-800">
                        {money(
                          netRevenue,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-sm text-red-700">
                        Total Operating Costs
                      </p>

                      <p className="mt-2 text-2xl font-bold text-red-800">
                        {money(
                          totalOperatingCosts,
                          currency,
                        )}
                      </p>
                    </div>

                    <div
                      className={`rounded-xl p-4 ${
                        managementProfit >= 0
                          ? "bg-emerald-50"
                          : "bg-red-50"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          managementProfit >= 0
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        Management Profit
                      </p>

                      <p
                        className={`mt-2 text-2xl font-bold ${
                          managementProfit >= 0
                            ? "text-emerald-800"
                            : "text-red-800"
                        }`}
                      >
                        {money(
                          managementProfit,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-600">
                        Profit Margin
                      </p>

                      <p
                        className={`mt-2 text-2xl font-bold ${
                          margin >= 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* CASH */}

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Actual Bank / Cash Movement
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-slate-500">
                        Cash In
                      </p>

                      <p className="mt-2 text-2xl font-bold text-green-700">
                        {money(
                          row.cashIn,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-slate-500">
                        Cash Out
                      </p>

                      <p className="mt-2 text-2xl font-bold text-red-700">
                        {money(
                          row.cashOut,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-slate-500">
                        Net Cash Movement
                      </p>

                      <p
                        className={`mt-2 text-2xl font-bold ${
                          netCashMovement >= 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {money(
                          netCashMovement,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-slate-500">
                        Cash-Only Refunds
                      </p>

                      <p className="mt-2 text-2xl font-bold text-amber-700">
                        {money(
                          row.cashOnlyRefunds,
                          currency,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            No financial activity found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            There are no qualifying finance records for the selected
            reporting period.
          </p>
        </div>
      )}

      {/* REPORT LINKS */}

      <section className="rounded-2xl border bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-[#001F3F]">
          Detailed Finance Reports
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Open the supporting reports for detailed balances and
          transaction-level analysis.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/finance/reports/accounts-receivable"
            className={secondaryButton}
          >
            Accounts Receivable
          </Link>

          <Link
            href="/admin/finance/reports/accounts-payable"
            className={secondaryButton}
          >
            Accounts Payable
          </Link>

          <Link
            href="/admin/finance/reports/due-overdue"
            className={secondaryButton}
          >
            Due & Overdue
          </Link>

          <Link
            href="/admin/finance/reports/cash-bank"
            className={secondaryButton}
          >
            Cash & Bank
          </Link>

          <Link
            href="/admin/finance/reports/expenses"
            className={secondaryButton}
          >
            Expenses
          </Link>

          <Link
            href="/admin/finance/reports/general-ledger"
            className={secondaryButton}
          >
            General Ledger
          </Link>

          <Link
            href="/admin/finance/reports/refunds"
            className={secondaryButton}
          >
            Refunds
          </Link>
        </div>
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Management figures are presented separately by currency.
        Amounts are not converted between currencies. Supplier payable
        matching is used to prevent the same supplier cost from being
        counted again as an additional expense.
      </p>
    </div>
  );
}