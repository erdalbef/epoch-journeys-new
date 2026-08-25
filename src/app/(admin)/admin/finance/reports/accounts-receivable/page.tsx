import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BookingInstallmentStatus,
  BookingStatus,
  PaymentRecordStatus,
  PaymentStatus,
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type AgingBucket =
  | "ALL"
  | "CURRENT"
  | "1_30"
  | "31_60"
  | "61_90"
  | "90_PLUS";

type PageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    status?: string;
    paymentStatus?: string;
    aging?: string;
    q?: string;
  }>;
};

type PayerSummary = {
  key: string;
  payer: string;
  currency: string;
  bookings: number;
  sales: number;
  received: number;
  outstanding: number;
  overdue: number;
};

function parseDateStart(
  value: string | undefined,
) {
  if (!value) {
    return undefined;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

function parseDateEnd(
  value: string | undefined,
) {
  if (!value) {
    return undefined;
  }

  const date = new Date(
    `${value}T23:59:59.999Z`,
  );

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

function formatDate(
  value: Date | null | undefined,
) {
  if (!value) {
    return "—";
  }

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
  if (!dueDate) {
    return 0;
  }

  const due = new Date(dueDate);

  due.setUTCHours(
    23,
    59,
    59,
    999,
  );

  if (due >= now) {
    return 0;
  }

  return Math.floor(
    (now.getTime() - due.getTime()) /
      86_400_000,
  );
}

function getAgingBucket(
  daysOverdue: number,
): AgingBucket {
  if (daysOverdue <= 0) {
    return "CURRENT";
  }

  if (daysOverdue <= 30) {
    return "1_30";
  }

  if (daysOverdue <= 60) {
    return "31_60";
  }

  if (daysOverdue <= 90) {
    return "61_90";
  }

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

function validBookingStatus(
  value: string | undefined,
) {
  if (!value) {
    return undefined;
  }

  return Object.values(
    BookingStatus,
  ).includes(
    value as BookingStatus,
  )
    ? (value as BookingStatus)
    : undefined;
}

function validPaymentStatus(
  value: string | undefined,
) {
  if (!value) {
    return undefined;
  }

  return Object.values(
    PaymentStatus,
  ).includes(
    value as PaymentStatus,
  )
    ? (value as PaymentStatus)
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

export default async function AccountsReceivablePage({
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

  const from = parseDateStart(
    params.from,
  );

  const to = parseDateEnd(
    params.to,
  );

  const status =
    validBookingStatus(
      params.status,
    );

  const paymentStatus =
    validPaymentStatus(
      params.paymentStatus,
    );

  const aging = validAging(
    params.aging,
  );

  const q =
    params.q?.trim() || "";

  // ==========================================================
  // BOOKING FILTERS
  // ==========================================================

  const where: Prisma.BookingWhereInput =
    {
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

      ...(status
        ? {
            status,
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
                bookingReference: {
                  contains: q,
                  mode: "insensitive",
                },
              },

              {
                bookingDisplayCode: {
                  contains: q,
                  mode: "insensitive",
                },
              },

              {
                customerName: {
                  contains: q,
                  mode: "insensitive",
                },
              },

              {
                customerEmail: {
                  contains: q,
                  mode: "insensitive",
                },
              },

              {
                agencyNameSnapshot: {
                  contains: q,
                  mode: "insensitive",
                },
              },

              {
                agentNameSnapshot: {
                  contains: q,
                  mode: "insensitive",
                },
              },

              {
                tourTitleSnapshot: {
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
            ],
          }
        : {}),
    };

  // ==========================================================
  // DATA
  // ==========================================================

  const bookings =
    await db.booking.findMany({
      where,

      orderBy: [
        {
          paymentDueDate: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      take: 2000,

      select: {
        id: true,

        bookingReference: true,
        bookingDisplayCode: true,
        bookingType: true,

        status: true,
        paymentStatus: true,

        currency: true,

        totalPrice: true,
        grossAmount: true,
        netAmount: true,

        amountPaid: true,
        amountDue: true,

        paymentDueDate: true,
        depositDeadline: true,

        createdAt: true,

        customerName: true,
        customerEmail: true,

        agentNameSnapshot: true,
        agentEmailSnapshot: true,

        agencyNameSnapshot: true,

        groupName: true,
        groupLeaderName: true,

        tourTitleSnapshot: true,
        departureDateSnapshot: true,

        partnerCompany: {
          select: {
            name: true,
          },
        },

        user: {
          select: {
            fullName: true,
            email: true,
            travelAgency: true,
          },
        },

        payments: {
          where: {
            status:
              PaymentRecordStatus.RECEIVED,
          },

          select: {
            amount: true,
            currency: true,
            paidAt: true,
          },
        },

        paymentSchedules: {
          orderBy: {
            dueDate: "asc",
          },

          select: {
            id: true,

            type: true,
            title: true,

            dueDate: true,

            amount: true,
            amountPaid: true,

            status: true,
            paidAt: true,

            allocations: {
              select: {
                amount: true,
                allocatedAt: true,
              },
            },
          },
        },
      },
    });

  const now = new Date();

  // ==========================================================
  // BUILD RECEIVABLE ROWS
  // ==========================================================

  const rows = bookings
    .map((booking) => {
      const receivedTotal =
        booking.payments.reduce(
          (sum, payment) =>
            sum + payment.amount,
          0,
        );

      const amountPaid =
        booking.amountPaid > 0
          ? booking.amountPaid
          : receivedTotal;

      const outstanding =
        Math.max(
          booking.totalPrice -
            amountPaid,
          0,
        );

      const openSchedules =
        booking.paymentSchedules.filter(
          (schedule) =>
            schedule.status !==
              BookingInstallmentStatus.PAID &&
            schedule.status !==
              BookingInstallmentStatus.CANCELLED &&
            Math.max(
              schedule.amount -
                schedule.amountPaid,
              0,
            ) > 0,
        );

      const nextSchedule =
        openSchedules[0] ?? null;

      const dueDate =
        nextSchedule?.dueDate ??
        booking.paymentDueDate ??
        booking.depositDeadline ??
        null;

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
        openSchedules
          .filter(
            (schedule) =>
              schedule.dueDate < now,
          )
          .reduce(
            (sum, schedule) =>
              sum +
              Math.max(
                schedule.amount -
                  schedule.amountPaid,
                0,
              ),
            0,
          );

      const allocatedAmount =
        booking.paymentSchedules.reduce(
          (sum, schedule) =>
            sum +
            schedule.allocations.reduce(
              (
                allocationSum,
                allocation,
              ) =>
                allocationSum +
                allocation.amount,
              0,
            ),
          0,
        );

      /*
       * Payer priority:
       *
       * 1. Agency snapshot
       * 2. Partner company
       * 3. User travel agency
       * 4. Customer
       * 5. Group
       * 6. Agent
       * 7. User
       */

      const payer =
        booking.agencyNameSnapshot ||
        booking.partnerCompany?.name ||
        booking.user.travelAgency ||
        booking.customerName ||
        booking.groupName ||
        booking.agentNameSnapshot ||
        booking.user.fullName ||
        booking.user.email;

      return {
        ...booking,

        amountPaid,
        outstanding,
        dueDate,
        daysOverdue,
        agingBucket,
        overdueAmount,
        allocatedAmount,
        payer,
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

  const receivableRows =
    rows.filter(
      (row) =>
        row.status !==
          BookingStatus.CANCELLED &&
        row.outstanding > 0.005,
    );

  // ==========================================================
  // CURRENCY SUMMARY
  // ==========================================================

  const groupedByCurrency =
    new Map<
      string,
      {
        gross: number;
        collected: number;
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
        gross: 0,
        collected: 0,
        outstanding: 0,
        overdue: 0,

        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
      };

    if (
      row.status !==
      BookingStatus.CANCELLED
    ) {
      summary.gross +=
        row.totalPrice;

      summary.collected +=
        row.amountPaid;

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
  // CUSTOMER / AGENT CONSOLIDATED SUMMARY
  // ==========================================================

  const payerSummaryMap =
    new Map<
      string,
      PayerSummary
    >();

  for (const row of rows) {
    if (
      row.status ===
      BookingStatus.CANCELLED
    ) {
      continue;
    }

    const payerName =
      row.payer?.trim() ||
      "Unspecified Customer / Agent";

    const currency =
      row.currency || "EUR";

    const key =
      `${payerName}::${currency}`;

    const existing =
      payerSummaryMap.get(key) ?? {
        key,
        payer: payerName,
        currency,

        bookings: 0,
        sales: 0,
        received: 0,
        outstanding: 0,
        overdue: 0,
      };

    existing.bookings += 1;
    existing.sales +=
      row.totalPrice;
    existing.received +=
      row.amountPaid;
    existing.outstanding +=
      row.outstanding;
    existing.overdue +=
      row.overdueAmount;

    payerSummaryMap.set(
      key,
      existing,
    );
  }

  const payerSummaries =
    Array.from(
      payerSummaryMap.values(),
    ).sort((a, b) => {
      if (
        a.outstanding !==
        b.outstanding
      ) {
        return (
          b.outstanding -
          a.outstanding
        );
      }

      return a.payer.localeCompare(
        b.payer,
      );
    });

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

  if (status) {
    exportParams.set(
      "status",
      status,
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
    `/api/admin/finance/reports/accounts-receivable?${exportParams.toString()}`;

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

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Accounts Receivable
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Booking receivables, customer collections, payment
            schedules, outstanding balances, overdue amounts and
            aging by due date.
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
            href="/admin/payments"
            className={primaryButton}
          >
            Customer Payments
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
              placeholder="Booking, agency, customer, group or tour"
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
              htmlFor="status"
              className="text-sm font-semibold text-slate-700"
            >
              Booking Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue={
                status || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                BookingStatus,
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
                PaymentStatus,
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
              href="/admin/finance/reports/accounts-receivable"
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
              Receivable Position by Currency
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Different currencies are reported separately and are
              never combined.
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
                        Sales
                      </p>

                      <p className="mt-1 font-bold text-blue-900">
                        {money(
                          summary.gross,
                          currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-50 p-3">
                      <p className="text-xs font-medium text-green-700">
                        Collected
                      </p>

                      <p className="mt-1 font-bold text-green-900">
                        {money(
                          summary.collected,
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

      {/* CONSOLIDATED PAYER SUMMARY */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Customer / Agent Balances
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Consolidated balance by payer and currency.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Customer / Agent
                </th>

                <th className="px-3 py-3 font-medium">
                  Currency
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Bookings
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Sales
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Received
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Outstanding
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Overdue
                </th>
              </tr>
            </thead>

            <tbody>
              {payerSummaries.map(
                (payer) => (
                  <tr
                    key={payer.key}
                    className="border-t"
                  >
                    <td className="px-3 py-3 font-semibold text-[#001F3F]">
                      {payer.payer}
                    </td>

                    <td className="px-3 py-3">
                      {payer.currency}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {payer.bookings}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {money(
                        payer.sales,
                        payer.currency,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-green-700">
                      {money(
                        payer.received,
                        payer.currency,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-amber-700">
                      {money(
                        payer.outstanding,
                        payer.currency,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-red-700">
                      {money(
                        payer.overdue,
                        payer.currency,
                      )}
                    </td>
                  </tr>
                ),
              )}

              {payerSummaries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No customer or agent balances found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* OPEN RECEIVABLES */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Open Receivables
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Individual booking balances requiring collection.
            </p>
          </div>

          <p className="text-sm font-medium text-slate-500">
            {receivableRows.length} open booking
            {receivableRows.length === 1
              ? ""
              : "s"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Booking
                </th>

                <th className="px-3 py-3 font-medium">
                  Payer
                </th>

                <th className="px-3 py-3 font-medium">
                  Tour / Group
                </th>

                <th className="px-3 py-3 font-medium">
                  Due Date
                </th>

                <th className="px-3 py-3 font-medium">
                  Aging
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Total
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Received
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Outstanding
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Overdue
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {receivableRows.map(
                (row) => {
                  const reference =
                    row.bookingDisplayCode ||
                    row.bookingReference;

                  const group =
                    row.groupName ||
                    row.groupLeaderName ||
                    "—";

                  return (
                    <tr
                      key={row.id}
                      className="border-t align-top"
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold text-[#001F3F]">
                          {reference}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {enumLabel(
                            row.status,
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {row.payer}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {row.customerEmail ||
                            row.agentEmailSnapshot ||
                            "—"}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="max-w-64 font-medium">
                          {row.tourTitleSnapshot ||
                            "—"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {group}
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

                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        {money(
                          row.totalPrice,
                          row.currency,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-green-700">
                        {money(
                          row.amountPaid,
                          row.currency,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-amber-700">
                        {money(
                          row.outstanding,
                          row.currency,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-red-700">
                        {money(
                          row.overdueAmount,
                          row.currency,
                        )}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/admin/bookings/${row.id}`}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          Open Booking
                        </Link>
                      </td>
                    </tr>
                  );
                },
              )}

              {receivableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    No open receivables match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* PAYMENT SCHEDULE DETAIL */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Payment Schedule Detail
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Open booking installments and the amount already allocated
            against each schedule.
          </p>
        </div>

        <div className="space-y-4">
          {receivableRows.map(
            (row) => {
              const schedules =
                row.paymentSchedules.filter(
                  (schedule) =>
                    schedule.status !==
                    BookingInstallmentStatus.CANCELLED,
                );

              if (
                schedules.length === 0
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
                        {row.bookingDisplayCode ||
                          row.bookingReference}
                      </p>

                      <p className="text-xs text-slate-500">
                        {row.payer}
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
                            Installment
                          </th>

                          <th className="px-4 py-3 font-medium">
                            Due
                          </th>

                          <th className="px-4 py-3 font-medium">
                            Status
                          </th>

                          <th className="px-4 py-3 text-right font-medium">
                            Amount
                          </th>

                          <th className="px-4 py-3 text-right font-medium">
                            Paid
                          </th>

                          <th className="px-4 py-3 text-right font-medium">
                            Remaining
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {schedules.map(
                          (schedule) => {
                            const remaining =
                              Math.max(
                                schedule.amount -
                                  schedule.amountPaid,
                                0,
                              );

                            return (
                              <tr
                                key={
                                  schedule.id
                                }
                                className="border-t"
                              >
                                <td className="px-4 py-3">
                                  <div className="font-medium">
                                    {schedule.title}
                                  </div>

                                  <div className="mt-1 text-xs text-slate-500">
                                    {enumLabel(
                                      schedule.type,
                                    )}
                                  </div>
                                </td>

                                <td className="whitespace-nowrap px-4 py-3">
                                  {formatDate(
                                    schedule.dueDate,
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                    {enumLabel(
                                      schedule.status,
                                    )}
                                  </span>
                                </td>

                                <td className="px-4 py-3 text-right">
                                  {money(
                                    schedule.amount,
                                    row.currency,
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right font-semibold text-green-700">
                                  {money(
                                    schedule.amountPaid,
                                    row.currency,
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right font-semibold text-amber-700">
                                  {money(
                                    remaining,
                                    row.currency,
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            },
          )}

          {receivableRows.every(
            (row) =>
              row.paymentSchedules.length ===
              0,
          ) ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No payment schedules are available for the current
              receivables.
            </div>
          ) : null}
        </div>
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Receivables are presented in their original booking currency.
        Currency balances are never combined. Booking payment schedules
        determine the next due date and aging wherever available; the
        booking-level due date is used as a fallback.
      </p>
    </div>
  );
}