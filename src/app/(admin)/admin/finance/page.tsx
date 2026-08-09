import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  BookingStatus,
  ExpenseApprovalStatus,
  ExpensePaymentStatus,
  RefundStatus,
  Role,
  SupplierPayableApprovalStatus,
  SupplierPayablePaymentStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type CurrencyMap = Record<
  string,
  number
>;

function money(
  value: number,
  currency: string,
) {
  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      },
    ).format(value);
  } catch {
    return `${currency} ${value.toFixed(
      2,
    )}`;
  }
}

function formatDate(
  value: Date | null | undefined,
) {
  if (!value) {
    return "-";
  }

  return value.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function enumLabel(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function addCurrency(
  totals: CurrencyMap,
  currency: string,
  amount: number,
) {
  const normalized =
    currency
      .trim()
      .toUpperCase() ||
    "EUR";

  totals[normalized] =
    (totals[normalized] ??
      0) + amount;
}

function getTransactionBadge(
  type: BankTransactionType,
) {
  switch (type) {
    case BankTransactionType.CUSTOMER_RECEIPT:
      return "bg-emerald-100 text-emerald-800";

    case BankTransactionType.SUPPLIER_PAYMENT:
      return "bg-amber-100 text-amber-800";

    case BankTransactionType.EXPENSE_PAYMENT:
      return "bg-orange-100 text-orange-800";

    case BankTransactionType.REFUND:
      return "bg-red-100 text-red-800";

    case BankTransactionType.TRANSFER_OUT:
    case BankTransactionType.TRANSFER_IN:
      return "bg-blue-100 text-blue-800";

    case BankTransactionType.REVERSAL:
      return "bg-purple-100 text-purple-800";

    case BankTransactionType.ADJUSTMENT:
      return "bg-slate-200 text-slate-800";

    case BankTransactionType.OPENING_BALANCE:
      return "bg-cyan-100 text-cyan-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function AdminFinancePage() {
  const session =
    await getServerSession(
      authOptions,
    );

  if (
    !session?.user ||
    session.user.role !==
      Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const now = new Date();

  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  );

  const [
    bankAccounts,
    ledgerByAccount,
    monthCashRows,
    recentTransactions,
    payableSummary,
    receivableSummary,
    pendingRefundSummary,
    paidExpenseSummary,
    overduePayablesCount,
    pendingExpenseApprovals,
    pendingRefundCount,
  ] = await Promise.all([
    // ========================================================
    // BANK ACCOUNTS
    // ========================================================

    db.bankAccount.findMany({
      where: {
        isActive: true,
      },

      orderBy: [
        {
          currency: "asc",
        },
        {
          name: "asc",
        },
      ],

      select: {
        id: true,
        name: true,
        currency: true,
        openingBalance: true,
        notes: true,
      },
    }),

    // ========================================================
    // LEDGER MOVEMENT PER BANK ACCOUNT
    //
    // OPENING_BALANCE transactions are excluded because
    // BankAccount.openingBalance is already used below.
    // ========================================================

    db.bankTransaction.groupBy({
      by: [
        "bankAccountId",
        "direction",
      ],

      where: {
        status:
          BankTransactionStatus.POSTED,

        type: {
          not:
            BankTransactionType.OPENING_BALANCE,
        },
      },

      _sum: {
        amount: true,
      },
    }),

    // ========================================================
    // MONTH-TO-DATE EXTERNAL CASH FLOW
    //
    // Internal transfers and opening balances are excluded.
    // ========================================================

    db.bankTransaction.groupBy({
      by: [
        "currency",
        "direction",
      ],

      where: {
        status:
          BankTransactionStatus.POSTED,

        transactionDate: {
          gte: monthStart,
        },

        type: {
          notIn: [
            BankTransactionType.TRANSFER_IN,
            BankTransactionType.TRANSFER_OUT,
            BankTransactionType.OPENING_BALANCE,
          ],
        },
      },

      _sum: {
        amount: true,
      },
    }),

    // ========================================================
    // RECENT LEDGER
    // ========================================================

    db.bankTransaction.findMany({
      where: {
        status:
          BankTransactionStatus.POSTED,
      },

      orderBy: {
        transactionDate:
          "desc",
      },

      take: 15,

      select: {
        id: true,
        type: true,
        direction: true,
        amount: true,
        currency: true,
        transactionDate: true,
        reference: true,
        description: true,

        bankAccount: {
          select: {
            id: true,
            name: true,
          },
        },

        booking: {
          select: {
            id: true,
            bookingReference:
              true,
            bookingDisplayCode:
              true,
          },
        },

        tour: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),

    // ========================================================
    // SUPPLIER LIABILITIES
    //
    // Only approved, outstanding supplier obligations.
    // ========================================================

    db.supplierPayable.groupBy({
      by: ["currency"],

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
      },

      _sum: {
        balance: true,
      },

      _count: {
        _all: true,
      },
    }),

    // ========================================================
    // CUSTOMER RECEIVABLES
    //
    // IMPORTANT:
    // Only CONFIRMED bookings represent recognized customer
    // receivables.
    //
    // PENDING, ON_REQUEST and WAITLIST remain pipeline.
    // ========================================================

    db.booking.groupBy({
      by: ["currency"],

      where: {
        status:
          BookingStatus.CONFIRMED,

        amountDue: {
          gt: 0,
        },
      },

      _sum: {
        amountDue: true,
      },

      _count: {
        _all: true,
      },
    }),

    // ========================================================
    // REFUND COMMITMENTS
    //
    // PENDING + APPROVED refunds represent amounts that may
    // still require customer settlement.
    // ========================================================

    db.refund.groupBy({
      by: [
        "currency",
        "status",
      ],

      where: {
        status: {
          in: [
            RefundStatus.PENDING,
            RefundStatus.APPROVED,
          ],
        },
      },

      _sum: {
        amount: true,
      },
    }),

    // ========================================================
    // PAID DIRECT / OVERHEAD EXPENSES
    //
    // This section is deliberately payment-oriented.
    // Recognized profitability uses approved costs elsewhere.
    // ========================================================

    db.expense.groupBy({
      by: [
        "currency",
        "costType",
      ],

      where: {
        approvalStatus:
          ExpenseApprovalStatus.APPROVED,

        paymentStatus:
          ExpensePaymentStatus.PAID,
      },

      _sum: {
        amount: true,
      },
    }),

    // ========================================================
    // OVERDUE PAYABLE ALERT
    // ========================================================

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

    // ========================================================
    // PENDING EXPENSE APPROVALS
    // ========================================================

    db.expense.count({
      where: {
        approvalStatus:
          ExpenseApprovalStatus.PENDING_APPROVAL,
      },
    }),

    // ========================================================
    // PENDING REFUNDS
    // ========================================================

    db.refund.count({
      where: {
        status:
          RefundStatus.PENDING,
      },
    }),
  ]);

  // ========================================================
  // BANK BALANCES
  // ========================================================

  const ledgerMovementByAccount =
    new Map<
      string,
      {
        incoming: number;
        outgoing: number;
      }
    >();

  for (
    const row of ledgerByAccount
  ) {
    const current =
      ledgerMovementByAccount.get(
        row.bankAccountId,
      ) ?? {
        incoming: 0,
        outgoing: 0,
      };

    const amount =
      Number(
        row._sum.amount ??
          0,
      );

    if (
      row.direction ===
      BankTransactionDirection.IN
    ) {
      current.incoming +=
        amount;
    } else {
      current.outgoing +=
        amount;
    }

    ledgerMovementByAccount.set(
      row.bankAccountId,
      current,
    );
  }

  const accountPositions =
    bankAccounts.map(
      (account) => {
        const movement =
          ledgerMovementByAccount.get(
            account.id,
          ) ?? {
            incoming: 0,
            outgoing: 0,
          };

        /*
         * Source of truth:
         *
         * Opening Balance
         * + posted IN transactions
         * - posted OUT transactions
         *
         * OPENING_BALANCE ledger entries were excluded
         * from movement above to prevent double-counting.
         */
        const ledgerBalance =
          account.openingBalance +
          movement.incoming -
          movement.outgoing;

        return {
          ...account,

          ledgerIn:
            movement.incoming,

          ledgerOut:
            movement.outgoing,

          ledgerBalance,
        };
      },
    );

  const bankTotals:
    CurrencyMap = {};

  for (
    const account of accountPositions
  ) {
    addCurrency(
      bankTotals,
      account.currency,
      account.ledgerBalance,
    );
  }

  // ========================================================
  // MONTH CASH FLOW
  // ========================================================

  const cashIn:
    CurrencyMap = {};

  const cashOut:
    CurrencyMap = {};

  for (
    const row of monthCashRows
  ) {
    const amount =
      Number(
        row._sum.amount ??
          0,
      );

    if (
      row.direction ===
      BankTransactionDirection.IN
    ) {
      addCurrency(
        cashIn,
        row.currency,
        amount,
      );
    } else {
      addCurrency(
        cashOut,
        row.currency,
        amount,
      );
    }
  }

  const cashCurrencies =
    Array.from(
      new Set([
        ...Object.keys(
          cashIn,
        ),
        ...Object.keys(
          cashOut,
        ),
      ]),
    ).sort();

  // ========================================================
  // SUPPLIER LIABILITIES
  // ========================================================

  const supplierLiabilities =
    payableSummary.map(
      (row) => ({
        currency:
          row.currency,

        amount:
          Number(
            row._sum.balance ??
              0,
          ),

        count:
          row._count._all,
      }),
    );

  // ========================================================
  // CUSTOMER RECEIVABLES
  // ========================================================

  const receivables =
    receivableSummary.map(
      (row) => ({
        currency:
          row.currency,

        amount:
          row._sum.amountDue ??
          0,

        count:
          row._count._all,
      }),
    );

  // ========================================================
  // REFUND COMMITMENTS
  // ========================================================

  const refundCommitments:
    CurrencyMap = {};

  for (
    const row of pendingRefundSummary
  ) {
    addCurrency(
      refundCommitments,
      row.currency,
      Number(
        row._sum.amount ??
          0,
      ),
    );
  }

  // ========================================================
  // PAID EXPENSES
  // ========================================================

  const directTourCosts:
    CurrencyMap = {};

  const overheadCosts:
    CurrencyMap = {};

  for (
    const row of paidExpenseSummary
  ) {
    const amount =
      row._sum.amount ??
      0;

    if (
      row.costType ===
      "DIRECT_TOUR_COST"
    ) {
      addCurrency(
        directTourCosts,
        row.currency,
        amount,
      );
    } else {
      addCurrency(
        overheadCosts,
        row.currency,
        amount,
      );
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Epoch Journeys ERP
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Finance Center
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Consolidated bank
            positions, confirmed
            customer receivables,
            approved supplier
            liabilities, expenses,
            refunds and posted Bank
            Ledger activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <FinanceLink
            href="/admin/finance/expenses/create"
            label="+ Add Direct Expense"
            primary
          />

          <FinanceLink
            href="/admin/finance/expenses"
            label="Finance Entries"
          />

          <FinanceLink
            href="/admin/finance/profitability"
            label="Profitability"
          />

          <FinanceLink
            href="/admin/supplier-payables"
            label="Supplier Payables"
          />

          <FinanceLink
            href="/admin/finance/bank-transfers"
            label="Bank Transfers"
          />

          <FinanceLink
            href="/admin/finance/bank-statements"
            label="Bank Statements"
          />

          <FinanceLink
            href="/admin/finance/reconciliation"
            label="Bank Reconciliation"
          />

          <FinanceLink
            href="/admin/finance/documents"
            label="Documents"
          />
        </div>
      </div>

      {/* ================================================== */}
      {/* ALERTS */}
      {/* ================================================== */}

      {(overduePayablesCount >
        0 ||
        pendingExpenseApprovals >
          0 ||
        pendingRefundCount >
          0) && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-amber-950">
                Finance attention
                required
              </h2>

              <p className="mt-1 text-sm text-amber-800">
                There are finance
                items requiring review
                or action.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {overduePayablesCount >
                0 && (
                <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-800">
                  {
                    overduePayablesCount
                  }{" "}
                  overdue supplier
                  payable
                  {overduePayablesCount ===
                  1
                    ? ""
                    : "s"}
                </span>
              )}

              {pendingExpenseApprovals >
                0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-900">
                  {
                    pendingExpenseApprovals
                  }{" "}
                  expense approval
                  {pendingExpenseApprovals ===
                  1
                    ? ""
                    : "s"}
                </span>
              )}

              {pendingRefundCount >
                0 && (
                <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-800">
                  {
                    pendingRefundCount
                  }{" "}
                  pending refund
                  {pendingRefundCount ===
                  1
                    ? ""
                    : "s"}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================================================== */}
      {/* HIGH LEVEL CARDS */}
      {/* ================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Bank Position"
          description="Opening balances plus posted ledger movements."
        >
          <CurrencyValues
            totals={
              bankTotals
            }
            empty="No active accounts"
          />
        </MetricCard>

        <MetricCard
          title="Supplier Liabilities"
          description="Outstanding balances on approved supplier payables."
        >
          {supplierLiabilities.length >
          0 ? (
            <div className="space-y-1.5">
              {supplierLiabilities.map(
                (item) => (
                  <div
                    key={
                      item.currency
                    }
                    className="flex items-end justify-between gap-3"
                  >
                    <span className="text-xl font-bold text-amber-700">
                      {money(
                        item.amount,
                        item.currency,
                      )}
                    </span>

                    <span className="text-xs text-slate-500">
                      {
                        item.count
                      }{" "}
                      payable
                      {item.count ===
                      1
                        ? ""
                        : "s"}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <EmptyValue text="No outstanding approved payables" />
          )}
        </MetricCard>

        <MetricCard
          title="Customer Receivables"
          description="Outstanding balances on confirmed bookings only."
        >
          {receivables.length >
          0 ? (
            <div className="space-y-1.5">
              {receivables.map(
                (item) => (
                  <div
                    key={
                      item.currency
                    }
                    className="flex items-end justify-between gap-3"
                  >
                    <span className="text-xl font-bold text-[#001F3F]">
                      {money(
                        item.amount,
                        item.currency,
                      )}
                    </span>

                    <span className="text-xs text-slate-500">
                      {
                        item.count
                      }{" "}
                      confirmed booking
                      {item.count ===
                      1
                        ? ""
                        : "s"}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <EmptyValue text="No confirmed booking receivables" />
          )}
        </MetricCard>

        <MetricCard
          title="Refund Commitments"
          description="Pending and approved customer refunds awaiting final settlement."
        >
          <CurrencyValues
            totals={
              refundCommitments
            }
            empty="No refund commitments"
            negative
          />
        </MetricCard>
      </div>

      {/* ================================================== */}
      {/* ACCOUNTING ARCHITECTURE */}
      {/* ================================================== */}

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50">
        <div className="grid lg:grid-cols-3">
          <div className="border-b border-blue-100 p-5 lg:border-b-0 lg:border-r">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Receivables
            </p>

            <p className="mt-2 font-semibold text-blue-950">
              Confirmed Booking
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              Customer deposits and
              installments reduce the
              booking balance. They do
              not create additional
              revenue.
            </p>
          </div>

          <div className="border-b border-blue-100 p-5 lg:border-b-0 lg:border-r">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Payables
            </p>

            <p className="mt-2 font-semibold text-blue-950">
              Approved Supplier
              Liability
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              Supplier deposits and
              installments reduce the
              liability. They do not
              create another expense.
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Cash
            </p>

            <p className="mt-2 font-semibold text-blue-950">
              Posted Bank Ledger
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              Actual receipts and
              payments affect cash
              independently from
              revenue and cost
              recognition.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* TOUR & DEPARTURE PROFITABILITY */}
      {/* ================================================== */}

      <section className="overflow-hidden rounded-2xl border border-[#001F3F]/15 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
          <div className="p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#8B0000]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                Management Reporting
              </span>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                Live Finance Data
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-bold text-[#001F3F]">
              Tour & Departure
              Profitability
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Analyze confirmed booking
              revenue against approved
              supplier commitments,
              supplier credits, approved
              direct tour costs and
              applicable customer
              refunds.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ProfitabilityFeature
                label="Revenue"
                description="Confirmed booking revenue by tour and departure."
              />

              <ProfitabilityFeature
                label="Supplier Costs"
                description="Approved supplier costs net of supplier credits."
              />

              <ProfitabilityFeature
                label="Direct Costs"
                description="Approved direct tour operating expenses."
              />

              <ProfitabilityFeature
                label="Gross Profit"
                description="Revenue less recognized operating costs and applicable refunds."
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/admin/finance/profitability"
                className="inline-flex items-center justify-center rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
              >
                Open Profitability
              </Link>

              <p className="text-xs leading-5 text-slate-500">
                Analyze performance
                from the tour level
                down to individual
                departures.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between bg-[#001F3F] p-6 text-white sm:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                Profitability Formula
              </p>

              <div className="mt-5 space-y-3">
                <ProfitFormulaRow
                  label="Confirmed Net Revenue"
                  symbol="+"
                />

                <ProfitFormulaRow
                  label="Approved Supplier Costs"
                  symbol="−"
                />

                <ProfitFormulaRow
                  label="Approved Direct Tour Costs"
                  symbol="−"
                />

                <ProfitFormulaRow
                  label="Revenue-Reducing Refunds"
                  symbol="−"
                />

                <div className="border-t border-white/20 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-white">
                      Gross Profit
                    </span>

                    <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-[#001F3F]">
                      =
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-8 text-xs leading-5 text-slate-300">
              Customer receipts,
              supplier payments and
              expense payments are
              settlement activity and
              are not counted again in
              profitability.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* FINANCE DOCUMENTS */}
      {/* ================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Document Management
            </p>

            <h2 className="mt-1 text-lg font-bold text-[#001F3F]">
              Finance Documents
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Securely manage supplier
              invoices, expense
              receipts, payment proofs,
              customer refund proofs,
              bank statements, transfer
              confirmations, tax
              documents and other
              finance records.
            </p>
          </div>

          <Link
            href="/admin/finance/documents"
            className="inline-flex w-fit items-center justify-center rounded-xl bg-[#001F3F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002b57]"
          >
            Open Document Center
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DocumentFeature
            title="Invoices & Receipts"
            description="Supplier invoices, expense invoices and receipts."
          />

          <DocumentFeature
            title="Payment Proofs"
            description="Supplier payments, customer payments and refund proofs."
          />

          <DocumentFeature
            title="Bank Documents"
            description="Statements, transfers and supporting bank records."
          />

          <DocumentFeature
            title="Tax & Agreements"
            description="Tax records, contracts, agreements and credit notes."
          />
        </div>
      </section>

      {/* ================================================== */}
      {/* MONTH-TO-DATE CASH FLOW */}
      {/* ================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#001F3F]">
              Month-to-Date Cash
              Flow
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              External posted cash
              movements only. Internal
              bank transfers and
              opening balances are
              excluded.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {monthStart.toLocaleDateString(
              "en-GB",
              {
                month: "long",
                year: "numeric",
              },
            )}
          </span>
        </div>

        {cashCurrencies.length ===
        0 ? (
          <EmptyValue text="No posted cash activity this month" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cashCurrencies.map(
              (currency) => {
                const incoming =
                  cashIn[
                    currency
                  ] ?? 0;

                const outgoing =
                  cashOut[
                    currency
                  ] ?? 0;

                const net =
                  incoming -
                  outgoing;

                return (
                  <div
                    key={
                      currency
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-slate-900">
                        {currency}
                      </p>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          net >= 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        Net{" "}
                        {net >= 0
                          ? "+"
                          : ""}
                        {money(
                          net,
                          currency,
                        )}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          Cash In
                        </p>

                        <p className="mt-1 font-bold text-emerald-700">
                          {money(
                            incoming,
                            currency,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Cash Out
                        </p>

                        <p className="mt-1 font-bold text-red-700">
                          {money(
                            outgoing,
                            currency,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>

      {/* ================================================== */}
      {/* PAID COSTS */}
      {/* ================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-[#001F3F]">
              Paid Direct Tour Costs
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cash-settled Expense
              records classified as
              Direct Tour Cost.
            </p>
          </div>

          <div className="mt-5">
            <CurrencyValues
              totals={
                directTourCosts
              }
              empty="No paid direct tour expenses"
              negative
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            This is a payment-oriented
            view. Profitability uses
            approved direct costs
            regardless of whether they
            have already been paid.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-[#001F3F]">
              Paid Overhead
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cash-settled
              administration,
              marketing, IT, office,
              staff and other company
              overhead expenses.
            </p>
          </div>

          <div className="mt-5">
            <CurrencyValues
              totals={
                overheadCosts
              }
              empty="No paid overhead expenses"
              negative
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Company overhead remains
            separate from individual
            tour profitability.
          </p>
        </section>
      </div>

      {/* ================================================== */}
      {/* BANK ACCOUNTS */}
      {/* ================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#001F3F]">
              Bank & Cash Positions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ledger-calculated
              balances by active
              account.
            </p>
          </div>

          <Link
            href="/admin/finance/bank-transfers"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Transfer Funds
          </Link>
        </div>

        {accountPositions.length ===
        0 ? (
          <EmptyValue text="No active bank or cash accounts" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Account
                  </th>

                  <th className="px-4 py-3">
                    Currency
                  </th>

                  <th className="px-4 py-3 text-right">
                    Opening
                  </th>

                  <th className="px-4 py-3 text-right">
                    Ledger In
                  </th>

                  <th className="px-4 py-3 text-right">
                    Ledger Out
                  </th>

                  <th className="px-4 py-3 text-right">
                    Ledger Balance
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {accountPositions.map(
                  (account) => (
                    <tr
                      key={
                        account.id
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {
                            account.name
                          }
                        </p>

                        {account.notes ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {
                              account.notes
                            }
                          </p>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {
                          account.currency
                        }
                      </td>

                      <td className="px-4 py-3 text-right text-slate-600">
                        {money(
                          account.openingBalance,
                          account.currency,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-emerald-700">
                        {money(
                          account.ledgerIn,
                          account.currency,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-red-700">
                        {money(
                          account.ledgerOut,
                          account.currency,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-base font-bold text-[#001F3F]">
                        {money(
                          account.ledgerBalance,
                          account.currency,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs leading-5 text-blue-800">
            <strong>
              Ledger Balance
            </strong>{" "}
            is calculated from Bank
            Account Opening Balance +
            posted IN transactions −
            posted OUT transactions.
            Opening-balance ledger
            transactions are excluded
            from the movement totals so
            the starting balance is not
            counted twice.
          </p>
        </div>
      </section>

      {/* ================================================== */}
      {/* RECENT LEDGER */}
      {/* ================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Recent Bank Ledger
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest posted customer
            receipts, supplier
            payments, expenses,
            refunds, transfers and
            adjustments.
          </p>
        </div>

        {recentTransactions.length ===
        0 ? (
          <EmptyValue text="No Bank Ledger transactions yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Type
                  </th>

                  <th className="px-4 py-3">
                    Account
                  </th>

                  <th className="px-4 py-3">
                    Description
                  </th>

                  <th className="px-4 py-3">
                    Booking / Tour
                  </th>

                  <th className="px-4 py-3 text-right">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map(
                  (
                    transaction,
                  ) => {
                    const incoming =
                      transaction.direction ===
                      BankTransactionDirection.IN;

                    return (
                      <tr
                        key={
                          transaction.id
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDate(
                            transaction.transactionDate,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getTransactionBadge(
                              transaction.type,
                            )}`}
                          >
                            {enumLabel(
                              transaction.type,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-900">
                          {
                            transaction.bankAccount
                              .name
                          }
                        </td>

                        <td className="max-w-[280px] px-4 py-3">
                          <p className="truncate text-slate-800">
                            {transaction.description ||
                              "-"}
                          </p>

                          {transaction.reference ? (
                            <p className="mt-0.5 text-xs text-slate-500">
                              Ref:{" "}
                              {
                                transaction.reference
                              }
                            </p>
                          ) : null}
                        </td>

                        <td className="px-4 py-3">
                          {transaction.booking ? (
                            <Link
                              href={`/admin/bookings/${transaction.booking.id}`}
                              className="font-medium text-blue-700 hover:underline"
                            >
                              {transaction.booking.bookingDisplayCode ||
                                transaction.booking.bookingReference}
                            </Link>
                          ) : transaction.tour ? (
                            <span className="text-slate-700">
                              {
                                transaction.tour
                                  .title
                              }
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              -
                            </span>
                          )}
                        </td>

                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                            incoming
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          {incoming
                            ? "+"
                            : "-"}
                          {money(
                            Number(
                              transaction.amount,
                            ),
                            transaction.currency,
                          )}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ======================================================== */
/* UI HELPERS */
/* ======================================================== */

function FinanceLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
          : "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
      }
    >
      {label}
    </Link>
  );
}

function MetricCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-950">
        {title}
      </p>

      <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

function DocumentFeature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ProfitabilityFeature({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-bold text-[#001F3F]">
        {label}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ProfitFormulaRow({
  label,
  symbol,
}: {
  label: string;
  symbol: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/10 px-4 py-3">
      <span className="text-sm font-medium text-slate-100">
        {label}
      </span>

      <span className="text-lg font-bold text-white">
        {symbol}
      </span>
    </div>
  );
}

function CurrencyValues({
  totals,
  empty,
  negative = false,
}: {
  totals: CurrencyMap;
  empty: string;
  negative?: boolean;
}) {
  const entries =
    Object.entries(
      totals,
    ).sort(
      (
        [currencyA],
        [currencyB],
      ) =>
        currencyA.localeCompare(
          currencyB,
        ),
    );

  if (
    entries.length === 0
  ) {
    return (
      <EmptyValue
        text={empty}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map(
        ([
          currency,
          value,
        ]) => (
          <div
            key={currency}
            className="flex items-baseline justify-between gap-3"
          >
            <span
              className={`text-xl font-bold ${
                negative
                  ? "text-red-700"
                  : "text-[#001F3F]"
              }`}
            >
              {negative
                ? "-"
                : ""}
              {money(
                value,
                currency,
              )}
            </span>

            <span className="text-xs font-semibold text-slate-400">
              {currency}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

function EmptyValue({
  text,
}: {
  text: string;
}) {
  return (
    <p className="text-sm text-slate-400">
      {text}
    </p>
  );
}