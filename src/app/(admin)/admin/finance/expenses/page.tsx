import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExpenseApprovalStatus,
  ExpenseCategory,
  ExpenseCostType,
  ExpensePaymentStatus,
  FinanceDirection,
  FinanceSourceType,
  Prisma,
  Role,
} from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import DeleteExpenseButton from "@/components/admin/finance/DeleteExpenseButton";

type SearchParams = {
  q?: string;
  category?: string;
  status?: string;
  approvalStatus?: string;
  costType?: string;
  sourceType?: string;
  clientCompany?: string;
  spender?: string;
  tourCategory?: string;
  from?: string;
  to?: string;
  page?: string;
};

type CurrencySummary = {
  currency: string;
  total: number;
  paid: number;
  pending: number;
  approvedDirectTourCosts: number;
  tax: number;
  count: number;
};

type ExpenseSummaryRow = {
  key: string;
  vendorName: string;
  category: ExpenseCategory;
  currency: string;
  expenseCount: number;
  total: number;
  paid: number;
  pending: number;
  tax: number;
};

function formatDate(
  value:
    | Date
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

function formatMoney(
  value: number,
  currency = "EUR",
) {
  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatEnumLabel(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "—";
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

function getPaymentStatusClass(
  status: ExpensePaymentStatus,
) {
  switch (status) {
    case ExpensePaymentStatus.PAID:
      return "bg-green-100 text-green-700";

    case ExpensePaymentStatus.PENDING:
      return "bg-amber-100 text-amber-700";

    case ExpensePaymentStatus.CANCELLED:
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getApprovalStatusClass(
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

export default async function AdditionalExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session =
    await getServerSession(
      authOptions,
    );

  if (
    !session?.user ||
    session.user.role !==
      Role.ADMIN
  ) {
    redirect(
      "/admin-login",
    );
  }

  const params =
    (await searchParams) ??
    {};

  const q =
    params.q?.trim() ??
    "";

  const category =
    params.category?.trim() ??
    "";

  const status =
    params.status?.trim() ??
    "";

  const approvalStatus =
    params.approvalStatus?.trim() ??
    "";

  const costType =
    params.costType?.trim() ??
    "";

  const sourceType =
    params.sourceType?.trim() ??
    "";

  const clientCompany =
    params.clientCompany?.trim() ??
    "";

  const spender =
    params.spender?.trim() ??
    "";

  const tourCategory =
    params.tourCategory?.trim() ??
    "";

  const from =
    params.from?.trim() ??
    "";

  const to =
    params.to?.trim() ??
    "";

  const currentPage =
    Math.max(
      1,
      Number(
        params.page ||
          "1",
      ),
    );

  const pageSize =
    10;

  const skip =
    (currentPage - 1) *
    pageSize;

  const searchConditions:
    Prisma.ExpenseWhereInput[] =
    q
      ? [
          {
            title: {
              contains: q,
              mode:
                Prisma.QueryMode
                  .insensitive,
            },
          },
          {
            vendorName: {
              contains: q,
              mode:
                Prisma.QueryMode
                  .insensitive,
            },
          },
          {
            description: {
              contains: q,
              mode:
                Prisma.QueryMode
                  .insensitive,
            },
          },
          {
            notes: {
              contains: q,
              mode:
                Prisma.QueryMode
                  .insensitive,
            },
          },
          {
            agentNameSnapshot:
              {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
          },
          {
            partnerCompanyName:
              {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
          },
          {
            tourLeaderName:
              {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
          },
          {
            customPackageName:
              {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
          },
          {
            groupName: {
              contains: q,
              mode:
                Prisma.QueryMode
                  .insensitive,
            },
          },
          {
            clientCompanyName:
              {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
          },
          {
            spenderName: {
              contains: q,
              mode:
                Prisma.QueryMode
                  .insensitive,
            },
          },
          {
            tourCategoryName:
              {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
          },
          {
            tour: {
              title: {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
            },
          },
          {
            tour: {
              tourCode: {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
            },
          },
        ]
      : [];

  const where:
    Prisma.ExpenseWhereInput =
    {
      direction:
        FinanceDirection.EXPENSE,

      ...(searchConditions.length >
      0
        ? {
            OR:
              searchConditions,
          }
        : {}),

      ...(category &&
      Object.values(
        ExpenseCategory,
      ).includes(
        category as ExpenseCategory,
      )
        ? {
            category:
              category as ExpenseCategory,
          }
        : {}),

      ...(status &&
      Object.values(
        ExpensePaymentStatus,
      ).includes(
        status as ExpensePaymentStatus,
      )
        ? {
            paymentStatus:
              status as ExpensePaymentStatus,
          }
        : {}),

      ...(approvalStatus &&
      Object.values(
        ExpenseApprovalStatus,
      ).includes(
        approvalStatus as ExpenseApprovalStatus,
      )
        ? {
            approvalStatus:
              approvalStatus as ExpenseApprovalStatus,
          }
        : {}),

      ...(costType &&
      Object.values(
        ExpenseCostType,
      ).includes(
        costType as ExpenseCostType,
      )
        ? {
            costType:
              costType as ExpenseCostType,
          }
        : {}),

      ...(sourceType &&
      Object.values(
        FinanceSourceType,
      ).includes(
        sourceType as FinanceSourceType,
      )
        ? {
            sourceType:
              sourceType as FinanceSourceType,
          }
        : {}),

      ...(clientCompany
        ? {
            clientCompanyName:
              {
                contains:
                  clientCompany,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
          }
        : {}),

      ...(spender
        ? {
            spenderName: {
              contains:
                spender,
              mode:
                Prisma.QueryMode
                  .insensitive,
            },
          }
        : {}),

      ...(tourCategory
        ? {
            tourCategoryName:
              {
                contains:
                  tourCategory,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
          }
        : {}),

      ...(from || to
        ? {
            expenseDate: {
              ...(from
                ? {
                    gte:
                      new Date(
                        `${from}T00:00:00.000Z`,
                      ),
                  }
                : {}),

              ...(to
                ? {
                    lte:
                      new Date(
                        `${to}T23:59:59.999Z`,
                      ),
                  }
                : {}),
            },
          }
        : {}),
    };

  const [
    expenses,
    totalCount,
    summaryEntries,
  ] =
    await Promise.all([
      db.expense.findMany({
        where,

        orderBy: [
          {
            expenseDate:
              "desc",
          },
          {
            createdAt:
              "desc",
          },
        ],

        skip,
        take:
          pageSize,

        include: {
          booking: {
            select: {
              id: true,
              bookingDisplayCode:
                true,
              bookingReference:
                true,
            },
          },

          tour: {
            select: {
              id: true,
              title: true,
              tourCode: true,
            },
          },

          departureDate:
            {
              select: {
                id: true,
                date: true,
              },
            },
        },
      }),

      db.expense.count({
        where,
      }),

      db.expense.findMany({
        where,

        select: {
          id: true,
          amount: true,
          currency: true,
          vendorName: true,
          category: true,
          paymentStatus:
            true,
          approvalStatus:
            true,
          costType: true,
          taxAmount: true,
        },
      }),
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalCount /
          pageSize,
      ),
    );

  function buildPageHref(
    page: number,
  ) {
    const search =
      new URLSearchParams();

    if (q) {
      search.set(
        "q",
        q,
      );
    }

    if (category) {
      search.set(
        "category",
        category,
      );
    }

    if (status) {
      search.set(
        "status",
        status,
      );
    }

    if (
      approvalStatus
    ) {
      search.set(
        "approvalStatus",
        approvalStatus,
      );
    }

    if (costType) {
      search.set(
        "costType",
        costType,
      );
    }

    if (sourceType) {
      search.set(
        "sourceType",
        sourceType,
      );
    }

    if (from) {
      search.set(
        "from",
        from,
      );
    }

    if (to) {
      search.set(
        "to",
        to,
      );
    }

    if (
      clientCompany
    ) {
      search.set(
        "clientCompany",
        clientCompany,
      );
    }

    if (spender) {
      search.set(
        "spender",
        spender,
      );
    }

    if (
      tourCategory
    ) {
      search.set(
        "tourCategory",
        tourCategory,
      );
    }

    search.set(
      "page",
      String(page),
    );

    return `/admin/finance/expenses?${search.toString()}`;
  }

  // ========================================================
  // FINANCIAL SUMMARY DATA
  //
  // Rejected / cancelled expenses are preserved in the
  // detailed table, but do not enter financial totals.
  // ========================================================

  const financialEntries =
    summaryEntries.filter(
      (item) =>
        item.approvalStatus !==
          ExpenseApprovalStatus.REJECTED &&
        item.approvalStatus !==
          ExpenseApprovalStatus.CANCELLED &&
        item.paymentStatus !==
          ExpensePaymentStatus.CANCELLED,
    );

  // ========================================================
  // CURRENCY KPI SUMMARY
  // ========================================================

  const currencySummaryMap =
    new Map<
      string,
      CurrencySummary
    >();

  for (
    const item of
    financialEntries
  ) {
    const currencyCode =
      item.currency ||
      "EUR";

    const current =
      currencySummaryMap.get(
        currencyCode,
      ) ?? {
        currency:
          currencyCode,
        total: 0,
        paid: 0,
        pending: 0,
        approvedDirectTourCosts:
          0,
        tax: 0,
        count: 0,
      };

    current.total +=
      Number(
        item.amount ??
          0,
      );

    current.tax +=
      Number(
        item.taxAmount ??
          0,
      );

    current.count +=
      1;

    if (
      item.paymentStatus ===
      ExpensePaymentStatus.PAID
    ) {
      current.paid +=
        Number(
          item.amount ??
            0,
        );
    }

    if (
      item.paymentStatus ===
      ExpensePaymentStatus.PENDING
    ) {
      current.pending +=
        Number(
          item.amount ??
            0,
        );
    }

    if (
      item.approvalStatus ===
        ExpenseApprovalStatus.APPROVED &&
      item.costType ===
        ExpenseCostType.DIRECT_TOUR_COST
    ) {
      current.approvedDirectTourCosts +=
        Number(
          item.amount ??
            0,
        );
    }

    currencySummaryMap.set(
      currencyCode,
      current,
    );
  }

  const currencySummaries =
    Array.from(
      currencySummaryMap.values(),
    ).sort(
      (
        a,
        b,
      ) =>
        a.currency.localeCompare(
          b.currency,
        ),
    );

  // ========================================================
  // VENDOR + CATEGORY + CURRENCY SUMMARY
  // ========================================================

  const expenseSummaryMap =
    new Map<
      string,
      ExpenseSummaryRow
    >();

  for (
    const item of
    financialEntries
  ) {
    const vendorName =
      item.vendorName?.trim() ||
      "Unspecified Payee";

    const currencyCode =
      item.currency ||
      "EUR";

    const key =
      `${vendorName}::${item.category}::${currencyCode}`;

    const existing =
      expenseSummaryMap.get(
        key,
      ) ?? {
        key,
        vendorName,
        category:
          item.category,
        currency:
          currencyCode,
        expenseCount:
          0,
        total: 0,
        paid: 0,
        pending: 0,
        tax: 0,
      };

    existing.expenseCount +=
      1;

    existing.total +=
      Number(
        item.amount ??
          0,
      );

    existing.tax +=
      Number(
        item.taxAmount ??
          0,
      );

    if (
      item.paymentStatus ===
      ExpensePaymentStatus.PAID
    ) {
      existing.paid +=
        Number(
          item.amount ??
            0,
        );
    }

    if (
      item.paymentStatus ===
      ExpensePaymentStatus.PENDING
    ) {
      existing.pending +=
        Number(
          item.amount ??
            0,
        );
    }

    expenseSummaryMap.set(
      key,
      existing,
    );
  }

  const expenseSummaries =
    Array.from(
      expenseSummaryMap.values(),
    ).sort(
      (
        a,
        b,
      ) => {
        if (
          a.pending !==
          b.pending
        ) {
          return (
            b.pending -
            a.pending
          );
        }

        return a.vendorName.localeCompare(
          b.vendorName,
        );
      },
    );

  return (
    <div className="space-y-6 p-6">
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">
            Additional Expenses
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manual and exceptional
            expenses that are not already
            represented by Supplier
            Payables.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/finance"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Finance Dashboard
          </Link>

          <Link
            href="/admin/supplier-payables"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Supplier Payables
          </Link>

          <Link
            href="/admin/finance/expenses/create"
            className="rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Add Expense
          </Link>
        </div>
      </div>

      {/* ================================================== */}
      {/* WARNING */}
      {/* ================================================== */}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <strong>
          Do not duplicate supplier
          costs here.
        </strong>{" "}
        Hotels, buses /
        transportation, tour managers,
        local guides, audio / whisper
        sets, restaurants / meals,
        entrance fees / tickets, local
        operators and other contracted
        supplier costs should normally be
        entered through Supplier Payables.
        Use this page for bank charges,
        office costs, staff or owner-paid
        expenses, taxes / fees, small
        exceptional tour expenses and
        other items not already
        represented by a Supplier
        Payable.
      </div>

      {/* ================================================== */}
      {/* CURRENCY KPI SUMMARY */}
      {/* ================================================== */}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            Expense Position by Currency
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Different currencies are kept
            separate and are never added
            together.
          </p>
        </div>

        {currencySummaries.length >
        0 ? (
          <div className="space-y-4">
            {currencySummaries.map(
              (
                summary,
              ) => (
                <div
                  key={
                    summary.currency
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#001F3F]">
                        {
                          summary.currency
                        }
                      </p>

                      <p className="text-xs text-slate-500">
                        {
                          summary.count
                        }{" "}
                        expense
                        {summary.count ===
                        1
                          ? ""
                          : "s"}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {
                        summary.currency
                      }
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <KpiCard
                      label="Additional Expenses"
                      value={formatMoney(
                        summary.total,
                        summary.currency,
                      )}
                      tone="red"
                    />

                    <KpiCard
                      label="Paid"
                      value={formatMoney(
                        summary.paid,
                        summary.currency,
                      )}
                      tone="green"
                    />

                    <KpiCard
                      label="Pending"
                      value={formatMoney(
                        summary.pending,
                        summary.currency,
                      )}
                      tone="amber"
                    />

                    <KpiCard
                      label="Approved Direct Tour Costs"
                      value={formatMoney(
                        summary.approvedDirectTourCosts,
                        summary.currency,
                      )}
                      tone="blue"
                    />

                    <KpiCard
                      label="VAT / Tax"
                      value={formatMoney(
                        summary.tax,
                        summary.currency,
                      )}
                      tone="amber"
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
            No financial expenses match
            the current filters.
          </div>
        )}
      </section>

      {/* ================================================== */}
      {/* FILTERS */}
      {/* ================================================== */}

      <form className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>

            <input
              name="q"
              defaultValue={
                q
              }
              placeholder="Tour, group, vendor, title..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Source
            </label>

            <select
              name="sourceType"
              defaultValue={
                sourceType
              }
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                FinanceSourceType,
              ).map(
                (item) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {formatEnumLabel(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Category
            </label>

            <select
              name="category"
              defaultValue={
                category
              }
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpenseCategory,
              ).map(
                (item) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {formatEnumLabel(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Cost Type
            </label>

            <select
              name="costType"
              defaultValue={
                costType
              }
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpenseCostType,
              ).map(
                (item) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {formatEnumLabel(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Approval
            </label>

            <select
              name="approvalStatus"
              defaultValue={
                approvalStatus
              }
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpenseApprovalStatus,
              ).map(
                (item) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {formatEnumLabel(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Payment Status
            </label>

            <select
              name="status"
              defaultValue={
                status
              }
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpensePaymentStatus,
              ).map(
                (item) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {formatEnumLabel(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              From
            </label>

            <input
              type="date"
              name="from"
              defaultValue={
                from
              }
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              To
            </label>

            <input
              type="date"
              name="to"
              defaultValue={
                to
              }
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Client Company
            </label>

            <input
              name="clientCompany"
              defaultValue={
                clientCompany
              }
              placeholder="CTS"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Spender
            </label>

            <input
              name="spender"
              defaultValue={
                spender
              }
              placeholder="Erdal"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Tour Category
            </label>

            <input
              name="tourCategory"
              defaultValue={
                tourCategory
              }
              placeholder="Pilgrimage"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Apply
            </button>
          </div>

          <div className="flex items-end">
            <Link
              href="/admin/finance/expenses"
              className="w-full rounded-xl border px-4 py-2.5 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Reset Filters
            </Link>
          </div>
        </div>
      </form>

      {/* ================================================== */}
      {/* CONSOLIDATED EXPENSE SUMMARY */}
      {/* ================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5">
          <h2 className="text-lg font-bold text-slate-950">
            Expense Summary
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Consolidated by Vendor /
            Payee, Category and Currency.
            Individual expense records
            remain available below.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  Vendor / Payee
                </th>

                <th className="px-5 py-3">
                  Category
                </th>

                <th className="px-5 py-3 text-center">
                  Expenses
                </th>

                <th className="px-5 py-3 text-right">
                  Total
                </th>

                <th className="px-5 py-3 text-right">
                  Paid
                </th>

                <th className="px-5 py-3 text-right">
                  Pending
                </th>

                <th className="px-5 py-3 text-right">
                  VAT / Tax
                </th>

                <th className="px-5 py-3 text-center">
                  Currency
                </th>

                <th className="px-5 py-3">
                  Position
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {expenseSummaries.map(
                (
                  summary,
                ) => (
                  <tr
                    key={
                      summary.key
                    }
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-semibold text-[#001F3F]">
                      {
                        summary.vendorName
                      }
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatEnumLabel(
                        summary.category,
                      )}
                    </td>

                    <td className="px-5 py-4 text-center font-medium text-slate-700">
                      {
                        summary.expenseCount
                      }
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-slate-900">
                      {formatMoney(
                        summary.total,
                        summary.currency,
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-emerald-700">
                      {formatMoney(
                        summary.paid,
                        summary.currency,
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-amber-700">
                      {formatMoney(
                        summary.pending,
                        summary.currency,
                      )}
                    </td>

                    <td className="px-5 py-4 text-right text-slate-600">
                      {formatMoney(
                        summary.tax,
                        summary.currency,
                      )}
                    </td>

                    <td className="px-5 py-4 text-center font-medium text-slate-600">
                      {
                        summary.currency
                      }
                    </td>

                    <td className="px-5 py-4">
                      {summary.pending >
                      0 ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Outstanding
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ),
              )}

              {expenseSummaries.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      9
                    }
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No expense
                    summary records
                    match the current
                    filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================== */}
      {/* INDIVIDUAL EXPENSES */}
      {/* ================================================== */}

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5">
          <h2 className="text-lg font-bold text-slate-950">
            Individual Expenses
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Detailed records are
            preserved for audit,
            document tracking and
            reconciliation.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1900px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Date
                </th>

                <th className="px-4 py-3 font-medium">
                  Title
                </th>

                <th className="px-4 py-3 font-medium">
                  Source
                </th>

                <th className="px-4 py-3 font-medium">
                  Category
                </th>

                <th className="px-4 py-3 font-medium">
                  Cost Type
                </th>

                <th className="px-4 py-3 font-medium">
                  Approval
                </th>

                <th className="px-4 py-3 font-medium">
                  Vendor / Payee
                </th>

                <th className="px-4 py-3 font-medium">
                  Spender
                </th>

                <th className="px-4 py-3 font-medium">
                  Booking
                </th>

                <th className="px-4 py-3 font-medium">
                  Tour
                </th>

                <th className="px-4 py-3 font-medium">
                  Departure
                </th>

                <th className="px-4 py-3 font-medium">
                  Invoice
                </th>

                <th className="px-4 py-3 font-medium">
                  Tax
                </th>

                <th className="px-4 py-3 font-medium">
                  Payment
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  Amount
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {expenses.map(
                (
                  expense,
                ) => (
                  <tr
                    key={
                      expense.id
                    }
                    className="border-t transition hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(
                        expense.expenseDate,
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-[#001F3F]">
                        {
                          expense.title
                        }
                      </div>

                      {expense.description ? (
                        <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {
                            expense.description
                          }
                        </div>
                      ) : null}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {formatEnumLabel(
                        expense.sourceType,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {formatEnumLabel(
                        expense.category,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {formatEnumLabel(
                        expense.costType,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getApprovalStatusClass(
                          expense.approvalStatus,
                        )}`}
                      >
                        {formatEnumLabel(
                          expense.approvalStatus,
                        )}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {expense.vendorName ||
                        "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {expense.spenderName ||
                        "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {expense.booking ? (
                        <Link
                          href={`/admin/bookings/${expense.booking.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {expense.booking.bookingDisplayCode ||
                            expense.booking.bookingReference}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {expense.tour ? (
                        <Link
                          href={`/admin/tours/${expense.tour.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {expense.tour.tourCode
                            ? `${expense.tour.tourCode} — ${expense.tour.title}`
                            : expense.tour.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {expense.departureDate
                        ? formatDate(
                            expense
                              .departureDate
                              .date,
                          )
                        : "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {expense.receiptUrl ? (
                        <div className="flex gap-3">
                          <Link
                            href={
                              expense.receiptUrl
                            }
                            target="_blank"
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </Link>

                          <a
                            href={
                              expense.receiptUrl
                            }
                            download
                            className="text-green-700 hover:underline"
                          >
                            Download
                          </a>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <div>
                        {formatEnumLabel(
                          expense.taxType,
                        )}
                      </div>

                      {(expense.taxAmount ||
                        0) >
                      0 ? (
                        <div className="text-xs text-slate-500">
                          {formatMoney(
                            expense.taxAmount ||
                              0,
                            expense.currency,
                          )}
                        </div>
                      ) : null}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getPaymentStatusClass(
                          expense.paymentStatus,
                        )}`}
                      >
                        {formatEnumLabel(
                          expense.paymentStatus,
                        )}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-700">
                      -
                      {formatMoney(
                        expense.amount,
                        expense.currency,
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3 whitespace-nowrap">
                        <Link
                          href={`/admin/finance/expenses/${expense.id}/edit`}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </Link>

                        <DeleteExpenseButton
                          expenseId={
                            expense.id
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ),
              )}

              {expenses.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      16
                    }
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No additional
                    expenses found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* ================================================ */}
        {/* PAGINATION */}
        {/* ================================================ */}

        <div className="flex flex-col gap-3 border-t bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Showing{" "}
            {expenses.length}{" "}
            of{" "}
            {totalCount}{" "}
            expenses — Page{" "}
            {currentPage}{" "}
            of{" "}
            {totalPages}
          </p>

          <div className="flex gap-2">
            <Link
              href={buildPageHref(
                Math.max(
                  1,
                  currentPage -
                    1,
                ),
              )}
              className={`rounded-lg border px-4 py-2 text-sm ${
                currentPage <=
                1
                  ? "pointer-events-none opacity-50"
                  : "hover:border-[#8B0000] hover:text-[#8B0000]"
              }`}
            >
              Previous
            </Link>

            <Link
              href={buildPageHref(
                Math.min(
                  totalPages,
                  currentPage +
                    1,
                ),
              )}
              className={`rounded-lg border px-4 py-2 text-sm ${
                currentPage >=
                totalPages
                  ? "pointer-events-none opacity-50"
                  : "hover:border-[#8B0000] hover:text-[#8B0000]"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "red"
    | "green"
    | "amber"
    | "blue";
}) {
  const styles = {
    red: "border-red-100 bg-red-50 text-red-800",
    green:
      "border-emerald-100 bg-emerald-50 text-emerald-800",
    amber:
      "border-amber-100 bg-amber-50 text-amber-800",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${styles[tone]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}