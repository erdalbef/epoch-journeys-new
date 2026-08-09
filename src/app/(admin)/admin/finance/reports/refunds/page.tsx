import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  PaymentMethod,
  Prisma,
  RefundReason,
  RefundStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  status?: string;
  reason?: string;
  method?: string;
  bankAccountId?: string;
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

function validEnum<T extends Record<string, string>>(
  source: T,
  value: string | undefined,
): T[keyof T] | undefined {
  if (!value) return undefined;

  return Object.values(source).includes(value)
    ? (value as T[keyof T])
    : undefined;
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

export default async function RefundReportPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = await searchParams;

  const from = parseDateStart(params.from);
  const to = parseDateEnd(params.to);
  const status = validEnum(RefundStatus, params.status);
  const reason = validEnum(RefundReason, params.reason);
  const method = validEnum(PaymentMethod, params.method);
  const q = params.q?.trim() || "";

  const bankAccounts = await db.bankAccount.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      currency: true,
      isActive: true,
    },
  });

  const bankAccountId =
    params.bankAccountId &&
    bankAccounts.some((account) => account.id === params.bankAccountId)
      ? params.bankAccountId
      : undefined;

  const where: Prisma.RefundWhereInput = {
    ...(from || to
      ? {
          refundDate: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),

    ...(status ? { status } : {}),
    ...(reason ? { reason } : {}),
    ...(method ? { method } : {}),
    ...(bankAccountId ? { bankAccountId } : {}),

    ...(q
      ? {
          OR: [
            {
              reference: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              reasonDetails: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              notes: {
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
              booking: {
                customerName: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
            {
              booking: {
                leadFirstName: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
            {
              booking: {
                leadLastName: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
            {
              booking: {
                agencyNameSnapshot: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
            {
              booking: {
                tourTitleSnapshot: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };

  const refunds = await db.refund.findMany({
    where,
    orderBy: [{ refundDate: "desc" }, { createdAt: "desc" }],
    take: 2500,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      method: true,
      reason: true,
      reasonDetails: true,
      refundDate: true,
      reference: true,
      notes: true,
      createdAt: true,

      booking: {
        select: {
          id: true,
          bookingReference: true,
          bookingDisplayCode: true,
          customerName: true,
          leadFirstName: true,
          leadLastName: true,
          agencyNameSnapshot: true,
          agentNameSnapshot: true,
          tourTitleSnapshot: true,
          departureDateSnapshot: true,
          totalPrice: true,
          amountPaid: true,
          currency: true,
        },
      },

      payment: {
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          reference: true,
          paidAt: true,
        },
      },

      bankAccount: {
        select: {
          id: true,
          name: true,
          currency: true,
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

      documents: {
        select: {
          id: true,
        },
      },
    },
  });

  const summaryByCurrency = new Map<
    string,
    {
      total: number;
      pending: number;
      approved: number;
      paid: number;
      cancelled: number;
      count: number;
    }
  >();

  for (const refund of refunds) {
    const summary = summaryByCurrency.get(refund.currency) ?? {
      total: 0,
      pending: 0,
      approved: 0,
      paid: 0,
      cancelled: 0,
      count: 0,
    };

    const amount = Number(refund.amount);
    summary.count += 1;

    if (refund.status !== RefundStatus.CANCELLED) {
      summary.total += amount;
    }

    if (refund.status === RefundStatus.PENDING) {
      summary.pending += amount;
    }

    if (refund.status === RefundStatus.APPROVED) {
      summary.approved += amount;
    }

    if (refund.status === RefundStatus.PAID) {
      summary.paid += amount;
    }

    if (refund.status === RefundStatus.CANCELLED) {
      summary.cancelled += amount;
    }

    summaryByCurrency.set(refund.currency, summary);
  }

  const reasonBreakdown = new Map<
    string,
    Map<string, { amount: number; count: number }>
  >();

  for (const refund of refunds) {
    if (refund.status === RefundStatus.CANCELLED) continue;

    const currencyMap =
      reasonBreakdown.get(refund.reason) ??
      new Map<string, { amount: number; count: number }>();

    const current = currencyMap.get(refund.currency) ?? {
      amount: 0,
      count: 0,
    };

    current.amount += Number(refund.amount);
    current.count += 1;

    currencyMap.set(refund.currency, current);
    reasonBreakdown.set(refund.reason, currencyMap);
  }

  const exportParams = new URLSearchParams();

  if (params.from) exportParams.set("from", params.from);
  if (params.to) exportParams.set("to", params.to);
  if (status) exportParams.set("status", status);
  if (reason) exportParams.set("reason", reason);
  if (method) exportParams.set("method", method);
  if (bankAccountId) {
    exportParams.set("bankAccountId", bankAccountId);
  }
  if (q) exportParams.set("q", q);

  const exportHref =
    `/api/admin/finance/reports/refunds?${exportParams.toString()}`;

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Refund Report
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Customer refunds by booking, reason, status, payment method, bank
            account, original payment, and refund period.
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <FilterField label="Refund From">
            <input
              name="from"
              type="date"
              defaultValue={params.from || ""}
              className={inputClass}
            />
          </FilterField>

          <FilterField label="Refund To">
            <input
              name="to"
              type="date"
              defaultValue={params.to || ""}
              className={inputClass}
            />
          </FilterField>

          <FilterField label="Status">
            <select
              name="status"
              defaultValue={status || ""}
              className={inputClass}
            >
              <option value="">All statuses</option>

              {Object.values(RefundStatus).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Reason">
            <select
              name="reason"
              defaultValue={reason || ""}
              className={inputClass}
            >
              <option value="">All reasons</option>

              {Object.values(RefundReason).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Method">
            <select
              name="method"
              defaultValue={method || ""}
              className={inputClass}
            >
              <option value="">All methods</option>

              {Object.values(PaymentMethod).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Bank Account">
            <select
              name="bankAccountId"
              defaultValue={bankAccountId || ""}
              className={inputClass}
            >
              <option value="">All accounts</option>

              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                  {!account.isActive ? " · Inactive" : ""}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Search">
            <input
              name="q"
              defaultValue={q}
              placeholder="Booking, customer, agency..."
              className={inputClass}
            />
          </FilterField>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Link
            href="/admin/finance/reports/refunds"
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

      {[...summaryByCurrency.entries()].map(
        ([currency, summary]) => (
          <section key={currency} className="space-y-4">
            <h2 className="text-lg font-bold text-[#001F3F]">
              {currency} Refund Summary
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                title="Refund Exposure"
                value={money(summary.total, currency)}
                subtitle={`${summary.count} refund record${summary.count === 1 ? "" : "s"}`}
              />

              <SummaryCard
                title="Pending"
                value={money(summary.pending, currency)}
                subtitle="Awaiting approval"
                warning
              />

              <SummaryCard
                title="Approved"
                value={money(summary.approved, currency)}
                subtitle="Approved but not necessarily paid"
              />

              <SummaryCard
                title="Paid"
                value={money(summary.paid, currency)}
                subtitle="Completed customer refunds"
                positive
              />

              <SummaryCard
                title="Cancelled"
                value={money(summary.cancelled, currency)}
                subtitle="Excluded from refund exposure"
                muted
              />
            </div>
          </section>
        ),
      )}

      {summaryByCurrency.size === 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No refunds match the selected filters.
        </section>
      )}

      {reasonBreakdown.size > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Refund Reason Breakdown
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[...reasonBreakdown.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([refundReason, currencyMap]) => (
                <div
                  key={refundReason}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {enumLabel(refundReason)}
                  </p>

                  <div className="mt-3 space-y-2">
                    {[...currencyMap.entries()].map(
                      ([currency, values]) => (
                        <div
                          key={currency}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-slate-500">
                            {values.count} record
                            {values.count === 1 ? "" : "s"}
                          </span>

                          <span className="font-bold text-[#001F3F]">
                            {money(values.amount, currency)}
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
          <strong>Refund exposure:</strong> Pending, Approved, and Paid refunds
          are included. Cancelled refunds are shown separately and excluded
          from the exposure total. A Paid refund can also be checked against
          its linked bank transaction and bank account.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Refund Detail
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Showing {refunds.length} refund
            {refunds.length === 1 ? "" : "s"}. Maximum 2,500 records on screen.
          </p>
        </div>

        {refunds.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No refunds match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[2200px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Refund Date</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Customer / Agency</th>
                  <th className="px-4 py-3">Tour</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Refund</th>
                  <th className="px-4 py-3">Original Payment</th>
                  <th className="px-4 py-3">Bank Account</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Ledger</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3">Created By</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {refunds.map((refund) => {
                  const leadName = [
                    refund.booking.leadFirstName,
                    refund.booking.leadLastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const customer =
                    refund.booking.customerName ||
                    leadName ||
                    "-";

                  return (
                    <tr key={refund.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-4">
                        {formatDate(refund.refundDate)}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#001F3F]">
                          {refund.booking.bookingDisplayCode ||
                            refund.booking.bookingReference}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Paid:{" "}
                          {money(
                            refund.booking.amountPaid,
                            refund.booking.currency,
                          )}
                        </p>
                      </td>

                      <td className="max-w-[260px] px-4 py-4">
                        <p className="text-slate-700">{customer}</p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {refund.booking.agencyNameSnapshot ||
                            refund.booking.agentNameSnapshot ||
                            "-"}
                        </p>
                      </td>

                      <td className="max-w-[300px] px-4 py-4">
                        <p className="text-slate-700">
                          {refund.booking.tourTitleSnapshot}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDate(
                            refund.booking.departureDateSnapshot,
                          )}
                        </p>
                      </td>

                      <td className="max-w-[280px] px-4 py-4">
                        <p className="font-medium text-slate-700">
                          {enumLabel(refund.reason)}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {refund.reasonDetails || "-"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            refund.status === RefundStatus.PAID
                              ? "bg-emerald-100 text-emerald-800"
                              : refund.status === RefundStatus.APPROVED
                                ? "bg-blue-100 text-blue-800"
                                : refund.status === RefundStatus.CANCELLED
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {enumLabel(refund.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {refund.method
                          ? enumLabel(refund.method)
                          : "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-bold text-red-700">
                        {money(Number(refund.amount), refund.currency)}
                      </td>

                      <td className="max-w-[260px] px-4 py-4">
                        {refund.payment ? (
                          <>
                            <p className="text-slate-700">
                              {money(
                                refund.payment.amount,
                                refund.payment.currency,
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {enumLabel(refund.payment.method)}
                              {refund.payment.reference
                                ? ` · ${refund.payment.reference}`
                                : ""}
                            </p>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {refund.bankAccount?.name || "-"}
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        {refund.reference || "-"}
                      </td>

                      <td className="px-4 py-4">
                        {refund.bankTransactions.length > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                            Posted
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {refund.documents.length}
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        {refund.createdBy?.fullName ||
                          refund.createdBy?.email ||
                          "-"}
                      </td>
                    </tr>
                  );
                })}
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
  warning = false,
  muted = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
  warning?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          positive
            ? "text-emerald-700"
            : warning
              ? "text-amber-700"
              : muted
                ? "text-slate-500"
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

const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
