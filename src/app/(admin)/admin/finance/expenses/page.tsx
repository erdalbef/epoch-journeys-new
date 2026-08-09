import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExpenseCategory,
  ExpensePaymentStatus,
  FinanceDirection,
  FinanceSourceType,
  Prisma,
  Role,
} from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/payments/formatCurrency";
import DeleteExpenseButton from "@/components/admin/finance/DeleteExpenseButton";

type SearchParams = {
  q?: string;
  category?: string;
  status?: string;
  direction?: string;
  sourceType?: string;
  clientCompany?: string;
  spender?: string;
  tourCategory?: string;
  from?: string;
  to?: string;
  page?: string;
};

function formatDate(
  value: Date | string | null | undefined,
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatEnumLabel(
  value: string | null | undefined,
) {
  if (!value) {
    return "-";
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

function getExpenseStatusClass(
  status: ExpensePaymentStatus,
) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";

    case "PENDING":
      return "bg-amber-100 text-amber-700";

    case "CANCELLED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getBookingPaymentStatusClass(
  status: string,
) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";

    case "PARTIALLY_PAID":
      return "bg-blue-100 text-blue-700";

    case "UNPAID":
      return "bg-amber-100 text-amber-700";

    case "REFUNDED":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getSupplierPaymentStatusClass(
  status: string,
) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";

    case "PARTIALLY_PAID":
      return "bg-blue-100 text-blue-700";

    case "UNPAID":
      return "bg-amber-100 text-amber-700";

    case "OVERDUE":
      return "bg-orange-100 text-orange-700";

    case "CANCELLED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getDirectionClass(
  direction: FinanceDirection,
) {
  switch (direction) {
    case "INCOME":
      return "bg-green-100 text-green-700";

    case "EXPENSE":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function AdminFinanceEntriesPage({
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
    session.user.role !== Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const params =
    (await searchParams) ?? {};

  const q =
    params.q?.trim() ?? "";

  const category =
    params.category?.trim() ?? "";

  const status =
    params.status?.trim() ?? "";

  const direction =
    params.direction?.trim() ?? "";

  const sourceType =
    params.sourceType?.trim() ?? "";

  const from =
    params.from?.trim() ?? "";

  const to =
    params.to?.trim() ?? "";

  const clientCompany =
    params.clientCompany?.trim() ??
    "";

  const spender =
    params.spender?.trim() ?? "";

  const tourCategory =
    params.tourCategory?.trim() ??
    "";

  const currentPage = Math.max(
    1,
    Number(params.page || "1"),
  );

  const pageSize = 10;

  const skip =
    (currentPage - 1) *
    pageSize;

  /* ============================================================
     DIRECT / MANUAL FINANCE ENTRY FILTERS
     ============================================================ */

  const searchConditions:
    Prisma.ExpenseWhereInput[] = q
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
          agentNameSnapshot: {
            contains: q,
            mode:
              Prisma.QueryMode
                .insensitive,
          },
        },

        {
          partnerCompanyName: {
            contains: q,
            mode:
              Prisma.QueryMode
                .insensitive,
          },
        },

        {
          tourLeaderName: {
            contains: q,
            mode:
              Prisma.QueryMode
                .insensitive,
          },
        },

        {
          customPackageName: {
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
          clientCompanyName: {
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
          tourCategoryName: {
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

  const expenseWhere:
    Prisma.ExpenseWhereInput = {
    ...(searchConditions.length > 0
      ? {
          OR: searchConditions,
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

    ...(direction &&
    Object.values(
      FinanceDirection,
    ).includes(
      direction as FinanceDirection,
    )
      ? {
          direction:
            direction as FinanceDirection,
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
          clientCompanyName: {
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
          tourCategoryName: {
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
                  gte: new Date(
                    `${from}T00:00:00.000Z`,
                  ),
                }
              : {}),

            ...(to
              ? {
                  lte: new Date(
                    `${to}T23:59:59.999Z`,
                  ),
                }
              : {}),
          },
        }
      : {}),
  };

  /* ============================================================
     CUSTOMER RECEIVABLE FILTERS

     Only CONFIRMED bookings represent recognized customer
     receivables in this view.
     ============================================================ */

  const bookingWhere:
    Prisma.BookingWhereInput = {
    status: "CONFIRMED",

    ...(q
      ? {
          OR: [
            {
              bookingReference: {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
            },

            {
              bookingDisplayCode: {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
            },

            {
              tourTitleSnapshot: {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
            },

            {
              agencyNameSnapshot: {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
            },

            {
              customerName: {
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
              agentNameSnapshot: {
                contains: q,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
            },
          ],
        }
      : {}),

    ...(clientCompany
      ? {
          OR: [
            {
              agencyNameSnapshot: {
                contains:
                  clientCompany,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
            },

            {
              customerName: {
                contains:
                  clientCompany,
                mode:
                  Prisma.QueryMode
                    .insensitive,
              },
            },
          ],
        }
      : {}),

    ...(tourCategory
      ? {
          categorySnapshot: {
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
          createdAt: {
            ...(from
              ? {
                  gte: new Date(
                    `${from}T00:00:00.000Z`,
                  ),
                }
              : {}),

            ...(to
              ? {
                  lte: new Date(
                    `${to}T23:59:59.999Z`,
                  ),
                }
              : {}),
          },
        }
      : {}),
  };

  /* ============================================================
     SUPPLIER PAYABLE FILTERS
     ============================================================ */

  const supplierPayableWhere:
    Prisma.SupplierPayableWhereInput =
    {
      approvalStatus:
        "APPROVED",

      ...(q
        ? {
            OR: [
              {
                title: {
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
                supplierNameSnapshot:
                  {
                    contains: q,
                    mode:
                      Prisma
                        .QueryMode
                        .insensitive,
                  },
              },

              {
                supplierInvoiceNumber:
                  {
                    contains: q,
                    mode:
                      Prisma
                        .QueryMode
                        .insensitive,
                  },
              },

              {
                serviceNameSnapshot:
                  {
                    contains: q,
                    mode:
                      Prisma
                        .QueryMode
                        .insensitive,
                  },
              },

              {
                tour: {
                  title: {
                    contains: q,
                    mode:
                      Prisma
                        .QueryMode
                        .insensitive,
                  },
                },
              },
            ],
          }
        : {}),

      ...(from || to
        ? {
            invoiceDate: {
              ...(from
                ? {
                    gte: new Date(
                      `${from}T00:00:00.000Z`,
                    ),
                  }
                : {}),

              ...(to
                ? {
                    lte: new Date(
                      `${to}T23:59:59.999Z`,
                    ),
                  }
                : {}),
            },
          }
        : {}),
    };

  /* ============================================================
     DATABASE QUERIES
     ============================================================ */

  const [
    expenses,
    totalExpenseCount,
    expenseSummary,

    customerReceivables,
    customerReceivableSummary,

    supplierPayables,
    supplierPayableSummary,
  ] = await Promise.all([
    /* --------------------------------------------------------
       Direct / Manual Entries
       -------------------------------------------------------- */

    db.expense.findMany({
      where:
        expenseWhere,

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
      take: pageSize,

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

        departureDate: {
          select: {
            id: true,
            date: true,
          },
        },
      },
    }),

    db.expense.count({
      where:
        expenseWhere,
    }),

    db.expense.findMany({
      where:
        expenseWhere,

      select: {
        amount: true,
        direction: true,
        paymentStatus:
          true,
        taxAmount: true,
        bookingId: true,
      },
    }),

    /* --------------------------------------------------------
       Customer Receivables

       Display confirmed bookings only.
       -------------------------------------------------------- */

    db.booking.findMany({
      where:
        bookingWhere,

      orderBy: [
        {
          createdAt:
            "desc",
        },
      ],

      take: 100,

      select: {
        id: true,

        bookingReference:
          true,

        bookingDisplayCode:
          true,

        bookingType:
          true,

        status:
          true,

        paymentStatus:
          true,

        totalPrice:
          true,

        amountPaid:
          true,

        amountDue:
          true,

        currency:
          true,

        numberOfGuests:
          true,

        agencyNameSnapshot:
          true,

        agentNameSnapshot:
          true,

        customerName:
          true,

        groupName:
          true,

        tourTitleSnapshot:
          true,

        categorySnapshot:
          true,

        departureDateSnapshot:
          true,

        paymentDueDate:
          true,

        createdAt:
          true,

        payments: {
          where: {
            status:
              "RECEIVED",
          },

          orderBy: {
            paidAt:
              "desc",
          },

          take: 1,

          select: {
            id: true,
            amount: true,
            currency: true,
            method: true,
            reference: true,
            paidAt: true,
          },
        },
      },
    }),

    /*
     * Headline accounting currently uses EUR only.
     *
     * We must not mathematically combine EUR with USD,
     * GBP, PLN, TRY, etc. until booking-level base
     * currency conversion is implemented.
     */
    db.booking.findMany({
      where: {
        status:
          "CONFIRMED",

        currency:
          "EUR",
      },

      select: {
        totalPrice:
          true,

        amountPaid:
          true,

        amountDue:
          true,
      },
    }),

    /* --------------------------------------------------------
       Approved Supplier Costs
       -------------------------------------------------------- */

    db.supplierPayable.findMany({
      where:
        supplierPayableWhere,

      orderBy: [
        {
          invoiceDate:
            "desc",
        },
        {
          createdAt:
            "desc",
        },
      ],

      take: 100,

      select: {
        id: true,

        title: true,
        description: true,

        supplierNameSnapshot:
          true,

        serviceNameSnapshot:
          true,

        supplierInvoiceNumber:
          true,

        invoiceDate:
          true,

        dueDate:
          true,

        currency:
          true,

        approvedAmount:
          true,

        creditAmount:
          true,

        amountPaid:
          true,

        balance:
          true,

        approvalStatus:
          true,

        paymentStatus:
          true,

        documentUrl:
          true,

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

        departureDate: {
          select: {
            id: true,
            date: true,
          },
        },

        payments: {
          orderBy: {
            paymentDate:
              "desc",
          },

          take: 1,

          select: {
            id: true,
            amount: true,
            currency: true,
            paymentDate:
              true,
            method: true,
            reference:
              true,
          },
        },
      },
    }),

    /*
     * EUR only for headline accounting until supplier
     * payable base-currency conversion exists.
     */
    db.supplierPayable.findMany({
      where: {
        approvalStatus:
          "APPROVED",

        currency:
          "EUR",
      },

      select: {
        approvedAmount:
          true,

        creditAmount:
          true,

        amountPaid:
          true,

        balance:
          true,
      },
    }),
  ]);

  /* ============================================================
     PAGINATION
     ============================================================ */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalExpenseCount /
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

    if (direction) {
      search.set(
        "direction",
        direction,
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

    if (clientCompany) {
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

    if (tourCategory) {
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

  /* ============================================================
     DIRECT / MANUAL ENTRY SUMMARY
     ============================================================ */

  /*
   * Manual income linked to a booking is excluded from the
   * headline revenue calculation.
   *
   * The confirmed booking itself is the receivable/revenue basis.
   */
  const manualIncome =
    expenseSummary
      .filter(
        (item) =>
          item.direction ===
            "INCOME" &&
          !item.bookingId,
      )
      .reduce(
        (sum, item) =>
          sum +
          item.amount,
        0,
      );

  const directExpenses =
    expenseSummary
      .filter(
        (item) =>
          item.direction ===
          "EXPENSE",
      )
      .reduce(
        (sum, item) =>
          sum +
          item.amount,
        0,
      );

  const paidManualIncome =
    expenseSummary
      .filter(
        (item) =>
          item.direction ===
            "INCOME" &&
          !item.bookingId &&
          item.paymentStatus ===
            "PAID",
      )
      .reduce(
        (sum, item) =>
          sum +
          item.amount,
        0,
      );

  const pendingManualIncome =
    expenseSummary
      .filter(
        (item) =>
          item.direction ===
            "INCOME" &&
          !item.bookingId &&
          item.paymentStatus ===
            "PENDING",
      )
      .reduce(
        (sum, item) =>
          sum +
          item.amount,
        0,
      );

  const paidDirectExpenses =
    expenseSummary
      .filter(
        (item) =>
          item.direction ===
            "EXPENSE" &&
          item.paymentStatus ===
            "PAID",
      )
      .reduce(
        (sum, item) =>
          sum +
          item.amount,
        0,
      );

  const pendingDirectExpenses =
    expenseSummary
      .filter(
        (item) =>
          item.direction ===
            "EXPENSE" &&
          item.paymentStatus ===
            "PENDING",
      )
      .reduce(
        (sum, item) =>
          sum +
          item.amount,
        0,
      );

  const totalTax =
    expenseSummary.reduce(
      (sum, item) =>
        sum +
        (item.taxAmount ||
          0),
      0,
    );

  /* ============================================================
     CUSTOMER RECEIVABLE SUMMARY
     ============================================================ */

  const bookingReceivables =
    customerReceivableSummary.reduce(
      (sum, booking) =>
        sum +
        booking.totalPrice,
      0,
    );

  const customerAmountReceived =
    customerReceivableSummary.reduce(
      (sum, booking) =>
        sum +
        booking.amountPaid,
      0,
    );

  const customerOutstanding =
    customerReceivableSummary.reduce(
      (sum, booking) =>
        sum +
        booking.amountDue,
      0,
    );

  /* ============================================================
     SUPPLIER PAYABLE SUMMARY
     ============================================================ */

  const approvedSupplierCosts =
    supplierPayableSummary.reduce(
      (sum, payable) =>
        sum +
        Math.max(
          Number(
            payable.approvedAmount,
          ) -
            Number(
              payable.creditAmount,
            ),
          0,
        ),
      0,
    );

  const supplierAmountPaid =
    supplierPayableSummary.reduce(
      (sum, payable) =>
        sum +
        Number(
          payable.amountPaid,
        ),
      0,
    );

  const supplierOutstanding =
    supplierPayableSummary.reduce(
      (sum, payable) =>
        sum +
        Number(
          payable.balance,
        ),
      0,
    );

  /* ============================================================
     HEADLINE ACCOUNTING
     ============================================================ */

  /*
   * Booking revenue is recognized ONCE from confirmed bookings.
   *
   * Customer payments are cash settlements only and therefore
   * are NOT added again as income.
   */
  const totalRevenue =
    bookingReceivables +
    manualIncome;

  /*
   * Supplier costs are recognized ONCE from approved payables.
   *
   * Supplier payments are cash settlements only and therefore
   * are NOT added again as expenses.
   */
  const totalExpenses =
    directExpenses +
    approvedSupplierCosts;

  const netProfit =
    totalRevenue -
    totalExpenses;

  return (
    <div className="space-y-6 p-6">
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Finance Entries
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Unified financial view of
            confirmed customer
            receivables, direct finance
            entries and approved
            supplier costs without
            double-counting customer or
            supplier payments.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/finance"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Finance Dashboard
          </Link>

          <Link
            href="/admin/supplier-payables"
            className="rounded-xl border border-[#001F3F] bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] transition hover:bg-[#001F3F] hover:text-white"
          >
            Supplier Payables
          </Link>

          <Link
            href="/admin/finance/expenses/create"
            className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
          >
            Add Direct Expense
          </Link>
        </div>
      </div>

      {/* ====================================================== */}
      {/* HEADLINE ACCOUNTING */}
      {/* ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Revenue"
          value={formatCurrency(
            totalRevenue,
            "EUR",
          )}
          description="Confirmed EUR bookings + non-booking manual income"
          className="border-green-200 bg-green-50"
          labelClassName="text-green-700"
          valueClassName="text-green-800"
        />

        <SummaryCard
          label="Total Expenses"
          value={formatCurrency(
            totalExpenses,
            "EUR",
          )}
          description="Direct expenses + approved EUR supplier costs"
          className="border-red-200 bg-red-50"
          labelClassName="text-red-700"
          valueClassName="text-red-800"
        />

        <SummaryCard
          label="Net Profit"
          value={formatCurrency(
            netProfit,
            "EUR",
          )}
          description="Revenue less recognized expenses"
          className="border-blue-200 bg-blue-50"
          labelClassName="text-blue-700"
          valueClassName={
            netProfit >= 0
              ? "text-blue-800"
              : "text-red-700"
          }
        />

        <SummaryCard
          label="VAT / Tax"
          value={formatCurrency(
            totalTax,
            "EUR",
          )}
          description="Tax recorded on direct finance entries"
          className="border-amber-200 bg-amber-50"
          labelClassName="text-amber-700"
          valueClassName="text-amber-800"
        />
      </div>

      {/* ====================================================== */}
      {/* CUSTOMER RECEIVABLE SUMMARY */}
      {/* ====================================================== */}

      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">
            Accounts Receivable
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
            Customer Receivables
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Confirmed bookings are
            recognized once as
            receivables. Customer
            deposits and installments
            reduce the outstanding
            balance and create Bank
            Ledger cash-in transactions,
            but do not create additional
            revenue.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Confirmed Receivables"
            value={formatCurrency(
              bookingReceivables,
              "EUR",
            )}
            valueClassName="text-[#001F3F]"
          />

          <MetricCard
            label="Customer Payments Received"
            value={formatCurrency(
              customerAmountReceived,
              "EUR",
            )}
            valueClassName="text-green-700"
          />

          <MetricCard
            label="Outstanding Receivables"
            value={formatCurrency(
              customerOutstanding,
              "EUR",
            )}
            valueClassName="text-amber-700"
          />
        </div>
      </section>

      {/* ====================================================== */}
      {/* SUPPLIER LIABILITY SUMMARY */}
      {/* ====================================================== */}

      <section className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-700">
            Accounts Payable
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
            Supplier Liabilities
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Approved supplier payables
            are recognized once as
            supplier costs. Deposits and
            installments reduce the
            liability but do not create
            additional expenses.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Approved Supplier Costs"
            value={formatCurrency(
              approvedSupplierCosts,
              "EUR",
            )}
            valueClassName="text-red-700"
          />

          <MetricCard
            label="Supplier Payments Made"
            value={formatCurrency(
              supplierAmountPaid,
              "EUR",
            )}
            valueClassName="text-green-700"
          />

          <MetricCard
            label="Outstanding Payables"
            value={formatCurrency(
              supplierOutstanding,
              "EUR",
            )}
            valueClassName="text-amber-700"
          />
        </div>
      </section>

      {/* ====================================================== */}
      {/* MANUAL / DIRECT SUMMARY */}
      {/* ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Manual Income"
          value={formatCurrency(
            manualIncome,
            "EUR",
          )}
          valueClassName="text-green-700"
          description="Income not linked to confirmed bookings"
        />

        <MetricCard
          label="Direct Expenses"
          value={formatCurrency(
            directExpenses,
            "EUR",
          )}
          valueClassName="text-red-700"
        />

        <MetricCard
          label="Paid Direct Expenses"
          value={formatCurrency(
            paidDirectExpenses,
            "EUR",
          )}
          valueClassName="text-red-700"
        />

        <MetricCard
          label="Pending Direct Expenses"
          value={formatCurrency(
            pendingDirectExpenses,
            "EUR",
          )}
          valueClassName="text-amber-700"
        />
      </div>

      {(paidManualIncome > 0 ||
        pendingManualIncome >
          0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            label="Paid Manual Income"
            value={formatCurrency(
              paidManualIncome,
              "EUR",
            )}
            valueClassName="text-green-700"
          />

          <MetricCard
            label="Pending Manual Income"
            value={formatCurrency(
              pendingManualIncome,
              "EUR",
            )}
            valueClassName="text-amber-700"
          />
        </div>
      )}

      {/* ====================================================== */}
      {/* FILTERS */}
      {/* ====================================================== */}

      <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>

            <input
              name="q"
              defaultValue={q}
              placeholder="Booking, supplier, agency, tour, invoice, vendor..."
              className={filterClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Direction
            </label>

            <select
              name="direction"
              defaultValue={
                direction
              }
              className={filterClass}
            >
              <option value="">
                All
              </option>

              {Object.values(
                FinanceDirection,
              ).map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {formatEnumLabel(
                    item,
                  )}
                </option>
              ))}
            </select>
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
              className={filterClass}
            >
              <option value="">
                All
              </option>

              {Object.values(
                FinanceSourceType,
              ).map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {formatEnumLabel(
                    item,
                  )}
                </option>
              ))}
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
              className={filterClass}
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpenseCategory,
              ).map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {formatEnumLabel(
                    item,
                  )}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Direct Entry Status
            </label>

            <select
              name="status"
              defaultValue={
                status
              }
              className={filterClass}
            >
              <option value="">
                All
              </option>

              {Object.values(
                ExpensePaymentStatus,
              ).map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {formatEnumLabel(
                    item,
                  )}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              From
            </label>

            <input
              type="date"
              name="from"
              defaultValue={from}
              className={filterClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              To
            </label>

            <input
              type="date"
              name="to"
              defaultValue={to}
              className={filterClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Client / Agency
            </label>

            <input
              name="clientCompany"
              defaultValue={
                clientCompany
              }
              placeholder="Agency or client"
              className={filterClass}
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
              placeholder="Staff / tour manager"
              className={filterClass}
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
              className={filterClass}
            />
          </div>

          <div className="flex items-end">
            <Link
              href="/admin/finance/expenses"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Reset Filters
            </Link>
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-400">
          Direction, source,
          category, spender and direct
          entry status filters apply
          primarily to manual Finance
          Entries. Search and date
          filters also help narrow
          customer receivables and
          supplier payables.
        </p>
      </form>

      {/* ====================================================== */}
      {/* CUSTOMER RECEIVABLES TABLE */}
      {/* ====================================================== */}

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#001F3F]">
              Customer Receivables
            </h2>

            <p className="text-sm text-slate-500">
              Confirmed bookings only.
              Each booking appears once
              regardless of how many
              deposits or installments
              have been received.
            </p>
          </div>

          <Link
            href="/admin/bookings"
            className="text-sm font-semibold text-[#8B0000] hover:underline"
          >
            Manage Bookings →
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    Booking
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Client / Agency
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Tour
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Departure
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Guests
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Receivable
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Received
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Outstanding
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Latest Payment
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {customerReceivables.map(
                  (booking) => {
                    const latestPayment =
                      booking
                        .payments[0];

                    const displayCode =
                      booking.bookingDisplayCode ||
                      booking.bookingReference;

                    const clientLabel =
                      booking.agencyNameSnapshot ||
                      booking.customerName ||
                      booking.groupName ||
                      booking.agentNameSnapshot ||
                      "-";

                    return (
                      <tr
                        key={
                          booking.id
                        }
                        className="border-t border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            {
                              displayCode
                            }
                          </Link>

                          <div className="mt-1 text-xs text-slate-500">
                            {formatEnumLabel(
                              booking.bookingType,
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {
                              clientLabel
                            }
                          </div>

                          {booking.groupName &&
                          booking.groupName !==
                            clientLabel ? (
                            <div className="mt-1 text-xs text-slate-500">
                              Group:{" "}
                              {
                                booking.groupName
                              }
                            </div>
                          ) : null}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-[#001F3F]">
                            {
                              booking.tourTitleSnapshot
                            }
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {formatEnumLabel(
                              booking.categorySnapshot,
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {formatDate(
                            booking.departureDateSnapshot,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {
                            booking.numberOfGuests
                          }
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBookingPaymentStatusClass(
                              booking.paymentStatus,
                            )}`}
                          >
                            {formatEnumLabel(
                              booking.paymentStatus,
                            )}
                          </span>

                          {booking.paymentDueDate ? (
                            <div className="mt-1 text-xs text-slate-500">
                              Due{" "}
                              {formatDate(
                                booking.paymentDueDate,
                              )}
                            </div>
                          ) : null}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#001F3F]">
                          {formatCurrency(
                            booking.totalPrice,
                            booking.currency,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-700">
                          {formatCurrency(
                            booking.amountPaid,
                            booking.currency,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-700">
                          {formatCurrency(
                            booking.amountDue,
                            booking.currency,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {latestPayment ? (
                            <div>
                              <div className="font-medium text-green-700">
                                {formatCurrency(
                                  latestPayment.amount,
                                  latestPayment.currency,
                                )}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {formatDate(
                                  latestPayment.paidAt,
                                )}
                                {" · "}
                                {formatEnumLabel(
                                  latestPayment.method,
                                )}
                              </div>

                              {latestPayment.reference ? (
                                <div className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                                  {
                                    latestPayment.reference
                                  }
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              No payments
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            View Booking
                          </Link>
                        </td>
                      </tr>
                    );
                  },
                )}

                {customerReceivables.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No confirmed
                      customer receivables
                      found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* APPROVED SUPPLIER COSTS TABLE */}
      {/* ====================================================== */}

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#001F3F]">
              Approved Supplier Costs
            </h2>

            <p className="text-sm text-slate-500">
              Each payable appears once.
              Deposits and installments
              remain payments against the
              original supplier liability.
            </p>
          </div>

          <Link
            href="/admin/supplier-payables"
            className="text-sm font-semibold text-[#8B0000] hover:underline"
          >
            Manage Supplier Payables →
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    Invoice Date
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Supplier / Cost
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Invoice
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
                    Status
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Approved
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Paid
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Balance
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Latest Payment
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {supplierPayables.map(
                  (payable) => {
                    const latestPayment =
                      payable
                        .payments[0];

                    return (
                      <tr
                        key={
                          payable.id
                        }
                        className="border-t border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          {formatDate(
                            payable.invoiceDate,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#001F3F]">
                            {
                              payable.supplierNameSnapshot
                            }
                          </div>

                          <div className="mt-1 text-sm text-slate-700">
                            {
                              payable.title
                            }
                          </div>

                          {payable.serviceNameSnapshot ? (
                            <div className="mt-1 text-xs text-slate-500">
                              {
                                payable.serviceNameSnapshot
                              }
                            </div>
                          ) : null}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <div>
                            {payable.supplierInvoiceNumber ||
                              "-"}
                          </div>

                          {payable.dueDate ? (
                            <div className="mt-1 text-xs text-slate-500">
                              Due{" "}
                              {formatDate(
                                payable.dueDate,
                              )}
                            </div>
                          ) : null}

                          {payable.documentUrl ? (
                            <Link
                              href={
                                payable.documentUrl
                              }
                              target="_blank"
                              className="mt-1 block text-xs text-blue-600 hover:underline"
                            >
                              View document
                            </Link>
                          ) : null}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {payable.booking ? (
                            <Link
                              href={`/admin/bookings/${payable.booking.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {payable.booking.bookingDisplayCode ||
                                payable.booking.bookingReference}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {payable.tour ? (
                            <Link
                              href={`/admin/tours/${payable.tour.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {payable.tour.tourCode
                                ? `${payable.tour.tourCode} — ${payable.tour.title}`
                                : payable.tour.title}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {payable.departureDate
                            ? formatDate(
                                payable
                                  .departureDate
                                  .date,
                              )
                            : "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getSupplierPaymentStatusClass(
                              payable.paymentStatus,
                            )}`}
                          >
                            {formatEnumLabel(
                              payable.paymentStatus,
                            )}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-700">
                          {formatCurrency(
                            Number(
                              payable.approvedAmount,
                            ),
                            payable.currency,
                          )}

                          {Number(
                            payable.creditAmount,
                          ) > 0 ? (
                            <div className="mt-1 text-xs font-normal text-slate-500">
                              Credit:{" "}
                              {formatCurrency(
                                Number(
                                  payable.creditAmount,
                                ),
                                payable.currency,
                              )}
                            </div>
                          ) : null}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-700">
                          {formatCurrency(
                            Number(
                              payable.amountPaid,
                            ),
                            payable.currency,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-amber-700">
                          {formatCurrency(
                            Number(
                              payable.balance,
                            ),
                            payable.currency,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {latestPayment ? (
                            <div>
                              <div className="font-medium text-green-700">
                                {formatCurrency(
                                  Number(
                                    latestPayment.amount,
                                  ),
                                  latestPayment.currency,
                                )}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                {formatDate(
                                  latestPayment.paymentDate,
                                )}
                                {" · "}
                                {formatEnumLabel(
                                  latestPayment.method,
                                )}
                              </div>

                              {latestPayment.reference ? (
                                <div className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                                  {
                                    latestPayment.reference
                                  }
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              No payments
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Link
                            href={`/admin/supplier-payables/${payable.id}`}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            View Payable
                          </Link>
                        </td>
                      </tr>
                    );
                  },
                )}

                {supplierPayables.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No approved supplier
                      payables found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* DIRECT / MANUAL FINANCE ENTRIES */}
      {/* ====================================================== */}

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#001F3F]">
              Direct / Manual Finance
              Entries
            </h2>

            <p className="text-sm text-slate-500">
              Company overhead,
              miscellaneous direct costs
              and non-booking manual
              finance entries.
            </p>
          </div>

          <Link
            href="/admin/finance/expenses/create"
            className="text-sm font-semibold text-[#8B0000] hover:underline"
          >
            + Add Direct Expense
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1800px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    Date
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Title
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Direction
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Source
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Category
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Agency / Partner
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Group / Package
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Vendor / Payer
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
                    Status
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
                  (expense) => (
                    <tr
                      key={
                        expense.id
                      }
                      className="border-t border-slate-100 transition hover:bg-slate-50"
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
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${getDirectionClass(
                            expense.direction,
                          )}`}
                        >
                          {formatEnumLabel(
                            expense.direction,
                          )}
                        </span>
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

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {expense.partnerCompanyName ||
                              expense.agentNameSnapshot ||
                              "-"}
                          </div>

                          {expense.agentNameSnapshot &&
                          expense.partnerCompanyName ? (
                            <div className="text-xs text-slate-500">
                              Agent:{" "}
                              {
                                expense.agentNameSnapshot
                              }
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {expense.groupName ||
                              expense.customPackageName ||
                              "-"}
                          </div>

                          {expense.tourLeaderName ? (
                            <div className="text-xs text-slate-500">
                              Leader:{" "}
                              {
                                expense.tourLeaderName
                              }
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {expense.vendorName ||
                          "-"}
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
                          "-"
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
                          "-"
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {expense.departureDate
                          ? formatDate(
                              expense
                                .departureDate
                                .date,
                            )
                          : "-"}
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
                          "-"
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <div>
                          {formatEnumLabel(
                            expense.taxType,
                          )}
                        </div>

                        {(expense.taxAmount ||
                          0) > 0 ? (
                          <div className="text-xs text-slate-500">
                            {formatCurrency(
                              expense.taxAmount ||
                                0,
                              "EUR",
                            )}
                          </div>
                        ) : null}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${getExpenseStatusClass(
                            expense.paymentStatus,
                          )}`}
                        >
                          {formatEnumLabel(
                            expense.paymentStatus,
                          )}
                        </span>
                      </td>

                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                          expense.direction ===
                          "INCOME"
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {expense.direction ===
                        "INCOME"
                          ? "+"
                          : "-"}

                        {formatCurrency(
                          expense.amount,
                          "EUR",
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
                  0 && (
                  <tr>
                    <td
                      colSpan={16}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No direct finance
                      entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              Showing{" "}
              {expenses.length} of{" "}
              {totalExpenseCount} direct
              entries — Page{" "}
              {currentPage} of{" "}
              {totalPages}
            </p>

            <div className="flex gap-2">
              <Link
                href={buildPageHref(
                  Math.max(
                    1,
                    currentPage - 1,
                  ),
                )}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  currentPage <= 1
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
                    currentPage + 1,
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
        </div>
      </section>

      {/* ====================================================== */}
      {/* ACCOUNTING RULE */}
      {/* ====================================================== */}

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="font-semibold text-blue-950">
          Finance integration rule
        </p>

        <p className="mt-2 text-sm leading-6 text-blue-800">
          A confirmed booking is
          recognized once as a customer
          receivable. Customer deposits
          and installments are cash
          receipts against that
          receivable and are not added
          again as revenue. Likewise, an
          approved supplier payable is
          recognized once as a supplier
          cost, while supplier deposits
          and installments reduce the
          payable and are not counted
          again as expenses.
        </p>
      </div>
    </div>
  );
}

/* ============================================================ */
/* REUSABLE UI */
/* ============================================================ */

const filterClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

function SummaryCard({
  label,
  value,
  description,
  className,
  labelClassName,
  valueClassName,
}: {
  label: string;
  value: string;
  description?: string;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        className || "bg-white"
      }`}
    >
      <p
        className={`text-sm font-medium ${
          labelClassName ||
          "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${
          valueClassName ||
          "text-[#001F3F]"
        }`}
      >
        {value}
      </p>

      {description ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  valueClassName,
}: {
  label: string;
  value: string;
  description?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          valueClassName ||
          "text-[#001F3F]"
        }`}
      >
        {value}
      </p>

      {description ? (
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}