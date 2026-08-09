import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  BookingStatus,
  ExpenseApprovalStatus,
  ExpenseCostType,
  ExpensePaymentStatus,
  RefundReason,
  RefundStatus,
  Role,
  SupplierPayableApprovalStatus,
  SupplierPayablePaymentStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

// ============================================================
// TYPES
// ============================================================

type PageProps = {
  params: Promise<{
    departureId: string;
  }>;
};

type CurrencySummary = {
  grossSales: number;
  commission: number;
  netRevenue: number;

  supplierCommitted: number;
  supplierPaid: number;
  supplierOutstanding: number;

  directCosts: number;
  directCostsPaid: number;

  revenueReducingRefunds: number;
  cashOnlyRefunds: number;

  cashReceived: number;
  cashPaid: number;

  receivables: number;

  grossProfit: number;
  margin: number | null;

  cashPosition: number;
};

type CurrencyMap = Record<
  string,
  CurrencySummary
>;

// ============================================================
// HELPERS
// ============================================================

function createSummary(): CurrencySummary {
  return {
    grossSales: 0,
    commission: 0,
    netRevenue: 0,

    supplierCommitted: 0,
    supplierPaid: 0,
    supplierOutstanding: 0,

    directCosts: 0,
    directCostsPaid: 0,

    revenueReducingRefunds: 0,
    cashOnlyRefunds: 0,

    cashReceived: 0,
    cashPaid: 0,

    receivables: 0,

    grossProfit: 0,
    margin: null,

    cashPosition: 0,
  };
}

function getSummary(
  map: CurrencyMap,
  currency: string,
) {
  const normalized =
    currency
      .trim()
      .toUpperCase() ||
    "EUR";

  if (!map[normalized]) {
    map[normalized] =
      createSummary();
  }

  return map[normalized];
}

function refundReducesRevenue(
  reason: RefundReason,
) {
  switch (reason) {
    case RefundReason.OVERPAYMENT:
    case RefundReason.DUPLICATE_PAYMENT:
      return false;

    case RefundReason.BOOKING_CANCELLATION:
    case RefundReason.PARTIAL_CANCELLATION:
    case RefundReason.SERVICE_NOT_PROVIDED:
    case RefundReason.PRICE_ADJUSTMENT:
    case RefundReason.GOODWILL:
    case RefundReason.OTHER:
    default:
      return true;
  }
}

function finalizeSummary(
  summary: CurrencySummary,
) {
  /*
   * PROFITABILITY
   *
   * Revenue and costs are recognized once.
   * Payments are settlement activity only.
   */
  summary.grossProfit =
    summary.netRevenue -
    summary.supplierCommitted -
    summary.directCosts -
    summary.revenueReducingRefunds;

  summary.margin =
    summary.netRevenue > 0
      ? (summary.grossProfit /
          summary.netRevenue) *
        100
      : null;

  /*
   * CASH POSITION
   *
   * Actual posted bank movement only.
   */
  summary.cashPosition =
    summary.cashReceived -
    summary.cashPaid;
}

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
  value:
    | Date
    | null
    | undefined,
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
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "Other";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function marginClass(
  margin: number | null,
) {
  if (margin === null) {
    return "bg-slate-100 text-slate-600";
  }

  if (margin >= 25) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (margin >= 15) {
    return "bg-green-100 text-green-800";
  }

  if (margin >= 5) {
    return "bg-amber-100 text-amber-800";
  }

  if (margin >= 0) {
    return "bg-orange-100 text-orange-800";
  }

  return "bg-red-100 text-red-800";
}

function refundImpactLabel(
  reason: RefundReason,
) {
  return refundReducesRevenue(
    reason,
  )
    ? "Revenue Reduction"
    : "Cash Correction";
}

function refundImpactClass(
  reason: RefundReason,
) {
  return refundReducesRevenue(
    reason,
  )
    ? "bg-red-100 text-red-700"
    : "bg-blue-100 text-blue-700";
}

// ============================================================
// PAGE
// ============================================================

export default async function DepartureProfitabilityPage({
  params,
}: PageProps) {
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

  const {
    departureId,
  } = await params;

  const departure =
    await db.departureDate.findUnique({
      where: {
        id: departureId,
      },

      select: {
        id: true,
        date: true,
        season: true,
        status: true,
        capacity: true,
        bookedSeats: true,

        tour: {
          select: {
            id: true,
            title: true,
            tourCode: true,
            category: true,
            destinations: true,
            duration: true,
          },
        },

        /*
         * Only confirmed bookings are
         * recognized as actual tour revenue.
         */
        bookings: {
          where: {
            status:
              BookingStatus.CONFIRMED,
          },

          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,

            bookingReference: true,
            bookingDisplayCode: true,
            bookingType: true,

            numberOfGuests: true,
            estimatedPax: true,
            finalPax: true,

            grossAmount: true,
            commissionAmount: true,
            netAmount: true,

            amountPaid: true,
            amountDue: true,

            currency: true,

            agencyNameSnapshot: true,
            agentNameSnapshot: true,
            customerName: true,
            groupName: true,
            groupLeaderName: true,

            paymentStatus: true,
            status: true,
          },
        },

        /*
         * Supplier payables represent
         * committed costs once approved.
         */
        supplierPayables: {
          where: {
            approvalStatus:
              SupplierPayableApprovalStatus.APPROVED,

            paymentStatus: {
              not:
                SupplierPayablePaymentStatus.CANCELLED,
            },
          },

          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,

            title: true,
            description: true,

            supplierNameSnapshot: true,
            serviceNameSnapshot: true,

            supplierInvoiceNumber: true,

            approvedAmount: true,
            creditAmount: true,
            amountPaid: true,
            balance: true,

            currency: true,

            invoiceDate: true,
            dueDate: true,

            paymentStatus: true,

            supplier: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },

        /*
         * Only approved direct tour costs
         * participate in profitability.
         */
        expenses: {
          where: {
            costType:
              ExpenseCostType.DIRECT_TOUR_COST,

            approvalStatus:
              ExpenseApprovalStatus.APPROVED,

            paymentStatus: {
              not:
                ExpensePaymentStatus.CANCELLED,
            },
          },

          orderBy: {
            expenseDate: "asc",
          },

          select: {
            id: true,

            title: true,
            description: true,

            category: true,
            expenseItem: true,

            amount: true,
            currency: true,

            paymentStatus: true,

            vendorName: true,

            expenseDate: true,
            paidAt: true,

            supplierInvoiceNumber: true,
            paymentReference: true,
          },
        },

        /*
         * Posted Bank Ledger entries are
         * the actual cash layer.
         */
        bankTransactions: {
          where: {
            status:
              BankTransactionStatus.POSTED,
          },

          orderBy: {
            transactionDate: "asc",
          },

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
                name: true,
              },
            },
          },
        },

        financeDocuments: {
          orderBy: {
            createdAt: "desc",
          },

          select: {
            id: true,
            title: true,
            type: true,
            originalFileName: true,
            fileSize: true,
            createdAt: true,
          },
        },
      },
    });

  if (!departure) {
    notFound();
  }

  // ==========================================================
  // REFUNDS
  // ==========================================================

  /*
   * Only refunds related to confirmed
   * bookings are included here.
   *
   * If a booking is CANCELLED, its
   * revenue is already excluded from
   * this profitability report.
   */
  const refunds =
    await db.refund.findMany({
      where: {
        booking: {
          departureDateId:
            departure.id,

          status:
            BookingStatus.CONFIRMED,
        },

        status: {
          in: [
            RefundStatus.APPROVED,
            RefundStatus.PAID,
          ],
        },
      },

      orderBy: {
        createdAt: "asc",
      },

      select: {
        id: true,

        amount: true,
        currency: true,

        status: true,
        reason: true,
        reasonDetails: true,

        refundDate: true,
        reference: true,

        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },
      },
    });

  // ==========================================================
  // BUILD SUMMARY
  // ==========================================================

  const summaries:
    CurrencyMap = {};

  let bookedPax = 0;

  // ----------------------------------------------------------
  // CONFIRMED BOOKING REVENUE
  // ----------------------------------------------------------

  for (
    const booking of departure.bookings
  ) {
    bookedPax +=
      booking.finalPax ??
      booking.numberOfGuests;

    const summary =
      getSummary(
        summaries,
        booking.currency,
      );

    summary.grossSales +=
      booking.grossAmount;

    summary.commission +=
      booking.commissionAmount;

    /*
     * Booking.netAmount is the revenue
     * basis after agent commission.
     */
    summary.netRevenue +=
      booking.netAmount;

    /*
     * Outstanding customer balance.
     */
    summary.receivables +=
      booking.amountDue;
  }

  // ----------------------------------------------------------
  // APPROVED SUPPLIER COMMITMENTS
  // ----------------------------------------------------------

  for (
    const payable of departure.supplierPayables
  ) {
    const summary =
      getSummary(
        summaries,
        payable.currency,
      );

    const approved =
      Number(
        payable.approvedAmount,
      );

    const credit =
      Number(
        payable.creditAmount,
      );

    /*
     * Supplier credit notes reduce the
     * economic supplier cost.
     */
    const committed =
      Math.max(
        approved -
          credit,
        0,
      );

    summary.supplierCommitted +=
      committed;

    summary.supplierPaid +=
      Number(
        payable.amountPaid,
      );

    summary.supplierOutstanding +=
      Number(
        payable.balance,
      );
  }

  // ----------------------------------------------------------
  // DIRECT TOUR EXPENSES
  // ----------------------------------------------------------

  for (
    const expense of departure.expenses
  ) {
    const summary =
      getSummary(
        summaries,
        expense.currency,
      );

    /*
     * Approved direct expense is
     * recognized once as a cost.
     */
    summary.directCosts +=
      expense.amount;

    /*
     * Payment is settlement information,
     * not another expense.
     */
    if (
      expense.paymentStatus ===
      ExpensePaymentStatus.PAID
    ) {
      summary.directCostsPaid +=
        expense.amount;
    }
  }

  // ----------------------------------------------------------
  // REFUND ACCOUNTING
  // ----------------------------------------------------------

  for (
    const refund of refunds
  ) {
    const summary =
      getSummary(
        summaries,
        refund.currency,
      );

    const amount =
      Number(
        refund.amount,
      );

    if (
      refundReducesRevenue(
        refund.reason,
      )
    ) {
      /*
       * Cancellation / service / price
       * refunds reduce profitability.
       */
      summary.revenueReducingRefunds +=
        amount;
    } else {
      /*
       * Overpayment and duplicate-payment
       * refunds are cash corrections only.
       */
      summary.cashOnlyRefunds +=
        amount;
    }
  }

  // ----------------------------------------------------------
  // ACTUAL CASH
  // ----------------------------------------------------------

  for (
    const transaction of departure.bankTransactions
  ) {
    const summary =
      getSummary(
        summaries,
        transaction.currency,
      );

    const amount =
      Number(
        transaction.amount,
      );

    if (
      transaction.type ===
        BankTransactionType.CUSTOMER_RECEIPT &&
      transaction.direction ===
        BankTransactionDirection.IN
    ) {
      summary.cashReceived +=
        amount;
    }

    if (
      transaction.direction ===
        BankTransactionDirection.OUT &&
      (
        transaction.type ===
          BankTransactionType.SUPPLIER_PAYMENT ||
        transaction.type ===
          BankTransactionType.EXPENSE_PAYMENT ||
        transaction.type ===
          BankTransactionType.REFUND
      )
    ) {
      summary.cashPaid +=
        amount;
    }
  }

  for (
    const summary of Object.values(
      summaries,
    )
  ) {
    finalizeSummary(
      summary,
    );
  }

  const currencies =
    Object.keys(
      summaries,
    ).sort();

  // ==========================================================
  // SUPPLIER BREAKDOWN
  // ==========================================================

  const supplierBreakdown =
    new Map<
      string,
      {
        key: string;
        name: string;
        type: string;

        currency: string;

        approved: number;
        credits: number;
        committed: number;

        paid: number;
        outstanding: number;

        payableCount: number;
      }
    >();

  for (
    const payable of departure.supplierPayables
  ) {
    const currency =
      payable.currency;

    const name =
      payable.supplierNameSnapshot ||
      payable.supplier.name;

    const key =
      `${payable.supplier.id}:${currency}`;

    const existing =
      supplierBreakdown.get(
        key,
      ) || {
        key,
        name,

        type:
          payable.supplier.type,

        currency,

        approved: 0,
        credits: 0,
        committed: 0,

        paid: 0,
        outstanding: 0,

        payableCount: 0,
      };

    const approved =
      Number(
        payable.approvedAmount,
      );

    const credit =
      Number(
        payable.creditAmount,
      );

    existing.approved +=
      approved;

    existing.credits +=
      credit;

    existing.committed +=
      Math.max(
        approved -
          credit,
        0,
      );

    existing.paid +=
      Number(
        payable.amountPaid,
      );

    existing.outstanding +=
      Number(
        payable.balance,
      );

    existing.payableCount +=
      1;

    supplierBreakdown.set(
      key,
      existing,
    );
  }

  const suppliers =
    Array.from(
      supplierBreakdown.values(),
    ).sort(
      (a, b) =>
        b.committed -
        a.committed,
    );

  // ==========================================================
  // EXPENSE ITEM BREAKDOWN
  // ==========================================================

  const expenseBreakdown =
    new Map<
      string,
      {
        key: string;
        label: string;
        currency: string;
        amount: number;
        paid: number;
        count: number;
      }
    >();

  for (
    const expense of departure.expenses
  ) {
    const label =
      enumLabel(
        expense.expenseItem ||
          expense.category,
      );

    const key =
      `${label}:${expense.currency}`;

    const existing =
      expenseBreakdown.get(
        key,
      ) || {
        key,
        label,

        currency:
          expense.currency,

        amount: 0,
        paid: 0,
        count: 0,
      };

    existing.amount +=
      expense.amount;

    if (
      expense.paymentStatus ===
      ExpensePaymentStatus.PAID
    ) {
      existing.paid +=
        expense.amount;
    }

    existing.count +=
      1;

    expenseBreakdown.set(
      key,
      existing,
    );
  }

  const expenseItems =
    Array.from(
      expenseBreakdown.values(),
    ).sort(
      (a, b) =>
        b.amount -
        a.amount,
    );

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ==================================================== */}
      {/* HEADER */}
      {/* ==================================================== */}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
              Departure Profitability
            </p>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {enumLabel(
                departure.status,
              )}
            </span>
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#001F3F]">
            {departure.tour.title}
          </h1>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            {departure.tour
              .tourCode && (
              <span>
                {
                  departure.tour
                    .tourCode
                }
              </span>
            )}

            <span>
              {formatDate(
                departure.date,
              )}
            </span>

            <span>
              {enumLabel(
                departure.season,
              )}
            </span>

            <span>
              {
                departure.tour
                  .duration
              }{" "}
              days
            </span>

            <span>
              {
                departure.tour
                  .destinations
                  .join(", ")
              }
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance/profitability"
            className={secondaryButton}
          >
            ← Profitability
          </Link>

          <Link
            href="/admin/finance"
            className={secondaryButton}
          >
            Finance Center
          </Link>

          <Link
            href="/admin/finance/expenses"
            className={secondaryButton}
          >
            Finance Entries
          </Link>
        </div>
      </div>

      {/* ==================================================== */}
      {/* ACCOUNTING PRINCIPLE */}
      {/* ==================================================== */}

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50">
        <div className="grid lg:grid-cols-2">
          <div className="border-b border-blue-100 p-5 lg:border-b-0 lg:border-r">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Profitability
            </p>

            <p className="mt-2 font-semibold text-blue-950">
              Confirmed Net Revenue −
              Approved Supplier Costs −
              Approved Direct Costs −
              Revenue-Reducing Refunds
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              Customer and supplier
              payments are settlement
              activity and are not counted
              again as revenue or cost.
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Cash Position
            </p>

            <p className="mt-2 font-semibold text-blue-950">
              Posted Customer Receipts −
              Posted Supplier, Expense &
              Refund Outflows
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              Cash performance remains
              separate from economic
              profitability and outstanding
              working-capital balances.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* OPERATING SNAPSHOT */}
      {/* ==================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TopCard
          label="Confirmed Pax"
          value={String(
            bookedPax,
          )}
          detail={`${departure.bookings.length} confirmed booking${
            departure.bookings.length ===
            1
              ? ""
              : "s"
          }`}
        />

        <TopCard
          label="Capacity"
          value={
            departure.capacity >
            0
              ? String(
                  departure.capacity,
                )
              : "-"
          }
          detail={
            departure.capacity >
            0
              ? `${(
                  (bookedPax /
                    departure.capacity) *
                  100
                ).toFixed(
                  1,
                )}% utilized`
              : "Capacity not set"
          }
        />

        <TopCard
          label="Supplier Items"
          value={String(
            departure
              .supplierPayables
              .length,
          )}
          detail="Approved commitments"
        />

        <TopCard
          label="Direct Expenses"
          value={String(
            departure.expenses
              .length,
          )}
          detail="Approved direct costs"
        />
      </div>

      {/* ==================================================== */}
      {/* FINANCIAL SUMMARY PER CURRENCY */}
      {/* ==================================================== */}

      {currencies.length === 0 ? (
        <EmptyState text="No recognized financial activity exists for this departure yet." />
      ) : (
        <div className="space-y-6">
          {currencies.map(
            (currency) => {
              const summary =
                summaries[
                  currency
                ];

              const costTotal =
                summary.supplierCommitted +
                summary.directCosts +
                summary.revenueReducingRefunds;

              const profitPerPax =
                bookedPax > 0
                  ? summary.grossProfit /
                    bookedPax
                  : null;

              const costPerPax =
                bookedPax > 0
                  ? costTotal /
                    bookedPax
                  : null;

              return (
                <section
                  key={currency}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Reporting Currency
                      </p>

                      <h2 className="text-xl font-bold text-[#001F3F]">
                        {currency}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-sm font-bold ${marginClass(
                        summary.margin,
                      )}`}
                    >
                      {summary.margin ===
                      null
                        ? "No Revenue"
                        : `${summary.margin.toFixed(
                            1,
                          )}% Margin`}
                    </span>
                  </div>

                  <div className="grid gap-0 lg:grid-cols-2">
                    {/* PROFIT */}

                    <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                        Profitability
                      </p>

                      <div className="mt-4 space-y-3">
                        <FinanceLine
                          label="Gross Booking Sales"
                          value={money(
                            summary.grossSales,
                            currency,
                          )}
                        />

                        <FinanceLine
                          label="Agent Commission"
                          value={`-${money(
                            summary.commission,
                            currency,
                          )}`}
                          negative
                        />

                        <FinanceLine
                          label="Net Revenue"
                          value={money(
                            summary.netRevenue,
                            currency,
                          )}
                          strong
                        />

                        <Divider />

                        <FinanceLine
                          label="Supplier Commitments"
                          value={`-${money(
                            summary.supplierCommitted,
                            currency,
                          )}`}
                          negative
                        />

                        <FinanceLine
                          label="Direct Tour Costs"
                          value={`-${money(
                            summary.directCosts,
                            currency,
                          )}`}
                          negative
                        />

                        <FinanceLine
                          label="Revenue-Reducing Refunds"
                          value={`-${money(
                            summary.revenueReducingRefunds,
                            currency,
                          )}`}
                          negative
                        />

                        <Divider />

                        <FinanceLine
                          label="Gross Profit"
                          value={money(
                            summary.grossProfit,
                            currency,
                          )}
                          success={
                            summary.grossProfit >=
                            0
                          }
                          negative={
                            summary.grossProfit <
                            0
                          }
                          large
                        />
                      </div>
                    </div>

                    {/* CASH */}

                    <div className="p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                        Cash & Working Capital
                      </p>

                      <div className="mt-4 space-y-3">
                        <FinanceLine
                          label="Cash Received"
                          value={money(
                            summary.cashReceived,
                            currency,
                          )}
                          success
                        />

                        <FinanceLine
                          label="Cash Paid"
                          value={`-${money(
                            summary.cashPaid,
                            currency,
                          )}`}
                          negative
                        />

                        <FinanceLine
                          label="Current Cash Position"
                          value={money(
                            summary.cashPosition,
                            currency,
                          )}
                          success={
                            summary.cashPosition >=
                            0
                          }
                          negative={
                            summary.cashPosition <
                            0
                          }
                          strong
                        />

                        <Divider />

                        <FinanceLine
                          label="Customer Receivables"
                          value={money(
                            summary.receivables,
                            currency,
                          )}
                        />

                        <FinanceLine
                          label="Supplier Outstanding"
                          value={money(
                            summary.supplierOutstanding,
                            currency,
                          )}
                        />

                        {summary.cashOnlyRefunds >
                          0 && (
                          <FinanceLine
                            label="Cash-Only Refund Corrections"
                            value={money(
                              summary.cashOnlyRefunds,
                              currency,
                            )}
                          />
                        )}

                        <Divider />

                        <FinanceLine
                          label="Cost Per Pax"
                          value={
                            costPerPax ===
                            null
                              ? "-"
                              : money(
                                  costPerPax,
                                  currency,
                                )
                          }
                        />

                        <FinanceLine
                          label="Profit Per Pax"
                          value={
                            profitPerPax ===
                            null
                              ? "-"
                              : money(
                                  profitPerPax,
                                  currency,
                                )
                          }
                          success={
                            profitPerPax !==
                              null &&
                            profitPerPax >=
                              0
                          }
                          negative={
                            profitPerPax !==
                              null &&
                            profitPerPax <
                              0
                          }
                          large
                        />
                      </div>
                    </div>
                  </div>
                </section>
              );
            },
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* BOOKINGS */}
      {/* ==================================================== */}

      <section className={sectionClass}>
        <SectionHeader
          eyebrow="Revenue Detail"
          title="Confirmed Bookings"
          description="Only confirmed bookings contribute to recognized tour revenue and profitability."
        />

        {departure.bookings.length ===
        0 ? (
          <EmptyState text="No confirmed bookings exist for this departure." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">
                    Booking
                  </th>

                  <th className="px-4 py-3">
                    Client / Partner
                  </th>

                  <th className="px-4 py-3 text-center">
                    Pax
                  </th>

                  <th className="px-4 py-3 text-right">
                    Gross
                  </th>

                  <th className="px-4 py-3 text-right">
                    Commission
                  </th>

                  <th className="px-4 py-3 text-right">
                    Net Revenue
                  </th>

                  <th className="px-4 py-3 text-right">
                    Paid
                  </th>

                  <th className="px-4 py-3 text-right">
                    Due
                  </th>

                  <th className="px-4 py-3">
                    Payment Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {departure.bookings.map(
                  (booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="font-semibold text-[#001F3F] hover:text-[#8B0000] hover:underline"
                        >
                          {booking.bookingDisplayCode ||
                            booking.bookingReference}
                        </Link>

                        <p className="mt-1 text-xs text-slate-400">
                          {enumLabel(
                            booking.bookingType,
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">
                          {booking.groupName ||
                            booking.agencyNameSnapshot ||
                            booking.customerName ||
                            booking.agentNameSnapshot ||
                            "Direct / Client"}
                        </p>

                        {booking.groupLeaderName && (
                          <p className="mt-1 text-xs text-slate-500">
                            Leader:{" "}
                            {
                              booking.groupLeaderName
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center font-bold text-slate-800">
                        {booking.finalPax ??
                          booking.numberOfGuests}
                      </td>

                      <td className="px-4 py-4 text-right">
                        {money(
                          booking.grossAmount,
                          booking.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-red-700">
                        -
                        {money(
                          booking.commissionAmount,
                          booking.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-[#001F3F]">
                        {money(
                          booking.netAmount,
                          booking.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-emerald-700">
                        {money(
                          booking.amountPaid,
                          booking.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-amber-700">
                        {money(
                          booking.amountDue,
                          booking.currency,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {enumLabel(
                            booking.paymentStatus,
                          )}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ==================================================== */}
      {/* SUPPLIER BREAKDOWN */}
      {/* ==================================================== */}

      <section className={sectionClass}>
        <SectionHeader
          eyebrow="Committed Cost"
          title="Supplier Cost Breakdown"
          description="Approved supplier commitments net of supplier credits, grouped by supplier."
        />

        {suppliers.length ===
        0 ? (
          <EmptyState text="No approved supplier costs are recorded for this departure." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">
                    Supplier
                  </th>

                  <th className="px-4 py-3">
                    Type
                  </th>

                  <th className="px-4 py-3 text-center">
                    Items
                  </th>

                  <th className="px-4 py-3 text-right">
                    Approved
                  </th>

                  <th className="px-4 py-3 text-right">
                    Credits
                  </th>

                  <th className="px-4 py-3 text-right">
                    Net Cost
                  </th>

                  <th className="px-4 py-3 text-right">
                    Paid
                  </th>

                  <th className="px-4 py-3 text-right">
                    Outstanding
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {suppliers.map(
                  (supplier) => (
                    <tr
                      key={supplier.key}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {supplier.name}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {enumLabel(
                          supplier.type,
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        {
                          supplier.payableCount
                        }
                      </td>

                      <td className="px-4 py-4 text-right text-slate-700">
                        {money(
                          supplier.approved,
                          supplier.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-blue-700">
                        {supplier.credits >
                        0
                          ? `-${money(
                              supplier.credits,
                              supplier.currency,
                            )}`
                          : money(
                              0,
                              supplier.currency,
                            )}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-slate-900">
                        {money(
                          supplier.committed,
                          supplier.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-emerald-700">
                        {money(
                          supplier.paid,
                          supplier.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-amber-700">
                        {money(
                          supplier.outstanding,
                          supplier.currency,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ==================================================== */}
      {/* DETAILED SUPPLIER PAYABLES */}
      {/* ==================================================== */}

      <section className={sectionClass}>
        <SectionHeader
          eyebrow="Accounts Payable"
          title="Supplier Payables"
          description="Individual approved supplier liabilities. Credits reduce the recognized supplier cost; payments reduce the remaining balance."
        />

        {departure
          .supplierPayables
          .length === 0 ? (
          <EmptyState text="No supplier payables exist for this departure." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">
                    Supplier
                  </th>

                  <th className="px-4 py-3">
                    Service
                  </th>

                  <th className="px-4 py-3">
                    Invoice
                  </th>

                  <th className="px-4 py-3">
                    Due
                  </th>

                  <th className="px-4 py-3 text-right">
                    Approved
                  </th>

                  <th className="px-4 py-3 text-right">
                    Credit
                  </th>

                  <th className="px-4 py-3 text-right">
                    Net Cost
                  </th>

                  <th className="px-4 py-3 text-right">
                    Paid
                  </th>

                  <th className="px-4 py-3 text-right">
                    Balance
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {departure.supplierPayables.map(
                  (payable) => {
                    const approved =
                      Number(
                        payable.approvedAmount,
                      );

                    const credit =
                      Number(
                        payable.creditAmount,
                      );

                    const netCost =
                      Math.max(
                        approved -
                          credit,
                        0,
                      );

                    return (
                      <tr
                        key={payable.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {
                              payable.supplierNameSnapshot
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {payable.title}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {payable.serviceNameSnapshot ||
                            "-"}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {payable.supplierInvoiceNumber ||
                            "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {formatDate(
                            payable.dueDate,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-slate-700">
                          {money(
                            approved,
                            payable.currency,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-blue-700">
                          {credit > 0
                            ? `-${money(
                                credit,
                                payable.currency,
                              )}`
                            : money(
                                0,
                                payable.currency,
                              )}
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-slate-900">
                          {money(
                            netCost,
                            payable.currency,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right text-emerald-700">
                          {money(
                            Number(
                              payable.amountPaid,
                            ),
                            payable.currency,
                          )}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-amber-700">
                          {money(
                            Number(
                              payable.balance,
                            ),
                            payable.currency,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {enumLabel(
                              payable.paymentStatus,
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          <Link
                            href={`/admin/supplier-payables/${payable.id}`}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            View →
                          </Link>
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

      {/* ==================================================== */}
      {/* DIRECT COST BREAKDOWN */}
      {/* ==================================================== */}

      <section className={sectionClass}>
        <SectionHeader
          eyebrow="Operating Cost"
          title="Direct Tour Cost Breakdown"
          description="Approved direct operating expenses grouped by detailed expense classification."
        />

        {expenseItems.length ===
        0 ? (
          <EmptyState text="No approved direct tour expenses are recorded for this departure." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {expenseItems.map(
              (item) => (
                <div
                  key={item.key}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.label}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.count}{" "}
                        expense
                        {item.count ===
                        1
                          ? ""
                          : "s"}
                      </p>
                    </div>

                    <p className="text-lg font-bold text-[#001F3F]">
                      {money(
                        item.amount,
                        item.currency,
                      )}
                    </p>
                  </div>

                  <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-xs">
                    <span className="text-slate-500">
                      Paid
                    </span>

                    <span className="font-semibold text-emerald-700">
                      {money(
                        item.paid,
                        item.currency,
                      )}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      {/* ==================================================== */}
      {/* DIRECT EXPENSE DETAIL */}
      {/* ==================================================== */}

      <section className={sectionClass}>
        <SectionHeader
          eyebrow="Expense Ledger"
          title="Direct Expenses"
          description="Approved direct operating costs linked to this departure. Payment status is shown separately from recognized cost."
        />

        {departure.expenses.length ===
        0 ? (
          <EmptyState text="No approved direct expenses exist for this departure." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Cost Item
                  </th>

                  <th className="px-4 py-3">
                    Vendor
                  </th>

                  <th className="px-4 py-3">
                    Description
                  </th>

                  <th className="px-4 py-3">
                    Payment Status
                  </th>

                  <th className="px-4 py-3 text-right">
                    Recognized Cost
                  </th>

                  <th className="px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {departure.expenses.map(
                  (expense) => (
                    <tr
                      key={expense.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDate(
                          expense.expenseDate,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {enumLabel(
                            expense.expenseItem ||
                              expense.category,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {expense.title}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {expense.vendorName ||
                          "-"}
                      </td>

                      <td className="max-w-[300px] px-4 py-4 text-slate-600">
                        {expense.description ||
                          "-"}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {enumLabel(
                            expense.paymentStatus,
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-red-700">
                        -
                        {money(
                          expense.amount,
                          expense.currency,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <Link
                          href={`/admin/finance/expenses/${expense.id}/edit`}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ==================================================== */}
      {/* REFUNDS */}
      {/* ==================================================== */}

      <section className={sectionClass}>
        <SectionHeader
          eyebrow="Customer Adjustments"
          title="Refunds"
          description="Refunds are classified according to economic impact. Cancellation, service, price and goodwill refunds reduce profitability; overpayment and duplicate-payment refunds are cash corrections only."
        />

        {refunds.length ===
        0 ? (
          <EmptyState text="No approved or paid refunds for confirmed bookings exist on this departure." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-4 py-3">
                    Booking
                  </th>

                  <th className="px-4 py-3">
                    Reason
                  </th>

                  <th className="px-4 py-3">
                    Impact
                  </th>

                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3">
                    Reference
                  </th>

                  <th className="px-4 py-3 text-right">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {refunds.map(
                  (refund) => (
                    <tr
                      key={refund.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/bookings/${refund.booking.id}`}
                          className="font-semibold text-[#001F3F] hover:underline"
                        >
                          {refund.booking.bookingDisplayCode ||
                            refund.booking.bookingReference}
                        </Link>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">
                          {enumLabel(
                            refund.reason,
                          )}
                        </p>

                        {refund.reasonDetails && (
                          <p className="mt-1 max-w-[260px] text-xs text-slate-500">
                            {
                              refund.reasonDetails
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${refundImpactClass(
                            refund.reason,
                          )}`}
                        >
                          {refundImpactLabel(
                            refund.reason,
                          )}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDate(
                          refund.refundDate,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {enumLabel(
                          refund.status,
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {refund.reference ||
                          "-"}
                      </td>

                      <td
                        className={`px-4 py-4 text-right font-bold ${
                          refundReducesRevenue(
                            refund.reason,
                          )
                            ? "text-red-700"
                            : "text-blue-700"
                        }`}
                      >
                        -
                        {money(
                          Number(
                            refund.amount,
                          ),
                          refund.currency,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ==================================================== */}
      {/* CASH LEDGER */}
      {/* ==================================================== */}

      <section className={sectionClass}>
        <SectionHeader
          eyebrow="Actual Cash"
          title="Departure Bank Ledger"
          description="Posted customer receipts and cash outflows directly linked to this departure. These movements affect cash but are not counted again as revenue or expense."
        />

        {departure
          .bankTransactions
          .length === 0 ? (
          <EmptyState text="No posted bank transactions are linked to this departure." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className={tableHeadClass}>
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
                    Reference
                  </th>

                  <th className="px-4 py-3 text-right">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {departure.bankTransactions.map(
                  (transaction) => {
                    const incoming =
                      transaction.direction ===
                      BankTransactionDirection.IN;

                    return (
                      <tr
                        key={transaction.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                          {formatDate(
                            transaction.transactionDate,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {enumLabel(
                            transaction.type,
                          )}
                        </td>

                        <td className="px-4 py-4 font-medium text-slate-800">
                          {
                            transaction.bankAccount
                              .name
                          }
                        </td>

                        <td className="max-w-[280px] px-4 py-4 text-slate-600">
                          {transaction.description ||
                            "-"}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {transaction.reference ||
                            "-"}
                        </td>

                        <td
                          className={`px-4 py-4 text-right font-bold ${
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

      {/* ==================================================== */}
      {/* DOCUMENTS */}
      {/* ==================================================== */}

      <section className={sectionClass}>
        <SectionHeader
          eyebrow="Supporting Records"
          title="Finance Documents"
          description="Private supporting documentation linked directly to this departure."
        />

        {departure
          .financeDocuments
          .length === 0 ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              No finance documents are
              linked directly to this
              departure.
            </p>

            <Link
              href="/admin/finance/documents"
              className={secondaryButton}
            >
              Open Documents
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {departure.financeDocuments.map(
              (document) => (
                <div
                  key={document.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-semibold text-slate-900">
                    {document.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {enumLabel(
                      document.type,
                    )}
                  </p>

                  <p className="mt-2 truncate text-xs text-slate-400">
                    {
                      document.originalFileName
                    }
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Uploaded{" "}
                    {formatDate(
                      document.createdAt,
                    )}
                  </p>

                  <a
                    href={`/api/admin/finance/documents/${document.id}/download`}
                    className="mt-3 inline-flex text-xs font-semibold text-[#8B0000] hover:underline"
                  >
                    Download →
                  </a>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================
// UI HELPERS
// ============================================================

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
        {title}
      </h2>

      <p className="mt-1 max-w-4xl text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function TopCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-[#001F3F]">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function FinanceLine({
  label,
  value,
  strong = false,
  success = false,
  negative = false,
  large = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  success?: boolean;
  negative?: boolean;
  large?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className={
          strong
            ? "font-semibold text-slate-800"
            : "text-sm text-slate-500"
        }
      >
        {label}
      </span>

      <span
        className={`text-right ${
          large
            ? "text-xl"
            : "text-sm"
        } font-bold ${
          success
            ? "text-emerald-700"
            : negative
              ? "text-red-700"
              : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div className="border-t border-slate-200" />
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

const sectionClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

const tableHeadClass =
  "border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500";

const secondaryButton =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";