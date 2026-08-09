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

type SearchParams = Promise<{
  from?: string;
  to?: string;
  status?: string;
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
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value: string | undefined) {
  if (!value) return null;

  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
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

function enumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDaysOverdue(dueDate: Date | null, now: Date) {
  if (!dueDate) return 0;

  const due = new Date(dueDate);
  due.setUTCHours(23, 59, 59, 999);

  if (due >= now) return 0;

  return Math.floor(
    (now.getTime() - due.getTime()) / 86_400_000,
  );
}

function getAgingBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return "CURRENT";
  if (daysOverdue <= 30) return "1_30";
  if (daysOverdue <= 60) return "31_60";
  if (daysOverdue <= 90) return "61_90";
  return "90_PLUS";
}

function validBookingStatus(value: string | undefined) {
  if (!value) return undefined;

  return Object.values(BookingStatus).includes(
    value as BookingStatus,
  )
    ? (value as BookingStatus)
    : undefined;
}

function validPaymentStatus(value: string | undefined) {
  if (!value) return undefined;

  return Object.values(PaymentStatus).includes(
    value as PaymentStatus,
  )
    ? (value as PaymentStatus)
    : undefined;
}

function validAging(value: string | undefined): AgingBucket {
  const allowed: AgingBucket[] = [
    "ALL",
    "CURRENT",
    "1_30",
    "31_60",
    "61_90",
    "90_PLUS",
  ];

  return allowed.includes(value as AgingBucket)
    ? (value as AgingBucket)
    : "ALL";
}

export default async function AccountsReceivablePage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = await searchParams;

  const from = parseDateStart(params.from);
  const to = parseDateEnd(params.to);
  const status = validBookingStatus(params.status);
  const paymentStatus = validPaymentStatus(params.paymentStatus);
  const aging = validAging(params.aging);
  const q = params.q?.trim() || "";

  const where: Prisma.BookingWhereInput = {
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),

    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),

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

  const bookings = await db.booking.findMany({
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
          status: PaymentRecordStatus.RECEIVED,
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

  const rows = bookings
    .map((booking) => {
      const receivedTotal = booking.payments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );

      const amountPaid =
        booking.amountPaid > 0
          ? booking.amountPaid
          : receivedTotal;

      const outstanding = Math.max(
        booking.totalPrice - amountPaid,
        0,
      );

      const openSchedules = booking.paymentSchedules.filter(
        (schedule) =>
          schedule.status !== BookingInstallmentStatus.PAID &&
          schedule.status !== BookingInstallmentStatus.CANCELLED &&
          Math.max(schedule.amount - schedule.amountPaid, 0) > 0,
      );

      const nextSchedule = openSchedules[0] ?? null;

      const dueDate =
        nextSchedule?.dueDate ??
        booking.paymentDueDate ??
        booking.depositDeadline ??
        null;

      const daysOverdue =
        outstanding > 0 ? getDaysOverdue(dueDate, now) : 0;

      const agingBucket = getAgingBucket(daysOverdue);

      const overdueAmount = openSchedules
        .filter((schedule) => schedule.dueDate < now)
        .reduce(
          (sum, schedule) =>
            sum + Math.max(schedule.amount - schedule.amountPaid, 0),
          0,
        );

      const allocatedAmount = booking.paymentSchedules.reduce(
        (sum, schedule) =>
          sum +
          schedule.allocations.reduce(
            (allocationSum, allocation) =>
              allocationSum + allocation.amount,
            0,
          ),
        0,
      );

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
      if (aging === "ALL") return true;
      return row.agingBucket === aging;
    });

  const receivableRows = rows.filter(
    (row) =>
      row.status !== BookingStatus.CANCELLED &&
      row.outstanding > 0.005,
  );

  const groupedByCurrency = new Map<
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
    const summary = groupedByCurrency.get(row.currency) ?? {
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

    if (row.status !== BookingStatus.CANCELLED) {
      summary.gross += row.totalPrice;
      summary.collected += row.amountPaid;
      summary.outstanding += row.outstanding;
      summary.overdue += row.overdueAmount;

      if (row.outstanding > 0) {
        switch (row.agingBucket) {
          case "CURRENT":
            summary.current += row.outstanding;
            break;
          case "1_30":
            summary.days1to30 += row.outstanding;
            break;
          case "31_60":
            summary.days31to60 += row.outstanding;
            break;
          case "61_90":
            summary.days61to90 += row.outstanding;
            break;
          case "90_PLUS":
            summary.days90plus += row.outstanding;
            break;
        }
      }
    }

    groupedByCurrency.set(row.currency, summary);
  }

  const exportParams = new URLSearchParams();

  if (params.from) exportParams.set("from", params.from);
  if (params.to) exportParams.set("to", params.to);
  if (status) exportParams.set("status", status);
  if (paymentStatus) {
    exportParams.set("paymentStatus", paymentStatus);
  }
  if (aging !== "ALL") exportParams.set("aging", aging);
  if (q) exportParams.set("q", q);

  const exportHref =
    `/api/admin/finance/reports/accounts-receivable?${exportParams.toString()}`;

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Accounts Receivable
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Booking receivables, customer collections, payment schedules,
            outstanding balances, overdue amounts, and aging by due date.
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label="Booking From">
            <input
              name="from"
              type="date"
              defaultValue={params.from || ""}
              className={inputClass}
            />
          </FilterField>

          <FilterField label="Booking To">
            <input
              name="to"
              type="date"
              defaultValue={params.to || ""}
              className={inputClass}
            />
          </FilterField>

          <FilterField label="Booking Status">
            <select
              name="status"
              defaultValue={status || ""}
              className={inputClass}
            >
              <option value="">All statuses</option>

              {Object.values(BookingStatus).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Payment Status">
            <select
              name="paymentStatus"
              defaultValue={paymentStatus || ""}
              className={inputClass}
            >
              <option value="">All statuses</option>

              {Object.values(PaymentStatus).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Aging">
            <select
              name="aging"
              defaultValue={aging}
              className={inputClass}
            >
              <option value="ALL">All aging</option>
              <option value="CURRENT">Current</option>
              <option value="1_30">1–30 days</option>
              <option value="31_60">31–60 days</option>
              <option value="61_90">61–90 days</option>
              <option value="90_PLUS">90+ days</option>
            </select>
          </FilterField>

          <FilterField label="Search">
            <input
              name="q"
              defaultValue={q}
              placeholder="Booking, client, agency..."
              className={inputClass}
            />
          </FilterField>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Link
            href="/admin/finance/reports/accounts-receivable"
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
      </form>

      {[...groupedByCurrency.entries()].map(
        ([currency, summary]) => (
          <section key={currency} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#001F3F]">
                {currency} Receivables
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Booking Value"
                value={money(summary.gross, currency)}
                subtitle="Non-cancelled bookings"
              />

              <SummaryCard
                title="Collected"
                value={money(summary.collected, currency)}
                subtitle="Received customer payments"
                positive
              />

              <SummaryCard
                title="Outstanding"
                value={money(summary.outstanding, currency)}
                subtitle="Remaining booking balances"
                attention={summary.outstanding > 0}
              />

              <SummaryCard
                title="Overdue"
                value={money(summary.overdue, currency)}
                subtitle="Past-due scheduled amounts"
                danger={summary.overdue > 0}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AgingCard
                label="Current"
                value={money(summary.current, currency)}
              />
              <AgingCard
                label="1–30 Days"
                value={money(summary.days1to30, currency)}
              />
              <AgingCard
                label="31–60 Days"
                value={money(summary.days31to60, currency)}
              />
              <AgingCard
                label="61–90 Days"
                value={money(summary.days61to90, currency)}
              />
              <AgingCard
                label="90+ Days"
                value={money(summary.days90plus, currency)}
              />
            </div>
          </section>
        ),
      )}

      {groupedByCurrency.size === 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No bookings match the selected filters.
        </section>
      )}

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs leading-5 text-blue-800">
          <strong>Receivable basis:</strong> booking total less received
          payments. Aging uses the next unpaid payment schedule when available;
          otherwise it falls back to the booking payment due date and then the
          deposit deadline. Cancelled bookings are excluded from receivable
          totals.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Receivable Detail
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {receivableRows.length} open receivable
            {receivableRows.length === 1 ? "" : "s"} in the filtered result.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No bookings match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1900px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Payer / Client</th>
                  <th className="px-4 py-3">Tour</th>
                  <th className="px-4 py-3">Departure</th>
                  <th className="px-4 py-3">Booking Status</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3 text-right">Booking Value</th>
                  <th className="px-4 py-3 text-right">Collected</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3">Next Due</th>
                  <th className="px-4 py-3">Aging</th>
                  <th className="px-4 py-3 text-right">Overdue</th>
                  <th className="px-4 py-3 text-right">Allocated</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#001F3F]">
                        {row.bookingDisplayCode || row.bookingReference}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {enumLabel(row.bookingType)}
                      </p>
                    </td>

                    <td className="max-w-[250px] px-4 py-4">
                      <p className="font-medium text-slate-800">
                        {row.payer}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {row.customerEmail ||
                          row.agentEmailSnapshot ||
                          row.user.email}
                      </p>
                    </td>

                    <td className="max-w-[280px] px-4 py-4 text-slate-700">
                      {row.tourTitleSnapshot}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      {formatDate(row.departureDateSnapshot)}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {enumLabel(row.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.paymentStatus === PaymentStatus.PAID
                            ? "bg-emerald-100 text-emerald-800"
                            : row.paymentStatus ===
                                PaymentStatus.PARTIALLY_PAID
                              ? "bg-blue-100 text-blue-800"
                              : row.paymentStatus ===
                                  PaymentStatus.REFUNDED
                                ? "bg-purple-100 text-purple-800"
                                : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {enumLabel(row.paymentStatus)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      {money(row.totalPrice, row.currency)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-emerald-700">
                      {money(row.amountPaid, row.currency)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right font-bold text-[#001F3F]">
                      {money(row.outstanding, row.currency)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      {formatDate(row.dueDate)}
                    </td>

                    <td className="px-4 py-4">
                      <AgingBadge
                        bucket={row.agingBucket}
                        daysOverdue={row.daysOverdue}
                      />
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-red-700">
                      {row.overdueAmount > 0
                        ? money(row.overdueAmount, row.currency)
                        : "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-right text-slate-600">
                      {money(row.allocatedAmount, row.currency)}
                    </td>

                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/bookings/${row.id}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Open Booking
                      </Link>
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
  attention = false,
  danger = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
  attention?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        danger
          ? "border-red-200 bg-red-50"
          : attention
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          danger
            ? "text-red-800"
            : attention
              ? "text-amber-800"
              : positive
                ? "text-emerald-700"
                : "text-[#001F3F]"
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

function AgingCard({
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

function AgingBadge({
  bucket,
  daysOverdue,
}: {
  bucket: AgingBucket;
  daysOverdue: number;
}) {
  if (bucket === "CURRENT") {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
        Current
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        bucket === "90_PLUS"
          ? "bg-red-100 text-red-800"
          : bucket === "61_90"
            ? "bg-orange-100 text-orange-800"
            : "bg-amber-100 text-amber-800"
      }`}
    >
      {daysOverdue} days
    </span>
  );
}

const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
