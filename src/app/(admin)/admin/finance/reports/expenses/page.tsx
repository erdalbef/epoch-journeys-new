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
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value: string | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function enumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";

  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function validEnum<T extends Record<string, string>>(
  source: T,
  value: string | undefined,
): T[keyof T] | undefined {
  if (!value) return undefined;

  return Object.values(source).includes(value)
    ? (value as T[keyof T])
    : undefined;
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

  const costType = validEnum(ExpenseCostType, params.costType);
  const costCenter = validEnum(ExpenseCostCenter, params.costCenter);
  const expenseItem = validEnum(ExpenseItem, params.expenseItem);
  const approvalStatus = validEnum(
    ExpenseApprovalStatus,
    params.approvalStatus,
  );
  const paymentStatus = validEnum(
    ExpensePaymentStatus,
    params.paymentStatus,
  );
  const sourceType = validEnum(FinanceSourceType, params.sourceType);

  const q = params.q?.trim() || "";

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

  const rows = expenses.map((expense) => {
    const reportingAmount =
      expense.baseAmount > 0
        ? expense.baseAmount
        : expense.grossAmount ??
          expense.amount;

    const reportingCurrency =
      expense.baseCurrency || expense.currency;

    return {
      ...expense,
      reportingAmount,
      reportingCurrency,
    };
  });

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
    const summary = byCurrency.get(row.reportingCurrency) ?? {
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
      row.approvalStatus !== ExpenseApprovalStatus.CANCELLED
    ) {
      summary.total += row.reportingAmount;

      if (row.costType === ExpenseCostType.DIRECT_TOUR_COST) {
        summary.direct += row.reportingAmount;
      } else {
        summary.overhead += row.reportingAmount;
      }

      if (row.paymentStatus === ExpensePaymentStatus.PAID) {
        summary.paid += row.reportingAmount;
      } else {
        summary.pending += row.reportingAmount;
      }

      if (row.reimbursable) {
        summary.reimbursable += row.reportingAmount;
      }

      if (row.recurring) {
        summary.recurring += row.reportingAmount;
      }
    }

    byCurrency.set(row.reportingCurrency, summary);
  }

  const byCostCenter = new Map<
    string,
    Map<string, number>
  >();

  for (const row of rows) {
    if (
      row.direction !== FinanceDirection.EXPENSE ||
      row.approvalStatus === ExpenseApprovalStatus.CANCELLED
    ) {
      continue;
    }

    const currencyMap =
      byCostCenter.get(row.costCenter || "UNASSIGNED") ??
      new Map<string, number>();

    currencyMap.set(
      row.reportingCurrency,
      (currencyMap.get(row.reportingCurrency) || 0) +
        row.reportingAmount,
    );

    byCostCenter.set(
      row.costCenter || "UNASSIGNED",
      currencyMap,
    );
  }

  const exportParams = new URLSearchParams();

  if (params.from) exportParams.set("from", params.from);
  if (params.to) exportParams.set("to", params.to);
  if (costType) exportParams.set("costType", costType);
  if (costCenter) exportParams.set("costCenter", costCenter);
  if (expenseItem) exportParams.set("expenseItem", expenseItem);
  if (approvalStatus) {
    exportParams.set("approvalStatus", approvalStatus);
  }
  if (paymentStatus) {
    exportParams.set("paymentStatus", paymentStatus);
  }
  if (sourceType) {
    exportParams.set("sourceType", sourceType);
  }
  if (q) exportParams.set("q", q);

  const exportHref =
    `/api/admin/finance/reports/expenses?${exportParams.toString()}`;

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Expense Report
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Direct tour costs and overhead by cost type, cost center, expense
            item, supplier, payment status, source, tour, booking, and reporting
            currency.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance/reports"
            className={secondaryButton}
          >
            ← Finance Reports
          </Link>

          <a
            href={exportHref}
            className="rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002b57]"
          >
            Export CSV
          </a>
        </div>
      </div>

      <form
        method="GET"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
          <FilterField label="Expense From">
            <input
              name="from"
              type="date"
              defaultValue={params.from || ""}
              className={inputClass}
            />
          </FilterField>

          <FilterField label="Expense To">
            <input
              name="to"
              type="date"
              defaultValue={params.to || ""}
              className={inputClass}
            />
          </FilterField>

          <FilterField label="Cost Type">
            <select
              name="costType"
              defaultValue={costType || ""}
              className={inputClass}
            >
              <option value="">All cost types</option>

              {Object.values(ExpenseCostType).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Cost Center">
            <select
              name="costCenter"
              defaultValue={costCenter || ""}
              className={inputClass}
            >
              <option value="">All cost centers</option>

              {Object.values(ExpenseCostCenter).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Expense Item">
            <select
              name="expenseItem"
              defaultValue={expenseItem || ""}
              className={inputClass}
            >
              <option value="">All expense items</option>

              {Object.values(ExpenseItem).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Approval">
            <select
              name="approvalStatus"
              defaultValue={approvalStatus || ""}
              className={inputClass}
            >
              <option value="">All approvals</option>

              {Object.values(ExpenseApprovalStatus).map(
                (value) => (
                  <option key={value} value={value}>
                    {enumLabel(value)}
                  </option>
                ),
              )}
            </select>
          </FilterField>

          <FilterField label="Payment">
            <select
              name="paymentStatus"
              defaultValue={paymentStatus || ""}
              className={inputClass}
            >
              <option value="">All payment statuses</option>

              {Object.values(ExpensePaymentStatus).map(
                (value) => (
                  <option key={value} value={value}>
                    {enumLabel(value)}
                  </option>
                ),
              )}
            </select>
          </FilterField>

          <FilterField label="Source">
            <select
              name="sourceType"
              defaultValue={sourceType || ""}
              className={inputClass}
            >
              <option value="">All sources</option>

              {Object.values(FinanceSourceType).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto]">
          <div>
            <FilterField label="Search">
              <input
                name="q"
                defaultValue={q}
                placeholder="Title, supplier, invoice, tour, booking, client..."
                className={inputClass}
              />
            </FilterField>
          </div>

          <div className="flex items-end justify-end gap-2">
            <Link
              href="/admin/finance/reports/expenses"
              className={secondaryButton}
            >
              Clear
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </form>

      {[...byCurrency.entries()].map(([currency, summary]) => (
        <section key={currency} className="space-y-4">
          <h2 className="text-lg font-bold text-[#001F3F]">
            {currency} Expense Summary
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Total Expense"
              value={money(summary.total, currency)}
              subtitle="Non-cancelled expense records"
            />

            <SummaryCard
              title="Direct Tour Cost"
              value={money(summary.direct, currency)}
              subtitle="Tour-linked operating costs"
            />

            <SummaryCard
              title="Overhead"
              value={money(summary.overhead, currency)}
              subtitle="Administrative and operating overhead"
            />

            <SummaryCard
              title="Paid"
              value={money(summary.paid, currency)}
              subtitle="Expenses marked paid"
              positive
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MiniCard
              label="Pending / Unpaid"
              value={money(summary.pending, currency)}
            />

            <MiniCard
              label="Reimbursable"
              value={money(summary.reimbursable, currency)}
            />

            <MiniCard
              label="Recurring"
              value={money(summary.recurring, currency)}
            />
          </div>
        </section>
      ))}

      {byCurrency.size === 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No expenses match the selected filters.
        </section>
      )}

      {byCostCenter.size > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Cost Center Breakdown
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[...byCostCenter.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([center, currencyMap]) => (
                <div
                  key={center}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {center === "UNASSIGNED"
                      ? "Unassigned"
                      : enumLabel(center)}
                  </p>

                  <div className="mt-3 space-y-1.5">
                    {[...currencyMap.entries()].map(
                      ([currency, value]) => (
                        <div
                          key={currency}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-slate-500">
                            {currency}
                          </span>

                          <span className="font-bold text-[#001F3F]">
                            {money(value, currency)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs leading-5 text-blue-800">
          <strong>Reporting amount:</strong> the report uses Base Amount when
          available; otherwise it falls back to Gross Amount and then the
          original Expense Amount. This keeps multi-currency expense records
          aligned with your stored reporting/base-currency values.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Expense Detail
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Showing {rows.length} expense
            {rows.length === 1 ? "" : "s"}. Maximum 2,500 records on screen.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No expenses match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[2400px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Expense Date</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Supplier / Vendor</th>
                  <th className="px-4 py-3">Cost Type</th>
                  <th className="px-4 py-3">Cost Center</th>
                  <th className="px-4 py-3">Expense Item</th>
                  <th className="px-4 py-3">Approval</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Original</th>
                  <th className="px-4 py-3 text-right">Tax</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Base Amount</th>
                  <th className="px-4 py-3">Tour / Booking</th>
                  <th className="px-4 py-3">Client / Group</th>
                  <th className="px-4 py-3">Bank Account</th>
                  <th className="px-4 py-3">Invoice / Ref</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3">Created By</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4">
                      {formatDate(row.expenseDate)}
                    </td>

                    <td className="max-w-[280px] px-4 py-4">
                      <p className="font-semibold text-[#001F3F]">
                        {row.title}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {enumLabel(row.category)}
                      </p>
                    </td>

                    <td className="max-w-[240px] px-4 py-4">
                      <p className="text-slate-700">
                        {row.supplier?.name ||
                          row.vendorName ||
                          "-"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {[row.supplier?.city, row.supplier?.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {enumLabel(row.costType)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {row.costCenter
                        ? enumLabel(row.costCenter)
                        : "-"}
                    </td>

                    <td className="px-4 py-4">
                      {row.expenseItem
                        ? enumLabel(row.expenseItem)
                        : "-"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {enumLabel(row.approvalStatus)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.paymentStatus === ExpensePaymentStatus.PAID
                        ? "bg-emerald-100 text-emerald-800"
                        : row.paymentStatus === ExpensePaymentStatus.CANCELLED
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {enumLabel(row.paymentStatus)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      {money(
                        row.originalAmount || row.amount,
                        row.originalCurrency || row.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right text-purple-700">
                      {row.taxAmount && row.taxAmount > 0
                        ? money(
                            row.taxAmount,
                            row.currency,
                          )
                        : "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      {money(
                        row.grossAmount ?? row.amount,
                        row.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right font-bold text-[#001F3F]">
                      {money(
                        row.reportingAmount,
                        row.reportingCurrency,
                      )}
                    </td>

                    <td className="max-w-[300px] px-4 py-4">
                      <p className="text-slate-700">
                        {row.tour?.title || row.customPackageName || "-"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {row.booking
                          ? row.booking.bookingDisplayCode ||
                            row.booking.bookingReference
                          : row.departureDate
                            ? formatDate(row.departureDate.date)
                            : "-"}
                      </p>
                    </td>

                    <td className="max-w-[260px] px-4 py-4">
                      {row.clientCompanyName ||
                        row.partnerCompanyName ||
                        row.groupName ||
                        row.agentNameSnapshot ||
                        "-"}
                    </td>

                    <td className="px-4 py-4">
                      {row.bankAccount?.name || "-"}
                    </td>

                    <td className="max-w-[240px] px-4 py-4">
                      <p className="text-slate-700">
                        {row.supplierInvoiceNumber || "-"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {row.paymentReference || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      {enumLabel(row.sourceType)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {row.recurring && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                            Recurring
                          </span>
                        )}

                        {row.reimbursable && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                            Reimbursable
                          </span>
                        )}

                        {row.bankTransactions.length > 0 && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Ledger Posted
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-500">
                      {row.createdBy?.fullName ||
                        row.createdBy?.email ||
                        "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  positive = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          positive ? "text-emerald-700" : "text-[#001F3F]"
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

function MiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-bold text-[#001F3F]">
        {value}
      </p>
    </div>
  );
}

const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
