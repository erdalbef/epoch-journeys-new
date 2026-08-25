import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  ExpenseApprovalStatus,
  ExpenseCostCenter,
  ExpenseCostType,
  ExpenseItem,
  ExpensePaymentStatus,
  FinanceDirection,
  FinanceSourceType,
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  costType?: string;
  costCenter?: string;
  expenseItem?: string;
  approvalStatus?: string;
  paymentStatus?: string;
  sourceType?: string;
  q?: string;
}>;

type PageProps = {
  searchParams: SearchParams;
};

function parseDateStart(value: string | undefined) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function parseDateEnd(value: string | undefined) {
  if (!value) return null;

  const date = new Date(`${value}T23:59:59.999Z`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function enumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
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

function formatDate(
  value: Date | null | undefined,
) {
  if (!value) return "—";

  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function validEnum<
  T extends Record<string, string>,
>(
  source: T,
  value: string | undefined,
): T[keyof T] | undefined {
  if (!value) return undefined;

  return Object.values(source).includes(value)
    ? (value as T[keyof T])
    : undefined;
}

function approvalClass(
  status: ExpenseApprovalStatus,
) {
  switch (status) {
    case ExpenseApprovalStatus.APPROVED:
      return "bg-green-100 text-green-700";

    case ExpenseApprovalStatus.PENDING_APPROVAL:
      return "bg-amber-100 text-amber-700";

    case ExpenseApprovalStatus.REJECTED:
    case ExpenseApprovalStatus.CANCELLED:
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function paymentClass(
  status: ExpensePaymentStatus,
) {
  switch (status) {
    case ExpensePaymentStatus.PAID:
      return "bg-green-100 text-green-700";

    case ExpensePaymentStatus.PENDING:
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-red-100 text-red-700";
  }
}

export default async function ExpenseReportPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = await searchParams;

  const from = parseDateStart(params.from);
  const to = parseDateEnd(params.to);

  const costType = validEnum(
    ExpenseCostType,
    params.costType,
  );

  const costCenter = validEnum(
    ExpenseCostCenter,
    params.costCenter,
  );

  const expenseItem = validEnum(
    ExpenseItem,
    params.expenseItem,
  );

  const approvalStatus = validEnum(
    ExpenseApprovalStatus,
    params.approvalStatus,
  );

  const paymentStatus = validEnum(
    ExpensePaymentStatus,
    params.paymentStatus,
  );

  const sourceType = validEnum(
    FinanceSourceType,
    params.sourceType,
  );

  const q = params.q?.trim() || "";

  // ==========================================================
  // FILTERS
  // ==========================================================

  const where: Prisma.ExpenseWhereInput = {
    ...(from || to
      ? {
          expenseDate: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),

    ...(costType ? { costType } : {}),
    ...(costCenter ? { costCenter } : {}),
    ...(expenseItem ? { expenseItem } : {}),
    ...(approvalStatus ? { approvalStatus } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(sourceType ? { sourceType } : {}),

    ...(q
      ? {
          OR: [
            {
              title: {
                contains: q,
                mode: "insensitive",
              },
            },

            {
              description: {
                contains: q,
                mode: "insensitive",
              },
            },

            {
              vendorName: {
                contains: q,
                mode: "insensitive",
              },
            },

            {
              supplierInvoiceNumber: {
                contains: q,
                mode: "insensitive",
              },
            },

            {
              paymentReference: {
                contains: q,
                mode: "insensitive",
              },
            },

            {
              clientCompanyName: {
                contains: q,
                mode: "insensitive",
              },
            },

            {
              spenderName: {
                contains: q,
                mode: "insensitive",
              },
            },

            {
              tourCategoryName: {
                contains: q,
                mode: "insensitive",
              },
            },

            {
              groupName: {
                contains: q,
                mode: "insensitive",
              },
            },

            {
              tour: {
                title: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },

            {
              booking: {
                bookingReference: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },

            {
              booking: {
                bookingDisplayCode: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },

            {
              supplier: {
                name: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };

  // ==========================================================
  // DATA
  // ==========================================================

  const expenses = await db.expense.findMany({
    where,

    orderBy: [
      {
        expenseDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],

    take: 2500,

    select: {
      id: true,

      title: true,
      description: true,

      amount: true,
      currency: true,

      category: true,

      costType: true,
      expenseItem: true,
      costCenter: true,

      approvalStatus: true,
      paymentStatus: true,

      vendorName: true,

      paymentMethod: true,
      paymentReference: true,

      supplierInvoiceNumber: true,

      invoiceDate: true,
      dueDate: true,
      expenseDate: true,
      paidAt: true,

      recurring: true,
      reimbursable: true,

      direction: true,
      sourceType: true,

      taxType: true,
      taxRate: true,
      taxAmount: true,

      grossAmount: true,
      netAmount: true,

      originalAmount: true,
      originalCurrency: true,

      exchangeRateToBase: true,

      baseCurrency: true,
      baseAmount: true,

      agentNameSnapshot: true,
      partnerCompanyName: true,
      tourLeaderName: true,
      customPackageName: true,
      groupName: true,
      clientCompanyName: true,
      spenderName: true,
      tourCategoryName: true,

      createdAt: true,

      supplier: {
        select: {
          id: true,
          name: true,
          country: true,
          city: true,
        },
      },

      bankAccount: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },

      booking: {
        select: {
          id: true,
          bookingReference: true,
          bookingDisplayCode: true,
        },
      },

      tour: {
        select: {
          id: true,
          title: true,
        },
      },

      departureDate: {
        select: {
          id: true,
          date: true,
        },
      },

      createdBy: {
        select: {
          fullName: true,
          email: true,
        },
      },

      bankTransactions: {
        select: {
          id: true,
          status: true,
          transactionDate: true,
        },
      },
    },
  });

  // ==========================================================
  // REPORTING AMOUNT
  // ==========================================================

  const rows = expenses.map((expense) => {
    const reportingAmount =
      expense.baseAmount > 0
        ? expense.baseAmount
        : expense.grossAmount ??
          expense.amount;

    const reportingCurrency =
      expense.baseCurrency ||
      expense.currency;

    return {
      ...expense,
      reportingAmount,
      reportingCurrency,
    };
  });

  // ==========================================================
  // CURRENCY SUMMARY
  // ==========================================================

  const byCurrency = new Map<
    string,
    {
      total: number;
      direct: number;
      overhead: number;
      paid: number;
      pending: number;
      reimbursable: number;
      recurring: number;
    }
  >();

  for (const row of rows) {
    const summary =
      byCurrency.get(
        row.reportingCurrency,
      ) ?? {
        total: 0,
        direct: 0,
        overhead: 0,
        paid: 0,
        pending: 0,
        reimbursable: 0,
        recurring: 0,
      };

    if (
      row.direction === FinanceDirection.EXPENSE &&
      row.approvalStatus !==
        ExpenseApprovalStatus.CANCELLED
    ) {
      summary.total +=
        row.reportingAmount;

      if (
        row.costType ===
        ExpenseCostType.DIRECT_TOUR_COST
      ) {
        summary.direct +=
          row.reportingAmount;
      } else {
        summary.overhead +=
          row.reportingAmount;
      }

      if (
        row.paymentStatus ===
        ExpensePaymentStatus.PAID
      ) {
        summary.paid +=
          row.reportingAmount;
      } else {
        summary.pending +=
          row.reportingAmount;
      }

      if (row.reimbursable) {
        summary.reimbursable +=
          row.reportingAmount;
      }

      if (row.recurring) {
        summary.recurring +=
          row.reportingAmount;
      }
    }

    byCurrency.set(
      row.reportingCurrency,
      summary,
    );
  }

  // ==========================================================
  // COST CENTER SUMMARY
  // ==========================================================

  const byCostCenter = new Map<
    string,
    Map<string, number>
  >();

  for (const row of rows) {
    if (
      row.direction !==
        FinanceDirection.EXPENSE ||
      row.approvalStatus ===
        ExpenseApprovalStatus.CANCELLED
    ) {
      continue;
    }

    const key =
      row.costCenter ||
      "UNASSIGNED";

    const currencyMap =
      byCostCenter.get(key) ??
      new Map<string, number>();

    currencyMap.set(
      row.reportingCurrency,
      (currencyMap.get(
        row.reportingCurrency,
      ) || 0) +
        row.reportingAmount,
    );

    byCostCenter.set(
      key,
      currencyMap,
    );
  }

  // ==========================================================
  // EXPENSE ITEM SUMMARY
  // ==========================================================

  const byExpenseItem = new Map<
    string,
    Map<string, number>
  >();

  for (const row of rows) {
    if (
      row.direction !==
        FinanceDirection.EXPENSE ||
      row.approvalStatus ===
        ExpenseApprovalStatus.CANCELLED
    ) {
      continue;
    }

    const key =
      row.expenseItem ||
      "UNASSIGNED";

    const currencyMap =
      byExpenseItem.get(key) ??
      new Map<string, number>();

    currencyMap.set(
      row.reportingCurrency,
      (currencyMap.get(
        row.reportingCurrency,
      ) || 0) +
        row.reportingAmount,
    );

    byExpenseItem.set(
      key,
      currencyMap,
    );
  }

  // ==========================================================
  // EXPORT
  // ==========================================================

  const exportParams =
    new URLSearchParams();

  if (params.from) {
    exportParams.set(
      "from",
      params.from,
    );
  }

  if (params.to) {
    exportParams.set(
      "to",
      params.to,
    );
  }

  if (costType) {
    exportParams.set(
      "costType",
      costType,
    );
  }

  if (costCenter) {
    exportParams.set(
      "costCenter",
      costCenter,
    );
  }

  if (expenseItem) {
    exportParams.set(
      "expenseItem",
      expenseItem,
    );
  }

  if (approvalStatus) {
    exportParams.set(
      "approvalStatus",
      approvalStatus,
    );
  }

  if (paymentStatus) {
    exportParams.set(
      "paymentStatus",
      paymentStatus,
    );
  }

  if (sourceType) {
    exportParams.set(
      "sourceType",
      sourceType,
    );
  }

  if (q) {
    exportParams.set(
      "q",
      q,
    );
  }

  const exportHref =
    `/api/admin/finance/reports/expenses?${exportParams.toString()}`;

  const currencyEntries =
    Array.from(
      byCurrency.entries(),
    ).sort(([a], [b]) =>
      a.localeCompare(b),
    );

  const secondaryButton =
    "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";

  const primaryButton =
    "rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002d5a]";

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Expense Report
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Direct tour costs and overhead by cost type, cost center,
            expense item, supplier, payment status, source, tour,
            booking and reporting currency.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance/reports"
            className={secondaryButton}
          >
            ← Back to Reports
          </Link>

          <a
            href={exportHref}
            className={secondaryButton}
          >
            Export Report
          </a>

          <Link
            href="/admin/finance/expenses"
            className={secondaryButton}
          >
            Expenses
          </Link>

          <Link
            href="/admin/finance/expenses/create"
            className={primaryButton}
          >
            Add Expense
          </Link>
        </div>
      </div>

      {/* FILTERS */}

      <form className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label
              htmlFor="q"
              className="text-sm font-semibold text-slate-700"
            >
              Search
            </label>

            <input
              id="q"
              name="q"
              type="text"
              defaultValue={q}
              placeholder="Expense, supplier, invoice, booking, group or person"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

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
              defaultValue={
                params.from || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
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
              defaultValue={
                params.to || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="costType"
              className="text-sm font-semibold text-slate-700"
            >
              Cost Type
            </label>

            <select
              id="costType"
              name="costType"
              defaultValue={
                costType || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpenseCostType,
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="costCenter"
              className="text-sm font-semibold text-slate-700"
            >
              Cost Center
            </label>

            <select
              id="costCenter"
              name="costCenter"
              defaultValue={
                costCenter || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpenseCostCenter,
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="expenseItem"
              className="text-sm font-semibold text-slate-700"
            >
              Expense Item
            </label>

            <select
              id="expenseItem"
              name="expenseItem"
              defaultValue={
                expenseItem || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpenseItem,
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="approvalStatus"
              className="text-sm font-semibold text-slate-700"
            >
              Approval
            </label>

            <select
              id="approvalStatus"
              name="approvalStatus"
              defaultValue={
                approvalStatus || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpenseApprovalStatus,
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="paymentStatus"
              className="text-sm font-semibold text-slate-700"
            >
              Payment Status
            </label>

            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={
                paymentStatus || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpensePaymentStatus,
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="sourceType"
              className="text-sm font-semibold text-slate-700"
            >
              Source
            </label>

            <select
              id="sourceType"
              name="sourceType"
              defaultValue={
                sourceType || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                FinanceSourceType,
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
          >
            Apply Filters
          </button>

          <Link
            href="/admin/finance/reports/expenses"
            className={secondaryButton}
          >
            Clear
          </Link>
        </div>
      </form>

      {/* SUMMARY */}

      {currencyEntries.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Expense Position by Reporting Currency
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Expense totals are displayed using the stored base
              reporting amount where available.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {currencyEntries.map(
              ([currency, summary]) => (
                <div
                  key={currency}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#001F3F]">
                      {currency}
                    </h3>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {currency}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-700">
                        Total Expenses
                      </p>

                      <p className="mt-1 font-bold text-red-900">
                        {money(
                          summary.total,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-3">
                      <p className="text-xs font-medium text-blue-700">
                        Direct Tour Costs
                      </p>

                      <p className="mt-1 font-bold text-blue-900">
                        {money(
                          summary.direct,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-600">
                        Overhead
                      </p>

                      <p className="mt-1 font-bold text-[#001F3F]">
                        {money(
                          summary.overhead,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-50 p-3">
                      <p className="text-xs font-medium text-green-700">
                        Paid
                      </p>

                      <p className="mt-1 font-bold text-green-900">
                        {money(
                          summary.paid,
                          currency,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border p-3">
                      <p className="text-xs text-slate-500">
                        Pending
                      </p>

                      <p className="mt-1 font-semibold text-amber-700">
                        {money(
                          summary.pending,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border p-3">
                      <p className="text-xs text-slate-500">
                        Reimbursable
                      </p>

                      <p className="mt-1 font-semibold text-[#001F3F]">
                        {money(
                          summary.reimbursable,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border p-3">
                      <p className="text-xs text-slate-500">
                        Recurring
                      </p>

                      <p className="mt-1 font-semibold text-[#001F3F]">
                        {money(
                          summary.recurring,
                          currency,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      {/* COST CENTER + EXPENSE ITEM */}

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Expenses by Cost Center
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Operational allocation of expense records.
          </p>

          <div className="mt-4 space-y-3">
            {Array.from(
              byCostCenter.entries(),
            ).map(
              ([center, currencyMap]) => (
                <div
                  key={center}
                  className="rounded-xl border p-4"
                >
                  <p className="font-semibold text-[#001F3F]">
                    {center === "UNASSIGNED"
                      ? "Unassigned"
                      : enumLabel(center)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from(
                      currencyMap.entries(),
                    ).map(
                      ([currency, total]) => (
                        <span
                          key={currency}
                          className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700"
                        >
                          {money(
                            total,
                            currency,
                          )}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ),
            )}

            {byCostCenter.size === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No cost-center data is available.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Expenses by Item
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Expense classification by item and reporting currency.
          </p>

          <div className="mt-4 space-y-3">
            {Array.from(
              byExpenseItem.entries(),
            ).map(
              ([item, currencyMap]) => (
                <div
                  key={item}
                  className="rounded-xl border p-4"
                >
                  <p className="font-semibold text-[#001F3F]">
                    {item === "UNASSIGNED"
                      ? "Unassigned"
                      : enumLabel(item)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from(
                      currencyMap.entries(),
                    ).map(
                      ([currency, total]) => (
                        <span
                          key={currency}
                          className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700"
                        >
                          {money(
                            total,
                            currency,
                          )}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ),
            )}

            {byExpenseItem.size === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No expense-item data is available.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* EXPENSE REGISTER */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Expense Register
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Detailed expense records matching the selected filters.
            </p>
          </div>

          <p className="text-sm font-medium text-slate-500">
            {rows.length} record
            {rows.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1700px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Date
                </th>

                <th className="px-3 py-3 font-medium">
                  Expense
                </th>

                <th className="px-3 py-3 font-medium">
                  Supplier / Vendor
                </th>

                <th className="px-3 py-3 font-medium">
                  Booking / Tour
                </th>

                <th className="px-3 py-3 font-medium">
                  Cost Type
                </th>

                <th className="px-3 py-3 font-medium">
                  Cost Center
                </th>

                <th className="px-3 py-3 font-medium">
                  Item
                </th>

                <th className="px-3 py-3 font-medium">
                  Approval
                </th>

                <th className="px-3 py-3 font-medium">
                  Payment
                </th>

                <th className="px-3 py-3 font-medium">
                  Source
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Original
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Reporting Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const supplier =
                  row.supplier?.name ||
                  row.vendorName ||
                  "—";

                const bookingReference =
                  row.booking?.bookingDisplayCode ||
                  row.booking?.bookingReference ||
                  "—";

                const tour =
                  row.tour?.title ||
                  row.customPackageName ||
                  "—";

                return (
                  <tr
                    key={row.id}
                    className="border-t align-top"
                  >
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDate(
                        row.expenseDate,
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#001F3F]">
                        {row.title}
                      </div>

                      {row.description ? (
                        <div className="mt-1 max-w-72 text-xs text-slate-500">
                          {row.description}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {supplier}
                      </div>

                      {row.supplierInvoiceNumber ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Invoice:{" "}
                          {row.supplierInvoiceNumber}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {bookingReference}
                      </div>

                      <div className="mt-1 max-w-64 text-xs text-slate-500">
                        {tour}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      {enumLabel(
                        row.costType,
                      )}
                    </td>

                    <td className="px-3 py-3">
                      {row.costCenter
                        ? enumLabel(
                            row.costCenter,
                          )
                        : "—"}
                    </td>

                    <td className="px-3 py-3">
                      {row.expenseItem
                        ? enumLabel(
                            row.expenseItem,
                          )
                        : "—"}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${approvalClass(
                          row.approvalStatus,
                        )}`}
                      >
                        {enumLabel(
                          row.approvalStatus,
                        )}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentClass(
                          row.paymentStatus,
                        )}`}
                      >
                        {enumLabel(
                          row.paymentStatus,
                        )}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      {enumLabel(
                        row.sourceType,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {money(
                        row.originalAmount ??
                          row.amount,
                        row.originalCurrency ||
                          row.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-red-700">
                      {money(
                        row.reportingAmount,
                        row.reportingCurrency,
                      )}
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    No expenses match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Where a base reporting amount and base currency are available,
        those values are used for management reporting. Original
        currency and original amount remain visible for audit and
        operational reference. Cancelled expenses are excluded from
        summary totals.
      </p>
    </div>
  );
}