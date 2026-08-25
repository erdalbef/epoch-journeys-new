import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BookingInstallmentStatus,
  BookingStatus,
  PaymentRecordStatus,
  Role,
  SupplierPayableApprovalStatus,
  SupplierPayablePaymentStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type ControlStatus =
  | "OVERDUE"
  | "DUE_SOON"
  | "UPCOMING"
  | "SETTLED";

type ReceivableRow = {
  id: string;
  payer: string;
  bookingReference: string;
  tour: string;
  currency: string;
  dueDate: Date | null;
  total: number;
  received: number;
  outstanding: number;
  overdueAmount: number;
  daysOverdue: number;
  status: ControlStatus;
};

type PayableRow = {
  id: string;
  supplier: string;
  reference: string;
  tour: string;
  currency: string;
  dueDate: Date | null;
  approved: number;
  credit: number;
  liability: number;
  paid: number;
  balance: number;
  daysOverdue: number;
  status: ControlStatus;
};

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
  value: Date | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function daysBetween(
  from: Date,
  to: Date,
) {
  return Math.floor(
    (to.getTime() - from.getTime()) /
      86_400_000,
  );
}

function controlStatus(
  dueDate: Date | null,
  outstanding: number,
  now: Date,
): {
  status: ControlStatus;
  daysOverdue: number;
} {
  if (outstanding <= 0.005) {
    return {
      status: "SETTLED",
      daysOverdue: 0,
    };
  }

  if (!dueDate) {
    return {
      status: "UPCOMING",
      daysOverdue: 0,
    };
  }

  const normalizedDue =
    new Date(dueDate);

  normalizedDue.setUTCHours(
    23,
    59,
    59,
    999,
  );

  if (normalizedDue < now) {
    return {
      status: "OVERDUE",

      daysOverdue: Math.max(
        1,
        daysBetween(
          normalizedDue,
          now,
        ),
      ),
    };
  }

  const daysUntilDue =
    daysBetween(
      now,
      normalizedDue,
    );

  if (daysUntilDue <= 7) {
    return {
      status: "DUE_SOON",
      daysOverdue: 0,
    };
  }

  return {
    status: "UPCOMING",
    daysOverdue: 0,
  };
}

function statusLabel(
  status: ControlStatus,
) {
  switch (status) {
    case "OVERDUE":
      return "Overdue";

    case "DUE_SOON":
      return "Due Soon";

    case "UPCOMING":
      return "Upcoming";

    case "SETTLED":
      return "Settled";
  }
}

function statusClass(
  status: ControlStatus,
) {
  switch (status) {
    case "OVERDUE":
      return "bg-red-100 text-red-700";

    case "DUE_SOON":
      return "bg-amber-100 text-amber-700";

    case "UPCOMING":
      return "bg-blue-100 text-blue-700";

    case "SETTLED":
      return "bg-green-100 text-green-700";
  }
}

export default async function DueOverdueControlPage() {
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

  const now = new Date();

  const [
    bookings,
    supplierPayables,
  ] = await Promise.all([
    // ========================================================
    // CUSTOMER / AGENT RECEIVABLES
    // ========================================================

    db.booking.findMany({
      where: {
        status: {
          not:
            BookingStatus.CANCELLED,
        },
      },

      orderBy: [
        {
          paymentDueDate: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      take: 3000,

      select: {
        id: true,

        bookingReference: true,
        bookingDisplayCode: true,

        currency: true,

        totalPrice: true,
        amountPaid: true,

        paymentDueDate: true,
        depositDeadline: true,

        agencyNameSnapshot: true,
        agentNameSnapshot: true,

        customerName: true,
        groupName: true,

        tourTitleSnapshot: true,

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
          },
        },

        paymentSchedules: {
          where: {
            status: {
              not:
                BookingInstallmentStatus.CANCELLED,
            },
          },

          orderBy: {
            dueDate: "asc",
          },

          select: {
            id: true,
            dueDate: true,
            amount: true,
            amountPaid: true,
            status: true,
          },
        },
      },
    }),

    // ========================================================
    // SUPPLIER PAYABLES
    // ========================================================

    db.supplierPayable.findMany({
      where: {
        approvalStatus:
          SupplierPayableApprovalStatus.APPROVED,

        paymentStatus: {
          not:
            SupplierPayablePaymentStatus.CANCELLED,
        },
      },

      orderBy: [
        {
          dueDate: "asc",
        },
        {
          createdAt: "desc",
        },
      ],

      take: 3000,

      select: {
        id: true,

        title: true,

        supplierNameSnapshot: true,

        supplierInvoiceNumber: true,
        supplierReference: true,

        currency: true,

        approvedAmount: true,
        creditAmount: true,
        amountPaid: true,

        dueDate: true,

        payments: {
          select: {
            amount: true,
          },
        },

        booking: {
          select: {
            bookingReference: true,
            bookingDisplayCode: true,
            tourTitleSnapshot: true,
          },
        },

        tour: {
          select: {
            title: true,
            tourCode: true,
          },
        },
      },
    }),
  ]);

  // ========================================================
  // RECEIVABLE CONTROL
  // ========================================================

  const receivables: ReceivableRow[] =
    bookings
      .map((booking) => {
        const receivedFromPayments =
          booking.payments.reduce(
            (sum, payment) =>
              sum + payment.amount,
            0,
          );

        const received =
          booking.amountPaid > 0
            ? booking.amountPaid
            : receivedFromPayments;

        const outstanding =
          Math.max(
            booking.totalPrice -
              received,
            0,
          );

        const openSchedules =
          booking.paymentSchedules.filter(
            (schedule) =>
              schedule.status !==
                BookingInstallmentStatus.PAID &&
              Math.max(
                schedule.amount -
                  schedule.amountPaid,
                0,
              ) > 0.005,
          );

        const nextSchedule =
          openSchedules[0] ?? null;

        const dueDate =
          nextSchedule?.dueDate ??
          booking.paymentDueDate ??
          booking.depositDeadline ??
          null;

        const overdueAmount =
          openSchedules
            .filter(
              (schedule) =>
                schedule.dueDate <
                  now &&
                Math.max(
                  schedule.amount -
                    schedule.amountPaid,
                  0,
                ) > 0.005,
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

        const position =
          controlStatus(
            dueDate,
            outstanding,
            now,
          );

        const payer =
          booking.agencyNameSnapshot ||
          booking.partnerCompany?.name ||
          booking.user.travelAgency ||
          booking.customerName ||
          booking.groupName ||
          booking.agentNameSnapshot ||
          booking.user.fullName ||
          booking.user.email ||
          "Unspecified Customer / Agent";

        return {
          id: booking.id,

          payer,

          bookingReference:
            booking.bookingDisplayCode ||
            booking.bookingReference,

          tour:
            booking.tourTitleSnapshot ||
            "—",

          currency:
            booking.currency,

          dueDate,

          total:
            booking.totalPrice,

          received,

          outstanding,

          overdueAmount,

          daysOverdue:
            position.daysOverdue,

          status:
            position.status,
        };
      })
      .filter(
        (item) =>
          item.outstanding > 0.005,
      );

  // ========================================================
  // PAYABLE CONTROL
  // ========================================================

  const payables: PayableRow[] =
    supplierPayables
      .map((payable) => {
        const paymentsTotal =
          payable.payments.reduce(
            (sum, payment) =>
              sum +
              Number(payment.amount),
            0,
          );

        const approved =
          Number(
            payable.approvedAmount,
          );

        const credit =
          Number(
            payable.creditAmount,
          );

        const liability =
          Math.max(
            approved - credit,
            0,
          );

        const paid =
          Number(
            payable.amountPaid,
          ) > 0
            ? Number(
                payable.amountPaid,
              )
            : paymentsTotal;

        const balance =
          Math.max(
            liability - paid,
            0,
          );

        const position =
          controlStatus(
            payable.dueDate,
            balance,
            now,
          );

        const tour =
          payable.tour
            ? payable.tour.tourCode
              ? `${payable.tour.tourCode} — ${payable.tour.title}`
              : payable.tour.title
            : payable.booking
                ?.tourTitleSnapshot ||
              "—";

        return {
          id: payable.id,

          supplier:
            payable.supplierNameSnapshot ||
            "Unspecified Supplier",

          reference:
            payable.supplierInvoiceNumber ||
            payable.supplierReference ||
            payable.title,

          tour,

          currency:
            payable.currency,

          dueDate:
            payable.dueDate,

          approved,

          credit,

          liability,

          paid,

          balance,

          daysOverdue:
            position.daysOverdue,

          status:
            position.status,
        };
      })
      .filter(
        (item) =>
          item.balance > 0.005,
      );

  // ========================================================
  // SORT
  // OVERDUE -> DUE SOON -> UPCOMING
  // ========================================================

  const statusRank: Record<
    ControlStatus,
    number
  > = {
    OVERDUE: 0,
    DUE_SOON: 1,
    UPCOMING: 2,
    SETTLED: 3,
  };

  receivables.sort((a, b) => {
    const rank =
      statusRank[a.status] -
      statusRank[b.status];

    if (rank !== 0) {
      return rank;
    }

    if (
      a.status === "OVERDUE"
    ) {
      return (
        b.daysOverdue -
        a.daysOverdue
      );
    }

    return (
      (a.dueDate?.getTime() ??
        Number.MAX_SAFE_INTEGER) -
      (b.dueDate?.getTime() ??
        Number.MAX_SAFE_INTEGER)
    );
  });

  payables.sort((a, b) => {
    const rank =
      statusRank[a.status] -
      statusRank[b.status];

    if (rank !== 0) {
      return rank;
    }

    if (
      a.status === "OVERDUE"
    ) {
      return (
        b.daysOverdue -
        a.daysOverdue
      );
    }

    return (
      (a.dueDate?.getTime() ??
        Number.MAX_SAFE_INTEGER) -
      (b.dueDate?.getTime() ??
        Number.MAX_SAFE_INTEGER)
    );
  });

  // ========================================================
  // CURRENCIES
  // ========================================================

  const currencies =
    Array.from(
      new Set([
        ...receivables.map(
          (item) =>
            item.currency,
        ),

        ...payables.map(
          (item) =>
            item.currency,
        ),
      ]),
    ).sort();

  const secondaryButton =
    "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";

  const primaryButton =
    "rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002d5a]";

  return (
    <div className="mx-auto max-w-[1750px] space-y-7 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Control
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Due & Overdue Control
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Operational control of customer and agent receivables
            together with supplier payables. Overdue items appear
            first, followed by amounts due within seven days.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance/reports"
            className={secondaryButton}
          >
            ← Back to Reports
          </Link>

          <Link
            href="/admin/finance/reports/accounts-receivable"
            className={secondaryButton}
          >
            Accounts Receivable
          </Link>

          <Link
            href="/admin/finance/reports/accounts-payable"
            className={primaryButton}
          >
            Accounts Payable
          </Link>
        </div>
      </div>

      {/* CONTROL COUNTERS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-red-700">
            Overdue Receivables
          </p>

          <p className="mt-2 text-3xl font-bold text-red-800">
            {
              receivables.filter(
                (item) =>
                  item.status ===
                  "OVERDUE",
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl border bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-700">
            Receivables Due Within 7 Days
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-800">
            {
              receivables.filter(
                (item) =>
                  item.status ===
                  "DUE_SOON",
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl border bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-red-700">
            Overdue Supplier Payables
          </p>

          <p className="mt-2 text-3xl font-bold text-red-800">
            {
              payables.filter(
                (item) =>
                  item.status ===
                  "OVERDUE",
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl border bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-700">
            Payables Due Within 7 Days
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-800">
            {
              payables.filter(
                (item) =>
                  item.status ===
                  "DUE_SOON",
              ).length
            }
          </p>
        </div>
      </section>

      {/* CURRENCY CONTROL */}

      {currencies.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Financial Position by Currency
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Customer receivables and supplier obligations are kept
              separate by currency.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {currencies.map(
              (currency) => {
                const currencyReceivables =
                  receivables.filter(
                    (item) =>
                      item.currency ===
                      currency,
                  );

                const currencyPayables =
                  payables.filter(
                    (item) =>
                      item.currency ===
                      currency,
                  );

                const receivableOutstanding =
                  currencyReceivables.reduce(
                    (sum, item) =>
                      sum +
                      item.outstanding,
                    0,
                  );

                const receivableOverdue =
                  currencyReceivables.reduce(
                    (sum, item) =>
                      sum +
                      item.overdueAmount,
                    0,
                  );

                const payableOutstanding =
                  currencyPayables.reduce(
                    (sum, item) =>
                      sum +
                      item.balance,
                    0,
                  );

                const payableOverdue =
                  currencyPayables
                    .filter(
                      (item) =>
                        item.status ===
                        "OVERDUE",
                    )
                    .reduce(
                      (sum, item) =>
                        sum +
                        item.balance,
                      0,
                    );

                const netPosition =
                  receivableOutstanding -
                  payableOutstanding;

                return (
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

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-xl bg-green-50 p-3">
                        <p className="text-xs font-medium text-green-700">
                          Receivable
                        </p>

                        <p className="mt-1 font-bold text-green-900">
                          {money(
                            receivableOutstanding,
                            currency,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-red-50 p-3">
                        <p className="text-xs font-medium text-red-700">
                          Receivable Overdue
                        </p>

                        <p className="mt-1 font-bold text-red-900">
                          {money(
                            receivableOverdue,
                            currency,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-700">
                          Payable
                        </p>

                        <p className="mt-1 font-bold text-blue-900">
                          {money(
                            payableOutstanding,
                            currency,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-red-50 p-3">
                        <p className="text-xs font-medium text-red-700">
                          Payable Overdue
                        </p>

                        <p className="mt-1 font-bold text-red-900">
                          {money(
                            payableOverdue,
                            currency,
                          )}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl p-3 ${
                          netPosition >= 0
                            ? "bg-emerald-50"
                            : "bg-amber-50"
                        }`}
                      >
                        <p
                          className={`text-xs font-medium ${
                            netPosition >= 0
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          Net Open Position
                        </p>

                        <p
                          className={`mt-1 font-bold ${
                            netPosition >= 0
                              ? "text-emerald-900"
                              : "text-amber-900"
                          }`}
                        >
                          {money(
                            netPosition,
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
        </section>
      ) : null}

      {/* CUSTOMER RECEIVABLES */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Customer / Agent Receivables
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Outstanding booking balances requiring collection,
            ordered by urgency.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Status
                </th>

                <th className="px-3 py-3 font-medium">
                  Payer
                </th>

                <th className="px-3 py-3 font-medium">
                  Booking
                </th>

                <th className="px-3 py-3 font-medium">
                  Tour
                </th>

                <th className="px-3 py-3 font-medium">
                  Due Date
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
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {receivables.map(
                (item) => (
                  <tr
                    key={item.id}
                    className="border-t align-top"
                  >
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                          item.status,
                        )}`}
                      >
                        {statusLabel(
                          item.status,
                        )}

                        {item.status ===
                        "OVERDUE"
                          ? ` · ${item.daysOverdue}d`
                          : ""}
                      </span>
                    </td>

                    <td className="px-3 py-3 font-semibold text-[#001F3F]">
                      {item.payer}
                    </td>

                    <td className="px-3 py-3">
                      {item.bookingReference}
                    </td>

                    <td className="px-3 py-3">
                      {item.tour}
                    </td>

                    <td
                      className={`whitespace-nowrap px-3 py-3 ${
                        item.status ===
                        "OVERDUE"
                          ? "font-semibold text-red-700"
                          : ""
                      }`}
                    >
                      {formatDate(
                        item.dueDate,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {money(
                        item.total,
                        item.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-green-700">
                      {money(
                        item.received,
                        item.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-amber-700">
                      {money(
                        item.outstanding,
                        item.currency,
                      )}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/admin/bookings/${item.id}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Open Booking
                      </Link>
                    </td>
                  </tr>
                ),
              )}

              {receivables.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    No outstanding customer receivables.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* SUPPLIER PAYABLES */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Supplier Payables
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Approved supplier obligations requiring payment, ordered
            by urgency.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Status
                </th>

                <th className="px-3 py-3 font-medium">
                  Supplier
                </th>

                <th className="px-3 py-3 font-medium">
                  Reference
                </th>

                <th className="px-3 py-3 font-medium">
                  Tour
                </th>

                <th className="px-3 py-3 font-medium">
                  Due Date
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
              {payables.map(
                (item) => (
                  <tr
                    key={item.id}
                    className="border-t align-top"
                  >
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                          item.status,
                        )}`}
                      >
                        {statusLabel(
                          item.status,
                        )}

                        {item.status ===
                        "OVERDUE"
                          ? ` · ${item.daysOverdue}d`
                          : ""}
                      </span>
                    </td>

                    <td className="px-3 py-3 font-semibold text-[#001F3F]">
                      {item.supplier}
                    </td>

                    <td className="px-3 py-3">
                      {item.reference}
                    </td>

                    <td className="px-3 py-3">
                      {item.tour}
                    </td>

                    <td
                      className={`whitespace-nowrap px-3 py-3 ${
                        item.status ===
                        "OVERDUE"
                          ? "font-semibold text-red-700"
                          : ""
                      }`}
                    >
                      {formatDate(
                        item.dueDate,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {money(
                        item.liability,
                        item.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-green-700">
                      {money(
                        item.paid,
                        item.currency,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-amber-700">
                      {money(
                        item.balance,
                        item.currency,
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
                ),
              )}

              {payables.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    No outstanding supplier payables.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* LEGEND */}

      <section className="rounded-2xl border bg-slate-50 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
          Control Rules
        </h2>

        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-red-100 px-3 py-1.5 font-semibold text-red-700">
            Overdue
          </span>

          <span className="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-700">
            Due within 7 days
          </span>

          <span className="rounded-full bg-blue-100 px-3 py-1.5 font-semibold text-blue-700">
            Upcoming
          </span>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Customer and supplier balances are always displayed in
          their original currency. Different currencies are never
          combined. Supplier credits reduce the approved liability
          before the remaining payable is calculated.
        </p>
      </section>
    </div>
  );
}