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
  ExpensePaymentStatus,
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

type SearchParams = {
  q?: string;
  year?: string;
  status?: string;
  health?: string;
  currency?: string;
  from?: string;
  to?: string;
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

type CurrencyMetrics = {
  grossSales: number;
  commission: number;
  netRevenue: number;

  supplierCommitted: number;
  supplierPaid: number;
  supplierOutstanding: number;

  directCosts: number;
  directCostsPaid: number;

  refundsCommitted: number;

  cashReceived: number;
  cashPaid: number;

  receivables: number;

  grossProfit: number;
  margin: number | null;
  cashPosition: number;
};

type CurrencyMetricMap = Record<
  string,
  CurrencyMetrics
>;

type Health =
  | "STRONG"
  | "HEALTHY"
  | "LOW_MARGIN"
  | "CRITICAL"
  | "LOSS"
  | "MIXED_CURRENCY"
  | "NO_REVENUE";

type DepartureProfitabilityRow = {
  departureId: string;
  tourId: string;

  tourTitle: string;
  tourCode: string | null;

  departureDate: Date;
  departureStatus: string;
  season: string;

  capacity: number;
  bookedSeats: number;

  bookedPax: number;
  bookingCount: number;

  currencies: string[];
  metrics: CurrencyMetricMap;

  health: Health;
};

// ============================================================
// FINANCE HELPERS
// ============================================================

function createEmptyMetrics(): CurrencyMetrics {
  return {
    grossSales: 0,
    commission: 0,
    netRevenue: 0,

    supplierCommitted: 0,
    supplierPaid: 0,
    supplierOutstanding: 0,

    directCosts: 0,
    directCostsPaid: 0,

    refundsCommitted: 0,

    cashReceived: 0,
    cashPaid: 0,

    receivables: 0,

    grossProfit: 0,
    margin: null,
    cashPosition: 0,
  };
}

function normalizeCurrency(
  value: string | null | undefined,
) {
  return (
    value?.trim().toUpperCase() ||
    "EUR"
  );
}

function getCurrencyMetrics(
  metrics: CurrencyMetricMap,
  currency: string,
) {
  const normalized =
    normalizeCurrency(currency);

  if (!metrics[normalized]) {
    metrics[normalized] =
      createEmptyMetrics();
  }

  return metrics[normalized];
}

function finalizeMetrics(
  metric: CurrencyMetrics,
) {
  metric.grossProfit =
    metric.netRevenue -
    metric.supplierCommitted -
    metric.directCosts -
    metric.refundsCommitted;

  metric.margin =
    metric.netRevenue > 0
      ? (metric.grossProfit /
          metric.netRevenue) *
        100
      : null;

  metric.cashPosition =
    metric.cashReceived -
    metric.cashPaid;
}

function addMetrics(
  target: CurrencyMetrics,
  source: CurrencyMetrics,
) {
  target.grossSales +=
    source.grossSales;

  target.commission +=
    source.commission;

  target.netRevenue +=
    source.netRevenue;

  target.supplierCommitted +=
    source.supplierCommitted;

  target.supplierPaid +=
    source.supplierPaid;

  target.supplierOutstanding +=
    source.supplierOutstanding;

  target.directCosts +=
    source.directCosts;

  target.directCostsPaid +=
    source.directCostsPaid;

  target.refundsCommitted +=
    source.refundsCommitted;

  target.cashReceived +=
    source.cashReceived;

  target.cashPaid +=
    source.cashPaid;

  target.receivables +=
    source.receivables;
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
  value: Date,
) {
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

function parseDateFilter(
  value: string | undefined,
) {
  if (!value) {
    return null;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function determineHealth(
  currencies: string[],
  metrics: CurrencyMetricMap,
): Health {
  if (currencies.length > 1) {
    return "MIXED_CURRENCY";
  }

  const currency =
    currencies[0];

  if (!currency) {
    return "NO_REVENUE";
  }

  const margin =
    metrics[currency]?.margin;

  if (
    margin === null ||
    margin === undefined
  ) {
    return "NO_REVENUE";
  }

  if (margin >= 25) {
    return "STRONG";
  }

  if (margin >= 15) {
    return "HEALTHY";
  }

  if (margin >= 5) {
    return "LOW_MARGIN";
  }

  if (margin >= 0) {
    return "CRITICAL";
  }

  return "LOSS";
}

function healthLabel(
  health: Health,
) {
  switch (health) {
    case "STRONG":
      return "Strong";

    case "HEALTHY":
      return "Healthy";

    case "LOW_MARGIN":
      return "Low Margin";

    case "CRITICAL":
      return "Critical";

    case "LOSS":
      return "Loss";

    case "MIXED_CURRENCY":
      return "Mixed Currency";

    default:
      return "No Revenue";
  }
}

function healthClass(
  health: Health,
) {
  switch (health) {
    case "STRONG":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";

    case "HEALTHY":
      return "border-green-200 bg-green-100 text-green-800";

    case "LOW_MARGIN":
      return "border-amber-200 bg-amber-100 text-amber-800";

    case "CRITICAL":
      return "border-orange-200 bg-orange-100 text-orange-800";

    case "LOSS":
      return "border-red-200 bg-red-100 text-red-800";

    case "MIXED_CURRENCY":
      return "border-blue-200 bg-blue-100 text-blue-800";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function utilizationPercent(
  pax: number,
  capacity: number,
) {
  if (capacity <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      (pax / capacity) * 100,
    ),
  );
}

// ============================================================
// PAGE
// ============================================================

export default async function ProfitabilityPage({
  searchParams,
}: PageProps) {
  const session =
    await getServerSession(
      authOptions,
    );

  if (
    !session?.user ||
    session.user.role !== Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const params =
    await searchParams;

  const search =
    params.q
      ?.trim()
      .toLowerCase() || "";

  const selectedYear =
    params.year || "";

  const selectedStatus =
    params.status || "";

  const selectedHealth =
    params.health || "";

  const selectedCurrency =
    params.currency
      ?.trim()
      .toUpperCase() || "";

  const fromDate =
    parseDateFilter(
      params.from,
    );

  const toDate =
    parseDateFilter(
      params.to,
    );

  if (toDate) {
    toDate.setUTCHours(
      23,
      59,
      59,
      999,
    );
  }

  // ==========================================================
  // DEPARTURES + RELATED FINANCE DATA
  // ==========================================================

  const departures =
    await db.departureDate.findMany({
      orderBy: {
        date: "desc",
      },

      select: {
        id: true,
        date: true,
        status: true,
        season: true,
        capacity: true,
        bookedSeats: true,

        tour: {
          select: {
            id: true,
            title: true,
            tourCode: true,
          },
        },

        bookings: {
          where: {
            status: {
              not:
                BookingStatus.CANCELLED,
            },
          },

          select: {
            id: true,

            numberOfGuests: true,
            finalPax: true,

            grossAmount: true,
            commissionAmount: true,
            netAmount: true,

            amountDue: true,

            currency: true,
          },
        },

        supplierPayables: {
          where: {
            approvalStatus:
              SupplierPayableApprovalStatus.APPROVED,

            paymentStatus: {
              not:
                SupplierPayablePaymentStatus.CANCELLED,
            },
          },

          select: {
            approvedAmount: true,
            amountPaid: true,
            balance: true,
            currency: true,
          },
        },

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

          select: {
            amount: true,
            currency: true,
            paymentStatus: true,
          },
        },

        bankTransactions: {
          where: {
            status:
              BankTransactionStatus.POSTED,
          },

          select: {
            type: true,
            direction: true,
            amount: true,
            currency: true,
          },
        },
      },
    });

  // ==========================================================
  // REFUNDS
  // Refund belongs to Booking, so map refunds to departure.
  // ==========================================================

  const refunds =
    await db.refund.findMany({
      where: {
        status: {
          in: [
            RefundStatus.APPROVED,
            RefundStatus.PAID,
          ],
        },
      },

      select: {
        amount: true,
        currency: true,

        booking: {
          select: {
            departureDateId: true,
          },
        },
      },
    });

  const refundsByDeparture =
    new Map<
      string,
      {
        amount: number;
        currency: string;
      }[]
    >();

  for (const refund of refunds) {
    const departureId =
      refund.booking
        .departureDateId;

    const existing =
      refundsByDeparture.get(
        departureId,
      ) || [];

    existing.push({
      amount:
        Number(refund.amount),

      currency:
        refund.currency,
    });

    refundsByDeparture.set(
      departureId,
      existing,
    );
  }

  // ==========================================================
  // BUILD DEPARTURE PROFITABILITY
  // ==========================================================

  const rows: DepartureProfitabilityRow[] =
    departures.map(
      (departure) => {
        const metrics:
          CurrencyMetricMap = {};

        let bookedPax = 0;

        // ------------------------------------------------------
        // BOOKING REVENUE
        // ------------------------------------------------------

        for (
          const booking of departure.bookings
        ) {
          bookedPax +=
            booking.finalPax ??
            booking.numberOfGuests;

          const metric =
            getCurrencyMetrics(
              metrics,
              booking.currency,
            );

          metric.grossSales +=
            booking.grossAmount;

          metric.commission +=
            booking.commissionAmount;

          metric.netRevenue +=
            booking.netAmount;

          metric.receivables +=
            booking.amountDue;
        }

        // ------------------------------------------------------
        // SUPPLIER COMMITMENTS
        // ------------------------------------------------------

        for (
          const payable of departure.supplierPayables
        ) {
          const metric =
            getCurrencyMetrics(
              metrics,
              payable.currency,
            );

          metric.supplierCommitted +=
            Number(
              payable.approvedAmount,
            );

          metric.supplierPaid +=
            Number(
              payable.amountPaid,
            );

          metric.supplierOutstanding +=
            Number(
              payable.balance,
            );
        }

        // ------------------------------------------------------
        // DIRECT TOUR EXPENSES
        // ------------------------------------------------------

        for (
          const expense of departure.expenses
        ) {
          const metric =
            getCurrencyMetrics(
              metrics,
              expense.currency,
            );

          metric.directCosts +=
            expense.amount;

          if (
            expense.paymentStatus ===
            ExpensePaymentStatus.PAID
          ) {
            metric.directCostsPaid +=
              expense.amount;
          }
        }

        // ------------------------------------------------------
        // REFUNDS
        // ------------------------------------------------------

        const departureRefunds =
          refundsByDeparture.get(
            departure.id,
          ) || [];

        for (
          const refund of departureRefunds
        ) {
          const metric =
            getCurrencyMetrics(
              metrics,
              refund.currency,
            );

          metric.refundsCommitted +=
            refund.amount;
        }

        // ------------------------------------------------------
        // ACTUAL POSTED CASH MOVEMENT
        // ------------------------------------------------------

        for (
          const transaction of departure.bankTransactions
        ) {
          const metric =
            getCurrencyMetrics(
              metrics,
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
            metric.cashReceived +=
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
            metric.cashPaid +=
              amount;
          }
        }

        const currencies =
          Object.keys(
            metrics,
          ).sort();

        for (
          const currency of currencies
        ) {
          finalizeMetrics(
            metrics[currency],
          );
        }

        return {
          departureId:
            departure.id,

          tourId:
            departure.tour.id,

          tourTitle:
            departure.tour.title,

          tourCode:
            departure.tour.tourCode,

          departureDate:
            departure.date,

          departureStatus:
            departure.status,

          season:
            departure.season,

          capacity:
            departure.capacity,

          bookedSeats:
            departure.bookedSeats,

          bookedPax,

          bookingCount:
            departure.bookings
              .length,

          currencies,

          metrics,

          health:
            determineHealth(
              currencies,
              metrics,
            ),
        };
      },
    );

  // ==========================================================
  // FILTER OPTIONS
  // ==========================================================

  const availableYears =
    Array.from(
      new Set(
        rows.map((row) =>
          row.departureDate
            .getFullYear()
            .toString(),
        ),
      ),
    ).sort(
      (a, b) =>
        Number(b) -
        Number(a),
    );

  const availableCurrencies =
    Array.from(
      new Set(
        rows.flatMap(
          (row) =>
            row.currencies,
        ),
      ),
    ).sort();

  // ==========================================================
  // APPLY FILTERS
  // ==========================================================

  const filteredRows =
    rows.filter((row) => {
      if (search) {
        const haystack = [
          row.tourTitle,
          row.tourCode,
          formatDate(
            row.departureDate,
          ),
          row.season,
          row.departureStatus,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (
          !haystack.includes(
            search,
          )
        ) {
          return false;
        }
      }

      if (
        selectedYear &&
        row.departureDate
          .getFullYear()
          .toString() !==
          selectedYear
      ) {
        return false;
      }

      if (
        selectedStatus &&
        row.departureStatus !==
          selectedStatus
      ) {
        return false;
      }

      if (
        selectedHealth &&
        row.health !==
          selectedHealth
      ) {
        return false;
      }

      if (
        selectedCurrency &&
        !row.currencies.includes(
          selectedCurrency,
        )
      ) {
        return false;
      }

      if (
        fromDate &&
        row.departureDate <
          fromDate
      ) {
        return false;
      }

      if (
        toDate &&
        row.departureDate >
          toDate
      ) {
        return false;
      }

      return true;
    });

  // ==========================================================
  // EXECUTIVE SUMMARY
  // ==========================================================

  const summary:
    CurrencyMetricMap = {};

  for (
    const row of filteredRows
  ) {
    for (
      const currency of row.currencies
    ) {
      const target =
        getCurrencyMetrics(
          summary,
          currency,
        );

      addMetrics(
        target,
        row.metrics[currency],
      );
    }
  }

  for (
    const metric of Object.values(
      summary,
    )
  ) {
    finalizeMetrics(
      metric,
    );
  }

  const totalBookings =
    filteredRows.reduce(
      (sum, row) =>
        sum +
        row.bookingCount,
      0,
    );

  const totalPax =
    filteredRows.reduce(
      (sum, row) =>
        sum +
        row.bookedPax,
      0,
    );

  const strongCount =
    filteredRows.filter(
      (row) =>
        row.health ===
        "STRONG",
    ).length;

  const attentionCount =
    filteredRows.filter(
      (row) =>
        row.health ===
          "LOSS" ||
        row.health ===
          "CRITICAL" ||
        row.health ===
          "LOW_MARGIN",
    ).length;

  // ==========================================================
  // TOUR SUMMARY
  // ==========================================================

  const tourMap =
    new Map<
      string,
      {
        tourId: string;
        title: string;
        tourCode: string | null;

        departureCount: number;
        pax: number;

        metrics:
          CurrencyMetricMap;
      }
    >();

  for (
    const row of filteredRows
  ) {
    const tour =
      tourMap.get(
        row.tourId,
      ) || {
        tourId:
          row.tourId,

        title:
          row.tourTitle,

        tourCode:
          row.tourCode,

        departureCount: 0,
        pax: 0,

        metrics: {},
      };

    tour.departureCount += 1;
    tour.pax +=
      row.bookedPax;

    for (
      const currency of row.currencies
    ) {
      const target =
        getCurrencyMetrics(
          tour.metrics,
          currency,
        );

      addMetrics(
        target,
        row.metrics[currency],
      );
    }

    tourMap.set(
      row.tourId,
      tour,
    );
  }

  const tourRows =
    Array.from(
      tourMap.values(),
    );

  for (
    const tour of tourRows
  ) {
    for (
      const metric of Object.values(
        tour.metrics,
      )
    ) {
      finalizeMetrics(
        metric,
      );
    }
  }

  tourRows.sort(
    (a, b) =>
      b.pax - a.pax,
  );

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="mx-auto max-w-[1750px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ==================================================== */}
      {/* HEADER */}
      {/* ==================================================== */}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Intelligence
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#001F3F]">
            Tour & Departure
            Profitability
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Monitor the true
            financial performance of
            every operated group using
            net booking revenue,
            committed supplier costs,
            direct operating costs,
            refunds, receivables and
            actual posted cash
            movement.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance"
            className={secondaryButton}
          >
            ← Finance Center
          </Link>

          <Link
            href="/admin/supplier-payables"
            className={secondaryButton}
          >
            Supplier Payables
          </Link>

          <Link
            href="/admin/finance/expenses"
            className={secondaryButton}
          >
            Direct Expenses
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
              Profitability View
            </p>

            <p className="mt-2 font-semibold text-blue-950">
              Net Revenue − Supplier
              Commitments − Direct
              Tour Costs − Refunds
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              Costs affect profit when
              they become approved
              commitments, even if
              payment happens later.
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              Cash Position
            </p>

            <p className="mt-2 font-semibold text-blue-950">
              Posted Customer Receipts
              − Posted Tour Cash
              Outflows
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              Cash is kept separate
              from profit so unpaid
              customer balances and
              unpaid supplier
              liabilities remain
              visible.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* FILTERS */}
      {/* ==================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          method="GET"
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className={labelClass}>
                Search Tour
              </label>

              <input
                name="q"
                defaultValue={
                  params.q || ""
                }
                placeholder="Tour name, tour code, season..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Year
              </label>

              <select
                name="year"
                defaultValue={
                  selectedYear
                }
                className={inputClass}
              >
                <option value="">
                  All Years
                </option>

                {availableYears.map(
                  (year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Currency
              </label>

              <select
                name="currency"
                defaultValue={
                  selectedCurrency
                }
                className={inputClass}
              >
                <option value="">
                  All Currencies
                </option>

                {availableCurrencies.map(
                  (currency) => (
                    <option
                      key={
                        currency
                      }
                      value={
                        currency
                      }
                    >
                      {
                        currency
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                From
              </label>

              <input
                type="date"
                name="from"
                defaultValue={
                  params.from || ""
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                To
              </label>

              <input
                type="date"
                name="to"
                defaultValue={
                  params.to || ""
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Departure Status
              </label>

              <select
                name="status"
                defaultValue={
                  selectedStatus
                }
                className={inputClass}
              >
                <option value="">
                  All Statuses
                </option>

                <option value="EARLY_BOOKING">
                  Early Booking
                </option>

                <option value="AVAILABLE">
                  Available
                </option>

                <option value="SOLD_OUT">
                  Sold Out
                </option>

                <option value="CLOSED">
                  Closed
                </option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Margin Health
              </label>

              <select
                name="health"
                defaultValue={
                  selectedHealth
                }
                className={inputClass}
              >
                <option value="">
                  All Margins
                </option>

                <option value="STRONG">
                  Strong · 25%+
                </option>

                <option value="HEALTHY">
                  Healthy · 15–25%
                </option>

                <option value="LOW_MARGIN">
                  Low Margin · 5–15%
                </option>

                <option value="CRITICAL">
                  Critical · 0–5%
                </option>

                <option value="LOSS">
                  Loss
                </option>

                <option value="MIXED_CURRENCY">
                  Mixed Currency
                </option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className={primaryButton}
            >
              Apply Filters
            </button>

            <Link
              href="/admin/finance/profitability"
              className={secondaryButton}
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {/* ==================================================== */}
      {/* MANAGEMENT CARDS */}
      {/* ==================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <TopMetric
          label="Departures"
          value={String(
            filteredRows.length,
          )}
          detail="Current selection"
        />

        <TopMetric
          label="Bookings"
          value={String(
            totalBookings,
          )}
          detail="Active bookings"
        />

        <TopMetric
          label="Booked Pax"
          value={String(
            totalPax,
          )}
          detail="Passengers"
        />

        <TopMetric
          label="Strong"
          value={String(
            strongCount,
          )}
          detail="25%+ margin"
          positive
        />

        <TopMetric
          label="Attention"
          value={String(
            attentionCount,
          )}
          detail="Low / critical / loss"
          danger
        />
      </div>

      {/* ==================================================== */}
      {/* EXECUTIVE FINANCIAL SUMMARY */}
      {/* ==================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Executive Summary
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
            Financial Performance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Each currency is reported
            independently. Different
            currencies are never added
            together without an
            exchange-rate conversion.
          </p>
        </div>

        {Object.keys(
          summary,
        ).length === 0 ? (
          <EmptyState text="No financial data exists for the selected departures." />
        ) : (
          <div className="space-y-5">
            {Object.entries(
              summary,
            ).map(
              ([
                currency,
                metric,
              ]) => (
                <div
                  key={currency}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        Reporting
                        Currency
                      </p>

                      <h3 className="text-xl font-bold text-[#001F3F]">
                        {
                          currency
                        }
                      </h3>
                    </div>

                    <MarginBadge
                      margin={
                        metric.margin
                      }
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <FinancialMetric
                      label="Gross Sales"
                      value={money(
                        metric.grossSales,
                        currency,
                      )}
                    />

                    <FinancialMetric
                      label="Agent Commission"
                      value={money(
                        metric.commission,
                        currency,
                      )}
                      negative
                    />

                    <FinancialMetric
                      label="Net Revenue"
                      value={money(
                        metric.netRevenue,
                        currency,
                      )}
                    />

                    <FinancialMetric
                      label="Supplier Commitments"
                      value={money(
                        metric.supplierCommitted,
                        currency,
                      )}
                      negative
                    />

                    <FinancialMetric
                      label="Direct Tour Costs"
                      value={money(
                        metric.directCosts,
                        currency,
                      )}
                      negative
                    />

                    <FinancialMetric
                      label="Refunds"
                      value={money(
                        metric.refundsCommitted,
                        currency,
                      )}
                      negative
                    />

                    <FinancialMetric
                      label="Gross Profit"
                      value={money(
                        metric.grossProfit,
                        currency,
                      )}
                      positive={
                        metric.grossProfit >=
                        0
                      }
                      negative={
                        metric.grossProfit <
                        0
                      }
                    />

                    <FinancialMetric
                      label="Gross Margin"
                      value={
                        metric.margin ===
                        null
                          ? "-"
                          : `${metric.margin.toFixed(
                              1,
                            )}%`
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <CashMetric
                      label="Cash Received"
                      value={money(
                        metric.cashReceived,
                        currency,
                      )}
                      positive
                    />

                    <CashMetric
                      label="Cash Paid"
                      value={money(
                        metric.cashPaid,
                        currency,
                      )}
                      negative
                    />

                    <CashMetric
                      label="Customer Receivables"
                      value={money(
                        metric.receivables,
                        currency,
                      )}
                    />

                    <CashMetric
                      label="Supplier Outstanding"
                      value={money(
                        metric.supplierOutstanding,
                        currency,
                      )}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      {/* ==================================================== */}
      {/* ATTENTION STRIP */}
      {/* ==================================================== */}

      {attentionCount > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-bold text-amber-950">
                Profitability attention
                required
              </p>

              <p className="mt-1 text-sm text-amber-800">
                {
                  attentionCount
                }{" "}
                departure
                {attentionCount ===
                1
                  ? ""
                  : "s"}{" "}
                currently have low,
                critical or negative
                margins.
              </p>
            </div>

            <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm">
              Review before final
              supplier commitments
            </span>
          </div>
        </section>
      )}

      {/* ==================================================== */}
      {/* DEPARTURE TABLE */}
      {/* ==================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                Operational Unit
              </p>

              <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
                Departure
                Profitability
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Every departure is
                measured independently
                so a weak group cannot
                disappear inside a
                profitable tour.
              </p>
            </div>

            <p className="text-xs text-slate-400">
              Click a departure for
              full financial detail.
            </p>
          </div>
        </div>

        {filteredRows.length ===
        0 ? (
          <div className="p-6">
            <EmptyState text="No departures match the selected filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">
                    Tour / Departure
                  </th>

                  <th className="px-4 py-4 text-center">
                    Pax
                  </th>

                  <th className="px-4 py-4">
                    Net Revenue
                  </th>

                  <th className="px-4 py-4">
                    Supplier
                  </th>

                  <th className="px-4 py-4">
                    Direct Cost
                  </th>

                  <th className="px-4 py-4">
                    Refund
                  </th>

                  <th className="px-4 py-4">
                    Profit
                  </th>

                  <th className="px-4 py-4">
                    Margin
                  </th>

                  <th className="px-4 py-4">
                    Cash
                  </th>

                  <th className="px-4 py-4">
                    Receivable
                  </th>

                  <th className="px-5 py-4 text-right">
                    Health
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(
                  (row) => (
                    <tr
                      key={
                        row.departureId
                      }
                      className="align-top transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-5">
                        <Link
                          href={`/admin/finance/profitability/${row.departureId}`}
                          className="group block max-w-[320px]"
                        >
                          <p className="font-bold text-slate-950 transition group-hover:text-[#8B0000]">
                            {
                              row.tourTitle
                            }
                          </p>

                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                            {row.tourCode && (
                              <span>
                                {
                                  row.tourCode
                                }
                              </span>
                            )}

                            <span>
                              {formatDate(
                                row.departureDate,
                              )}
                            </span>

                            <span>
                              {enumLabel(
                                row.season,
                              )}
                            </span>
                          </div>

                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                              <span>
                                Capacity
                              </span>

                              <span>
                                {
                                  row.bookedPax
                                }
                                /
                                {
                                  row.capacity
                                }
                              </span>
                            </div>

                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-[#001F3F]"
                                style={{
                                  width: `${utilizationPercent(
                                    row.bookedPax,
                                    row.capacity,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </Link>
                      </td>

                      <td className="px-4 py-5 text-center">
                        <p className="text-lg font-bold text-[#001F3F]">
                          {
                            row.bookedPax
                          }
                        </p>

                        <p className="text-[10px] text-slate-400">
                          {
                            row.bookingCount
                          }{" "}
                          booking
                          {row.bookingCount ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </td>

                      <CurrencyCell
                        row={row}
                        field="netRevenue"
                      />

                      <CurrencyCell
                        row={row}
                        field="supplierCommitted"
                        negative
                      />

                      <CurrencyCell
                        row={row}
                        field="directCosts"
                        negative
                      />

                      <CurrencyCell
                        row={row}
                        field="refundsCommitted"
                        negative
                      />

                      <CurrencyCell
                        row={row}
                        field="grossProfit"
                        profit
                      />

                      <td className="px-4 py-5">
                        <div className="space-y-1">
                          {row.currencies.map(
                            (
                              currency,
                            ) => {
                              const margin =
                                row
                                  .metrics[
                                  currency
                                ]
                                  .margin;

                              return (
                                <p
                                  key={
                                    currency
                                  }
                                  className="whitespace-nowrap font-bold text-slate-800"
                                >
                                  {margin ===
                                  null
                                    ? "-"
                                    : `${margin.toFixed(
                                        1,
                                      )}%`}
                                </p>
                              );
                            },
                          )}
                        </div>
                      </td>

                      <CurrencyCell
                        row={row}
                        field="cashPosition"
                        profit
                      />

                      <CurrencyCell
                        row={row}
                        field="receivables"
                      />

                      <td className="px-5 py-5 text-right">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${healthClass(
                            row.health,
                          )}`}
                        >
                          {healthLabel(
                            row.health,
                          )}
                        </span>

                        <div className="mt-2">
                          <Link
                            href={`/admin/finance/profitability/${row.departureId}`}
                            className="text-xs font-semibold text-[#8B0000] hover:underline"
                          >
                            View Detail →
                          </Link>
                        </div>
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
      {/* TOUR PORTFOLIO */}
      {/* ==================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Portfolio View
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
            Tour Summary
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Combined performance of
            all selected departures
            for each tour product.
          </p>
        </div>

        {tourRows.length ===
        0 ? (
          <EmptyState text="No tour profitability data is available." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {tourRows.map(
              (tour) => (
                <article
                  key={
                    tour.tourId
                  }
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div>
                    <p className="font-bold text-slate-950">
                      {
                        tour.title
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {tour.tourCode
                        ? `${tour.tourCode} · `
                        : ""}
                      {
                        tour.departureCount
                      }{" "}
                      departure
                      {tour.departureCount ===
                      1
                        ? ""
                        : "s"}
                      {" · "}
                      {
                        tour.pax
                      }{" "}
                      pax
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {Object.entries(
                      tour.metrics,
                    ).map(
                      ([
                        currency,
                        metric,
                      ]) => (
                        <div
                          key={
                            currency
                          }
                          className="rounded-xl bg-slate-50 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">
                              {
                                currency
                              }
                            </span>

                            <MarginBadge
                              margin={
                                metric.margin
                              }
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <MiniMetric
                              label="Revenue"
                              value={money(
                                metric.netRevenue,
                                currency,
                              )}
                            />

                            <MiniMetric
                              label="Cost"
                              value={money(
                                metric.supplierCommitted +
                                  metric.directCosts +
                                  metric.refundsCommitted,
                                currency,
                              )}
                            />

                            <MiniMetric
                              label="Profit"
                              value={money(
                                metric.grossProfit,
                                currency,
                              )}
                            />

                            <MiniMetric
                              label="Receivable"
                              value={money(
                                metric.receivables,
                                currency,
                              )}
                            />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      {/* ==================================================== */}
      {/* HEALTH GUIDE */}
      {/* ==================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#001F3F]">
          Profitability Health
          Guide
        </h2>

        <div className="mt-4 flex flex-wrap gap-2">
          <HealthLegend
            label="Strong"
            detail="25%+"
            health="STRONG"
          />

          <HealthLegend
            label="Healthy"
            detail="15–25%"
            health="HEALTHY"
          />

          <HealthLegend
            label="Low Margin"
            detail="5–15%"
            health="LOW_MARGIN"
          />

          <HealthLegend
            label="Critical"
            detail="0–5%"
            health="CRITICAL"
          />

          <HealthLegend
            label="Loss"
            detail="< 0%"
            health="LOSS"
          />

          <HealthLegend
            label="Mixed Currency"
            detail="Separate analysis"
            health="MIXED_CURRENCY"
          />
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Health categories are
          management indicators only.
          They do not alter accounting
          records or transaction
          status.
        </p>
      </section>
    </div>
  );
}

// ============================================================
// UI COMPONENTS
// ============================================================

function CurrencyCell({
  row,
  field,
  negative = false,
  profit = false,
}: {
  row: DepartureProfitabilityRow;
  field: keyof CurrencyMetrics;
  negative?: boolean;
  profit?: boolean;
}) {
  return (
    <td className="px-4 py-5">
      {row.currencies.length ===
      0 ? (
        <span className="text-slate-400">
          -
        </span>
      ) : (
        <div className="space-y-1.5">
          {row.currencies.map(
            (currency) => {
              const raw =
                row.metrics[
                  currency
                ][field];

              const value =
                typeof raw ===
                "number"
                  ? raw
                  : 0;

              let valueClass =
                "font-semibold text-slate-800";

              if (negative) {
                valueClass =
                  "font-semibold text-red-700";
              }

              if (profit) {
                valueClass =
                  value >= 0
                    ? "font-bold text-emerald-700"
                    : "font-bold text-red-700";
              }

              return (
                <div
                  key={
                    currency
                  }
                  className="whitespace-nowrap"
                >
                  <p
                    className={
                      valueClass
                    }
                  >
                    {negative &&
                    value > 0
                      ? "-"
                      : ""}

                    {money(
                      Math.abs(
                        value,
                      ),
                      currency,
                    )}
                  </p>

                  {row.currencies
                    .length >
                    1 && (
                    <p className="text-[10px] font-semibold text-slate-400">
                      {
                        currency
                      }
                    </p>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}
    </td>
  );
}

function TopMetric({
  label,
  value,
  detail,
  positive = false,
  danger = false,
}: {
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${
          danger
            ? "text-red-700"
            : positive
              ? "text-emerald-700"
              : "text-[#001F3F]"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function FinancialMetric({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${
          positive
            ? "text-emerald-700"
            : negative
              ? "text-red-700"
              : "text-[#001F3F]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CashMetric({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <p className="text-xs font-medium text-blue-700">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${
          positive
            ? "text-emerald-700"
            : negative
              ? "text-red-700"
              : "text-[#001F3F]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function MarginBadge({
  margin,
}: {
  margin: number | null;
}) {
  if (margin === null) {
    return (
      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
        No Revenue
      </span>
    );
  }

  let className =
    "bg-red-100 text-red-800";

  if (margin >= 25) {
    className =
      "bg-emerald-100 text-emerald-800";
  } else if (
    margin >= 15
  ) {
    className =
      "bg-green-100 text-green-800";
  } else if (
    margin >= 5
  ) {
    className =
      "bg-amber-100 text-amber-800";
  } else if (
    margin >= 0
  ) {
    className =
      "bg-orange-100 text-orange-800";
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
    >
      {margin.toFixed(1)}%
    </span>
  );
}

function HealthLegend({
  label,
  detail,
  health,
}: {
  label: string;
  detail: string;
  health: Health;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${healthClass(
        health,
      )}`}
    >
      {label}

      <span className="opacity-70">
        {detail}
      </span>
    </span>
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

const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]";

const secondaryButton =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";