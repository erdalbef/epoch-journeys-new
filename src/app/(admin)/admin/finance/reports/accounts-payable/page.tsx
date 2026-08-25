import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  Prisma,
  Role,
  SupplierPayableApprovalStatus,
  SupplierPayablePaymentStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  approvalStatus?: string;
  paymentStatus?: string;
  aging?: string;
  q?: string;
}>;

type PageProps = {
  searchParams: SearchParams;
};

type AgingBucket =
  | "CURRENT"
  | "1_30"
  | "31_60"
  | "61_90"
  | "90_PLUS"
  | "ALL";

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

function enumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
}

function getDaysOverdue(
  dueDate: Date | null,
  now: Date,
) {
  if (!dueDate) return 0;

  const due = new Date(dueDate);

  due.setUTCHours(
    23,
    59,
    59,
    999,
  );

  if (due >= now) return 0;

  return Math.floor(
    (now.getTime() - due.getTime()) /
      86_400_000,
  );
}

function getAgingBucket(
  daysOverdue: number,
): AgingBucket {
  if (daysOverdue <= 0) return "CURRENT";
  if (daysOverdue <= 30) return "1_30";
  if (daysOverdue <= 60) return "31_60";
  if (daysOverdue <= 90) return "61_90";

  return "90_PLUS";
}

function agingLabel(
  bucket: AgingBucket,
) {
  switch (bucket) {
    case "CURRENT":
      return "Current";

    case "1_30":
      return "1–30 Days";

    case "31_60":
      return "31–60 Days";

    case "61_90":
      return "61–90 Days";

    case "90_PLUS":
      return "90+ Days";

    default:
      return "All";
  }
}

function validApprovalStatus(
  value: string | undefined,
) {
  if (!value) return undefined;

  return Object.values(
    SupplierPayableApprovalStatus,
  ).includes(
    value as SupplierPayableApprovalStatus,
  )
    ? (value as SupplierPayableApprovalStatus)
    : undefined;
}

function validPaymentStatus(
  value: string | undefined,
) {
  if (!value) return undefined;

  return Object.values(
    SupplierPayablePaymentStatus,
  ).includes(
    value as SupplierPayablePaymentStatus,
  )
    ? (value as SupplierPayablePaymentStatus)
    : undefined;
}

function validAging(
  value: string | undefined,
): AgingBucket {
  const allowed: AgingBucket[] = [
    "ALL",
    "CURRENT",
    "1_30",
    "31_60",
    "61_90",
    "90_PLUS",
  ];

  return allowed.includes(
    value as AgingBucket,
  )
    ? (value as AgingBucket)
    : "ALL";
}

export default async function AccountsPayablePage({
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

  const params = await searchParams;

  const from =
    parseDateStart(
      params.from,
    );

  const to =
    parseDateEnd(
      params.to,
    );

  const approvalStatus =
    validApprovalStatus(
      params.approvalStatus,
    );

  const paymentStatus =
    validPaymentStatus(
      params.paymentStatus,
    );

  const aging =
    validAging(
      params.aging,
    );

  const q =
    params.q?.trim() || "";

  // ==========================================================
  // FILTERS
  // ==========================================================

  const where: Prisma.SupplierPayableWhereInput = {
    ...(from || to
      ? {
          createdAt: {
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
          },
        }
      : {}),

    ...(approvalStatus
      ? {
          approvalStatus,
        }
      : {}),

    ...(paymentStatus
      ? {
          paymentStatus,
        }
      : {}),

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
              supplierNameSnapshot: {
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
              supplierReference: {
                contains: q,
                mode: "insensitive",
              },
            },

            {
              serviceNameSnapshot: {
                contains: q,
                mode: "insensitive",
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
              tour: {
                title: {
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

  const payables =
    await db.supplierPayable.findMany({
      where,

      orderBy: [
        {
          dueDate: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      take: 2000,

      select: {
        id: true,

        title: true,
        description: true,

        supplierInvoiceNumber: true,
        supplierReference: true,

        invoiceDate: true,
        dueDate: true,

        currency: true,

        contractedAmount: true,
        approvedAmount: true,
        creditAmount: true,

        amountPaid: true,
        balance: true,

        approvalStatus: true,
        paymentStatus: true,

        approvedAt: true,
        cancelledAt: true,

        supplierNameSnapshot: true,
        serviceNameSnapshot: true,
        rateNameSnapshot: true,

        createdAt: true,

        supplier: {
          select: {
            id: true,
            name: true,
            country: true,
            city: true,
          },
        },

        service: {
          select: {
            id: true,
            name: true,
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

        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },

        createdBy: {
          select: {
            fullName: true,
            email: true,
          },
        },

        approvedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },

        payments: {
          orderBy: {
            paymentDate: "asc",
          },

          select: {
            id: true,

            amount: true,
            currency: true,

            paymentDate: true,

            method: true,
            reference: true,

            bankAccount: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

  const now = new Date();

  // ==========================================================
  // BUILD PAYABLE ROWS
  // ==========================================================

  const rows = payables
    .map((payable) => {
      const paymentsTotal =
        payable.payments.reduce(
          (sum, payment) =>
            sum + Number(payment.amount),
          0,
        );

      const amountPaid =
        Number(payable.amountPaid) > 0
          ? Number(payable.amountPaid)
          : paymentsTotal;

      const approvedAmount =
        Number(payable.approvedAmount);

      const creditAmount =
        Number(payable.creditAmount);

      const effectiveLiability =
        Math.max(
          approvedAmount - creditAmount,
          0,
        );

      const outstanding =
        Math.max(
          effectiveLiability - amountPaid,
          0,
        );

      const dueDate =
        payable.dueDate ?? null;

      const daysOverdue =
        outstanding > 0
          ? getDaysOverdue(
              dueDate,
              now,
            )
          : 0;

      const agingBucket =
        getAgingBucket(
          daysOverdue,
        );

      const overdueAmount =
        dueDate &&
        dueDate < now &&
        outstanding > 0
          ? outstanding
          : 0;

      return {
        ...payable,

        approvedAmountNumber:
          approvedAmount,

        creditAmountNumber:
          creditAmount,

        amountPaidNumber:
          amountPaid,

        effectiveLiability,

        outstanding,

        dueDate,

        daysOverdue,

        agingBucket,

        overdueAmount,
      };
    })
    .filter((row) => {
      if (aging === "ALL") {
        return true;
      }

      return (
        row.agingBucket === aging
      );
    });

  // ==========================================================
  // CURRENCY SUMMARY
  // ==========================================================

  const groupedByCurrency =
    new Map<
      string,
      {
        liability: number;
        paid: number;
        outstanding: number;
        overdue: number;

        current: number;
        days1to30: number;
        days31to60: number;
        days61to90: number;
        days90plus: number;
      }
    >();

  for (const row of rows) {
    const summary =
      groupedByCurrency.get(
        row.currency,
      ) ?? {
        liability: 0,
        paid: 0,
        outstanding: 0,
        overdue: 0,

        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
      };

    if (
      row.approvalStatus ===
        SupplierPayableApprovalStatus.APPROVED &&
      row.paymentStatus !==
        SupplierPayablePaymentStatus.CANCELLED
    ) {
      summary.liability +=
        row.effectiveLiability;

      summary.paid +=
        row.amountPaidNumber;

      summary.outstanding +=
        row.outstanding;

      summary.overdue +=
        row.overdueAmount;

      if (row.outstanding > 0) {
        switch (
          row.agingBucket
        ) {
          case "CURRENT":
            summary.current +=
              row.outstanding;
            break;

          case "1_30":
            summary.days1to30 +=
              row.outstanding;
            break;

          case "31_60":
            summary.days31to60 +=
              row.outstanding;
            break;

          case "61_90":
            summary.days61to90 +=
              row.outstanding;
            break;

          case "90_PLUS":
            summary.days90plus +=
              row.outstanding;
            break;
        }
      }
    }

    groupedByCurrency.set(
      row.currency,
      summary,
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

  if (aging !== "ALL") {
    exportParams.set(
      "aging",
      aging,
    );
  }

  if (q) {
    exportParams.set(
      "q",
      q,
    );
  }

  const exportHref =
    `/api/admin/finance/reports/accounts-payable?${exportParams.toString()}`;

  const openPayables =
    rows.filter(
      (row) =>
        row.approvalStatus ===
          SupplierPayableApprovalStatus.APPROVED &&
        row.paymentStatus !==
          SupplierPayablePaymentStatus.CANCELLED &&
        row.outstanding > 0.005,
    );

  const secondaryButton =
    "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";

  const primaryButton =
    "rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002d5a]";

  const currencyEntries =
    Array.from(
      groupedByCurrency.entries(),
    ).sort(([a], [b]) =>
      a.localeCompare(b),
    );

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Accounts Payable
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Approved supplier liabilities, payment history,
            outstanding balances, due dates, overdue amounts and
            payable aging.
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
            href="/admin/supplier-payables"
            className={primaryButton}
          >
            Supplier Payables
          </Link>
        </div>
      </div>

      {/* FILTERS */}

      <form className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
              placeholder="Supplier, invoice, booking, tour or service"
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
              htmlFor="approvalStatus"
              className="text-sm font-semibold text-slate-700"
            >
              Approval Status
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
                SupplierPayableApprovalStatus,
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
                SupplierPayablePaymentStatus,
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

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label
              htmlFor="aging"
              className="text-sm font-semibold text-slate-700"
            >
              Aging
            </label>

            <select
              id="aging"
              name="aging"
              defaultValue={aging}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="ALL">
                All Aging
              </option>

              <option value="CURRENT">
                Current
              </option>

              <option value="1_30">
                1–30 Days
              </option>

              <option value="31_60">
                31–60 Days
              </option>

              <option value="61_90">
                61–90 Days
              </option>

              <option value="90_PLUS">
                90+ Days
              </option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
            >
              Apply Filters
            </button>

            <Link
              href="/admin/finance/reports/accounts-payable"
              className={secondaryButton}
            >
              Clear
            </Link>
          </div>
        </div>
      </form>

      {/* CURRENCY SUMMARY */}

      {currencyEntries.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Payable Position by Currency
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Supplier liabilities are reported separately in their
              original currency.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {currencyEntries.map(
              ([currency, summary]) => (
                <div
                  key={currency}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#001F3F]">
                      {currency}
                    </h3>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {currency}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-blue-50 p-3">
                      <p className="text-xs font-medium text-blue-700">
                        Liability
                      </p>

                      <p className="mt-1 font-bold text-blue-900">
                        {money(
                          summary.liability,
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

                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-xs font-medium text-amber-700">
                        Outstanding
                      </p>

                      <p className="mt-1 font-bold text-amber-900">
                        {money(
                          summary.outstanding,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-700">
                        Overdue
                      </p>

                      <p className="mt-1 font-bold text-red-900">
                        {money(
                          summary.overdue,
                          currency,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-5">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-slate-500">
                        Current
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {money(
                          summary.current,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-slate-500">
                        1–30
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {money(
                          summary.days1to30,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-slate-500">
                        31–60
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {money(
                          summary.days31to60,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-slate-500">
                        61–90
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {money(
                          summary.days61to90,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-slate-500">
                        90+
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {money(
                          summary.days90plus,
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

      {/* OPEN PAYABLES */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Open Supplier Payables
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Approved supplier liabilities that still require
              payment.
            </p>
          </div>

          <p className="text-sm font-medium text-slate-500">
            {openPayables.length} open payable
            {openPayables.length === 1
              ? ""
              : "s"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Supplier
                </th>

                <th className="px-3 py-3 font-medium">
                  Booking / Tour
                </th>

                <th className="px-3 py-3 font-medium">
                  Invoice
                </th>

                <th className="px-3 py-3 font-medium">
                  Due Date
                </th>

                <th className="px-3 py-3 font-medium">
                  Aging
                </th>

                <th className="px-3 py-3 font-medium">
                  Status
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Approved
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Credits
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Liability
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Paid
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Outstanding
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {openPayables.map((row) => {
                const supplierName =
                  row.supplierNameSnapshot ||
                  row.supplier?.name ||
                  "—";

                const bookingReference =
                  row.booking?.bookingDisplayCode ||
                  row.booking?.bookingReference ||
                  "—";

                const tourTitle =
                  row.tour?.title || "—";

                return (
                  <tr
                    key={row.id}
                    className="border-t align-top"
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#001F3F]">
                        {supplierName}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {row.serviceNameSnapshot ||
                          row.service?.name ||
                          row.title}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {bookingReference}
                      </div>

                      <div className="mt-1 max-w-64 text-xs text-slate-500">
                        {tourTitle}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {row.supplierInvoiceNumber ||
                          "—"}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {row.supplierReference ||
                          "—"}
                      </div>
                    </td>

                    <td
                      className={`whitespace-nowrap px-3 py-3 ${
                        row.daysOverdue > 0
                          ? "font-semibold text-red-700"
                          : ""
                      }`}
                    >
                      {formatDate(
                        row.dueDate,
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.daysOverdue > 90
                            ? "bg-red-100 text-red-700"
                            : row.daysOverdue > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {agingLabel(
                          row.agingBucket,
                        )}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {enumLabel(
                          row.paymentStatus,
                        )}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {money(
                        row.approvedAmountNumber,
                        row.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {money(
                        row.creditAmountNumber,
                        row.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-[#001F3F]">
                      {money(
                        row.effectiveLiability,
                        row.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-green-700">
                      {money(
                        row.amountPaidNumber,
                        row.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-amber-700">
                      {money(
                        row.outstanding,
                        row.currency,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <Link
                        href="/admin/supplier-payables"
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Open Payables
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {openPayables.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    No open supplier payables match the selected
                    filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ALL PAYABLE RECORDS */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Payable Register
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            All supplier payable records matching the selected
            filters, including approval and payment status.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Supplier / Payable
                </th>

                <th className="px-3 py-3 font-medium">
                  Booking / Tour
                </th>

                <th className="px-3 py-3 font-medium">
                  Invoice Date
                </th>

                <th className="px-3 py-3 font-medium">
                  Due Date
                </th>

                <th className="px-3 py-3 font-medium">
                  Approval
                </th>

                <th className="px-3 py-3 font-medium">
                  Payment
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Liability
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Paid
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Balance
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t align-top"
                >
                  <td className="px-3 py-3">
                    <div className="font-semibold text-[#001F3F]">
                      {row.supplierNameSnapshot ||
                        row.supplier?.name ||
                        "—"}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {row.title}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="font-medium">
                      {row.booking?.bookingDisplayCode ||
                        row.booking?.bookingReference ||
                        "—"}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {row.tour?.title || "—"}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDate(
                      row.invoiceDate,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3">
                    {formatDate(
                      row.dueDate,
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {enumLabel(
                        row.approvalStatus,
                      )}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {enumLabel(
                        row.paymentStatus,
                      )}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {money(
                      row.effectiveLiability,
                      row.currency,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-green-700">
                    {money(
                      row.amountPaidNumber,
                      row.currency,
                    )}
                  </td>

                  <td
                    className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${
                      row.outstanding > 0
                        ? "text-amber-700"
                        : "text-green-700"
                    }`}
                  >
                    {money(
                      row.outstanding,
                      row.currency,
                    )}
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    No supplier payable records match the selected
                    filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* PAYMENT HISTORY */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Supplier Payment History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Payment records linked to the supplier liabilities in this
            report.
          </p>
        </div>

        <div className="space-y-4">
          {rows.map((row) => {
            if (
              row.payments.length === 0
            ) {
              return null;
            }

            return (
              <div
                key={row.id}
                className="rounded-xl border"
              >
                <div className="flex flex-col gap-1 border-b bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#001F3F]">
                      {row.supplierNameSnapshot ||
                        row.supplier?.name ||
                        "Supplier"}
                    </p>

                    <p className="text-xs text-slate-500">
                      {row.title}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-amber-700">
                    Outstanding:{" "}
                    {money(
                      row.outstanding,
                      row.currency,
                    )}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-sm">
                    <thead className="text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          Date
                        </th>

                        <th className="px-4 py-3 font-medium">
                          Bank Account
                        </th>

                        <th className="px-4 py-3 font-medium">
                          Method
                        </th>

                        <th className="px-4 py-3 font-medium">
                          Reference
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {row.payments.map(
                        (payment) => (
                          <tr
                            key={payment.id}
                            className="border-t"
                          >
                            <td className="whitespace-nowrap px-4 py-3">
                              {formatDate(
                                payment.paymentDate,
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {payment.bankAccount?.name ||
                                "—"}
                            </td>

                            <td className="px-4 py-3">
                              {enumLabel(
                                payment.method,
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {payment.reference ||
                                "—"}
                            </td>

                            <td className="px-4 py-3 text-right font-semibold text-green-700">
                              {money(
                                Number(
                                  payment.amount,
                                ),
                                payment.currency ||
                                  row.currency,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {rows.every(
            (row) =>
              row.payments.length === 0,
          ) ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No supplier payment history is available for the
              selected records.
            </div>
          ) : null}
        </div>
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Supplier liabilities are shown in their original currency.
        Credits reduce the approved liability before outstanding
        balances are calculated. Different currencies are never
        combined.
      </p>
    </div>
  );
}