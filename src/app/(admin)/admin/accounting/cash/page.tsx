import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  AccountingCategory,
  AccountingPeriodStatus,
  CashTransactionDirection,
  CashTransactionStatus,
  Role,
} from "@prisma/client";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  FileUp,
  MinusCircle,
  PlusCircle,
  ReceiptText,
} from "lucide-react";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    year?: string;
    month?: string;
    created?: string;
  }>;
};

function getDueDate(year: number, month: number) {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return new Date(Date.UTC(nextYear, nextMonth - 1, 5, 12, 0, 0));
}

function getMonthName(month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function enumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: CashTransactionStatus) {
  switch (status) {
    case CashTransactionStatus.POSTED:
      return "bg-emerald-100 text-emerald-700";
    case CashTransactionStatus.DRAFT:
      return "bg-amber-100 text-amber-700";
    case CashTransactionStatus.CANCELLED:
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function AccountingCashPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const query = await searchParams;
  const now = new Date();

  const yearValue = Number(query.year) || now.getFullYear();
  const monthValue = Number(query.month) || now.getMonth() + 1;

  const year =
    Number.isInteger(yearValue) && yearValue >= 2000 && yearValue <= 2100
      ? yearValue
      : now.getFullYear();

  const month =
    Number.isInteger(monthValue) && monthValue >= 1 && monthValue <= 12
      ? monthValue
      : now.getMonth() + 1;

  const [period, suppliers, tours, bookings, departures] = await Promise.all([
    db.accountingPeriod.upsert({
      where: {
        year_month: {
          year,
          month,
        },
      },
      update: {},
      create: {
        year,
        month,
        dueDate: getDueDate(year, month),
      },
      include: {
        cashTransactions: {
          orderBy: [
            { transactionDate: "desc" },
            { createdAt: "desc" },
          ],
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
            booking: {
              select: {
                id: true,
                bookingReference: true,
                bookingDisplayCode: true,
                groupName: true,
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
            createdBy: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    db.supplier.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    db.tour.findMany({
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        title: true,
        tourCode: true,
      },
    }),
    db.booking.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        groupName: true,
      },
    }),
    db.departureDate.findMany({
      orderBy: {
        date: "desc",
      },
      take: 200,
      select: {
        id: true,
        date: true,
        tour: {
          select: {
            title: true,
          },
        },
      },
    }),
  ]);

  const isClosed = period.status === AccountingPeriodStatus.CLOSED;

  const postedTransactions = period.cashTransactions.filter(
    (transaction) => transaction.status === CashTransactionStatus.POSTED,
  );

  const totals = new Map<
    string,
    {
      receipts: number;
      payments: number;
    }
  >();

  for (const transaction of postedTransactions) {
    const currency = transaction.currency.trim().toUpperCase() || "EUR";
    const current = totals.get(currency) ?? {
      receipts: 0,
      payments: 0,
    };

    const amount = Number(transaction.amount);

    if (transaction.direction === CashTransactionDirection.RECEIPT) {
      current.receipts += amount;
    } else {
      current.payments += amount;
    }

    totals.set(currency, current);
  }

  const cashDocumentHref =
    `/admin/accounting/upload?year=${year}&month=${month}` +
    `&category=${AccountingCategory.CASH}`;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Link
            href={`/admin/accounting/${year}/${month}?category=${AccountingCategory.CASH}`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#8B0000]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Monthly Accounting
          </Link>

          <div className="flex items-center gap-2 text-sm font-semibold text-[#8B0000]">
            <Banknote className="h-4 w-4" />
            04 - Cash
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0B1F3A]">
            Cash Register - {getMonthName(month)} {year}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Record cash received and cash paid during the accounting month.
            Supporting receipts and other evidence remain in the Accounting
            Documents section and can be uploaded separately.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={cashDocumentHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            <FileUp className="h-4 w-4" />
            Upload Supporting Document
          </Link>
        </div>
      </div>

      {query.created === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Cash transaction recorded successfully
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                The transaction has been added to {getMonthName(month)} {year}.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isClosed ? (
        <div className="rounded-xl border border-slate-300 bg-slate-100 px-5 py-4">
          <p className="font-semibold text-slate-900">
            Closed Period - Read Only
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Cash records remain available for review, but new transactions
            cannot be added until this accounting period is reopened.
          </p>
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0B1F3A]">
            Monthly Cash Summary
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Only posted cash transactions are included in these totals.
          </p>
        </div>

        {totals.size === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
            No posted cash activity has been recorded for this month.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from(totals.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([currency, values]) => {
                const net = values.receipts - values.payments;

                return (
                  <div
                    key={currency}
                    className="rounded-2xl border bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#0B1F3A]">
                        {currency}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        Cash
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-emerald-50 p-3">
                        <p className="text-xs font-medium text-emerald-700">
                          Received
                        </p>
                        <p className="mt-1 font-bold text-emerald-900">
                          {formatMoney(values.receipts, currency)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-red-50 p-3">
                        <p className="text-xs font-medium text-red-700">
                          Paid
                        </p>
                        <p className="mt-1 font-bold text-red-900">
                          {formatMoney(values.payments, currency)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-700">
                          Net Movement
                        </p>
                        <p
                          className={`mt-1 font-bold ${
                            net >= 0 ? "text-blue-900" : "text-red-800"
                          }`}
                        >
                          {formatMoney(net, currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {!isClosed ? (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#0B1F3A]">
              Add Cash Transaction
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Record the financial event first. Upload the supporting receipt
              or proof separately when applicable.
            </p>
          </div>

          <form
            action="/api/admin/accounting/cash"
            method="POST"
            className="space-y-6"
          >
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label
                  htmlFor="transactionDate"
                  className="text-sm font-semibold text-slate-800"
                >
                  Transaction Date *
                </label>
                <input
                  id="transactionDate"
                  name="transactionDate"
                  type="date"
                  required
                  defaultValue={today}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label
                  htmlFor="direction"
                  className="text-sm font-semibold text-slate-800"
                >
                  Transaction Type *
                </label>
                <select
                  id="direction"
                  name="direction"
                  required
                  defaultValue={CashTransactionDirection.PAYMENT}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                >
                  <option value={CashTransactionDirection.RECEIPT}>
                    Cash Receipt
                  </option>
                  <option value={CashTransactionDirection.PAYMENT}>
                    Cash Payment
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="amount"
                  className="text-sm font-semibold text-slate-800"
                >
                  Amount *
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label
                  htmlFor="currency"
                  className="text-sm font-semibold text-slate-800"
                >
                  Currency *
                </label>
                <input
                  id="currency"
                  name="currency"
                  maxLength={3}
                  required
                  defaultValue="EUR"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-[#8B0000]"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="counterparty"
                  className="text-sm font-semibold text-slate-800"
                >
                  Payer / Payee
                </label>
                <input
                  id="counterparty"
                  name="counterparty"
                  placeholder="Person, supplier, client or organization"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label
                  htmlFor="reference"
                  className="text-sm font-semibold text-slate-800"
                >
                  Reference
                </label>
                <input
                  id="reference"
                  name="reference"
                  placeholder="Receipt, voucher or internal reference"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className="text-sm font-semibold text-slate-800"
                >
                  Description / Purpose *
                </label>
                <input
                  id="description"
                  name="description"
                  required
                  placeholder="e.g. Taxi paid in cash for group transfer"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label
                  htmlFor="supplierId"
                  className="text-sm font-semibold text-slate-800"
                >
                  Supplier
                </label>
                <select
                  id="supplierId"
                  name="supplierId"
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                >
                  <option value="">No supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="bookingId"
                  className="text-sm font-semibold text-slate-800"
                >
                  Booking / Group
                </label>
                <select
                  id="bookingId"
                  name="bookingId"
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                >
                  <option value="">No booking</option>
                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.bookingDisplayCode ?? booking.bookingReference}
                      {booking.groupName ? ` - ${booking.groupName}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tourId"
                  className="text-sm font-semibold text-slate-800"
                >
                  Tour
                </label>
                <select
                  id="tourId"
                  name="tourId"
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                >
                  <option value="">No tour</option>
                  {tours.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.tourCode ? `${tour.tourCode} - ` : ""}
                      {tour.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="departureDateId"
                  className="text-sm font-semibold text-slate-800"
                >
                  Departure
                </label>
                <select
                  id="departureDateId"
                  name="departureDateId"
                  defaultValue=""
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                >
                  <option value="">No departure</option>
                  {departures.map((departure) => (
                    <option key={departure.id} value={departure.id}>
                      {formatDate(departure.date)} - {departure.tour.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="status"
                  className="text-sm font-semibold text-slate-800"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={CashTransactionStatus.POSTED}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                >
                  <option value={CashTransactionStatus.POSTED}>Posted</option>
                  <option value={CashTransactionStatus.DRAFT}>Draft</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="text-sm font-semibold text-slate-800"
                >
                  Internal Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Optional accounting notes"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
              >
                <ReceiptText className="h-4 w-4" />
                Record Cash Transaction
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0B1F3A]">
                Cash Transaction Register
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                All cash records for this accounting month, including draft
                and cancelled entries.
              </p>
            </div>
            <p className="text-sm font-medium text-slate-500">
              {period.cashTransactions.length} transaction
              {period.cashTransactions.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Counterparty</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Related Record</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>

            <tbody>
              {period.cashTransactions.map((transaction) => {
                const bookingRef = transaction.booking
                  ? transaction.booking.bookingDisplayCode ??
                    transaction.booking.bookingReference
                  : null;

                const relatedRecord =
                  bookingRef ||
                  transaction.supplier?.name ||
                  transaction.tour?.title ||
                  (transaction.departureDate
                    ? formatDate(transaction.departureDate.date)
                    : null) ||
                  "—";

                const amount = Number(transaction.amount);

                return (
                  <tr key={transaction.id} className="border-t align-top">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(transaction.transactionDate)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          transaction.direction ===
                          CashTransactionDirection.RECEIPT
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {transaction.direction ===
                        CashTransactionDirection.RECEIPT ? (
                          <PlusCircle className="h-3.5 w-3.5" />
                        ) : (
                          <MinusCircle className="h-3.5 w-3.5" />
                        )}
                        {transaction.direction ===
                        CashTransactionDirection.RECEIPT
                          ? "Cash Receipt"
                          : "Cash Payment"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {transaction.counterparty || "—"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="max-w-80 font-medium text-slate-800">
                        {transaction.description}
                      </div>
                      {transaction.notes ? (
                        <div className="mt-1 max-w-80 text-xs text-slate-500">
                          {transaction.notes}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      {transaction.reference || "—"}
                    </td>

                    <td className="px-4 py-3">{relatedRecord}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                          transaction.status,
                        )}`}
                      >
                        {enumLabel(transaction.status)}
                      </span>
                    </td>

                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                        transaction.direction ===
                        CashTransactionDirection.RECEIPT
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {transaction.direction ===
                      CashTransactionDirection.RECEIPT
                        ? "+"
                        : "-"}
                      {formatMoney(amount, transaction.currency)}
                    </td>
                  </tr>
                );
              })}

              {period.cashTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No cash transactions have been recorded for this month.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
