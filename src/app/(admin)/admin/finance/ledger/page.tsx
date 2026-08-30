import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type SearchParams = {
  q?: string;
  type?: string;
  direction?: string;
  status?: string;
  bankAccountId?: string;
  from?: string;
  to?: string;
  page?: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number, currency = "EUR") {
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

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "-";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getTypeClass(type: BankTransactionType) {
  switch (type) {
    case BankTransactionType.CUSTOMER_RECEIPT:
    case BankTransactionType.TRANSFER_IN:
      return "bg-green-100 text-green-700";

    case BankTransactionType.SUPPLIER_PAYMENT:
    case BankTransactionType.EXPENSE_PAYMENT:
    case BankTransactionType.REFUND:
    case BankTransactionType.TRANSFER_OUT:
      return "bg-red-100 text-red-700";

    case BankTransactionType.ADJUSTMENT:
      return "bg-amber-100 text-amber-700";

    case BankTransactionType.REVERSAL:
      return "bg-purple-100 text-purple-700";

    case BankTransactionType.OPENING_BALANCE:
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusClass(status: BankTransactionStatus) {
  switch (status) {
    case BankTransactionStatus.POSTED:
      return "bg-green-100 text-green-700";

    case BankTransactionStatus.REVERSED:
      return "bg-amber-100 text-amber-700";

    case BankTransactionStatus.VOIDED:
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function FinanceLedgerPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = (await searchParams) ?? {};

  const q = params.q?.trim() ?? "";
  const type = params.type?.trim() ?? "";
  const direction = params.direction?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const bankAccountId = params.bankAccountId?.trim() ?? "";
  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";

  const currentPage = Math.max(1, Number(params.page || "1"));
  const pageSize = 20;
  const skip = (currentPage - 1) * pageSize;

  const searchConditions: Prisma.BankTransactionWhereInput[] = q
    ? [
        {
          reference: {
            contains: q,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          description: {
            contains: q,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          notes: {
            contains: q,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          booking: {
            bookingReference: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          booking: {
            bookingDisplayCode: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          booking: {
            customerName: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          booking: {
            agencyNameSnapshot: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          booking: {
            groupName: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          tour: {
            title: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          tour: {
            tourCode: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          expense: {
            title: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          expense: {
            vendorName: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          supplierPayablePayment: {
            payable: {
              supplierNameSnapshot: {
                contains: q,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
        {
          supplierPayablePayment: {
            payable: {
              agencyGroupName: {
                contains: q,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
        {
          supplierPayablePayment: {
            payable: {
              title: {
                contains: q,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
        {
          supplierPayablePayment: {
            payable: {
              internalReference: {
                contains: q,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
        {
          supplierPayablePayment: {
            payable: {
              supplierInvoiceNumber: {
                contains: q,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
        {
          supplierPayablePayment: {
            payable: {
              supplierReference: {
                contains: q,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
      ]
    : [];

  const where: Prisma.BankTransactionWhereInput = {
    ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),

    ...(type &&
    Object.values(BankTransactionType).includes(type as BankTransactionType)
      ? { type: type as BankTransactionType }
      : {}),

    ...(direction &&
    Object.values(BankTransactionDirection).includes(
      direction as BankTransactionDirection,
    )
      ? { direction: direction as BankTransactionDirection }
      : {}),

    ...(status &&
    Object.values(BankTransactionStatus).includes(status as BankTransactionStatus)
      ? { status: status as BankTransactionStatus }
      : {}),

    ...(bankAccountId ? { bankAccountId } : {}),

    ...(from || to
      ? {
          transactionDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [transactions, totalCount, bankAccounts, summaryTransactions] =
    await Promise.all([
      db.bankTransaction.findMany({
        where,
        orderBy: [
          { transactionDate: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: pageSize,
        include: {
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
              customerName: true,
              agencyNameSnapshot: true,
              groupName: true,
              tourTitleSnapshot: true,
            },
          },
          payment: {
            select: {
              id: true,
              reference: true,
              method: true,
              booking: {
                select: {
                  id: true,
                  bookingReference: true,
                  bookingDisplayCode: true,
                  customerName: true,
                  agencyNameSnapshot: true,
                  groupName: true,
                  tourTitleSnapshot: true,
                },
              },
            },
          },
          supplierPayablePayment: {
            select: {
              id: true,
              reference: true,
              method: true,
              payable: {
                select: {
                  id: true,
                  title: true,
                  supplierNameSnapshot: true,
                  agencyGroupName: true,
                  booking: {
                    select: {
                      id: true,
                      bookingReference: true,
                      bookingDisplayCode: true,
                      customerName: true,
                      agencyNameSnapshot: true,
                      groupName: true,
                      tourTitleSnapshot: true,
                    },
                  },
                  supplier: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          expense: {
            select: {
              id: true,
              title: true,
              vendorName: true,
              spenderName: true,
            },
          },
          refund: {
            select: {
              id: true,
              reason: true,
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

      db.bankTransaction.count({ where }),

      db.bankAccount.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          currency: true,
          isActive: true,
        },
      }),

      db.bankTransaction.findMany({
        where,
        select: {
          amount: true,
          direction: true,
          currency: true,
          status: true,
        },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const buildPageHref = (page: number) => {
    const search = new URLSearchParams();

    if (q) search.set("q", q);
    if (type) search.set("type", type);
    if (direction) search.set("direction", direction);
    if (status) search.set("status", status);
    if (bankAccountId) search.set("bankAccountId", bankAccountId);
    if (from) search.set("from", from);
    if (to) search.set("to", to);

    search.set("page", String(page));

    return `/admin/finance/ledger?${search.toString()}`;
  };

  const currencySummary = new Map<
    string,
    {
      moneyIn: number;
      moneyOut: number;
      postedCount: number;
    }
  >();

  for (const item of summaryTransactions) {
    const currency = item.currency.trim().toUpperCase();

    if (!currencySummary.has(currency)) {
      currencySummary.set(currency, {
        moneyIn: 0,
        moneyOut: 0,
        postedCount: 0,
      });
    }

    const summary = currencySummary.get(currency)!;
    const amount = Number(item.amount);

    if (item.status === BankTransactionStatus.POSTED) {
      if (item.direction === BankTransactionDirection.IN) {
        summary.moneyIn += amount;
      } else {
        summary.moneyOut += amount;
      }

      summary.postedCount += 1;
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Finance Ledger
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Read-only consolidated register of actual bank movements. Customer
            receipts, supplier payments, additional expense payments, refunds,
            transfers and adjustments are recorded here through Bank
            Transactions.
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
            href="/admin/finance/bank-accounts"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Bank Accounts
          </Link>

          <Link
            href="/admin/finance/expenses"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Additional Expenses
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        <strong>Read-only ledger:</strong> correct transactions in their source
        module rather than editing the ledger directly. Customer receipts come
        from Customer Payments, supplier payments from Supplier Payables,
        additional expense payments from Additional Expenses, and refunds from
        the Refund workflow.
      </div>

      {currencySummary.size > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from(currencySummary.entries()).map(([currency, summary]) => {
            const net = summary.moneyIn - summary.moneyOut;

            return (
              <div
                key={currency}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Ledger Currency
                    </p>
                    <p className="mt-1 text-xl font-bold text-[#001F3F]">
                      {currency}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {summary.postedCount} posted
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Money In</p>
                    <p className="mt-1 font-bold text-green-700">
                      {formatMoney(summary.moneyIn, currency)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Money Out</p>
                    <p className="mt-1 font-bold text-red-700">
                      {formatMoney(summary.moneyOut, currency)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Net</p>
                    <p
                      className={`mt-1 font-bold ${
                        net > 0
                          ? "text-green-700"
                          : net < 0
                            ? "text-red-700"
                            : "text-slate-700"
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
      ) : null}

      <form className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Supplier, agency/group, tour, booking, invoice or reference..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              name="type"
              defaultValue={type}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">All Types</option>
              {Object.values(BankTransactionType).map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Direction
            </label>
            <select
              name="direction"
              defaultValue={direction}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">All</option>
              {Object.values(BankTransactionDirection).map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">All</option>
              {Object.values(BankTransactionStatus).map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Bank Account
            </label>
            <select
              name="bankAccountId"
              defaultValue={bankAccountId}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">All Accounts</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                  {account.isActive ? "" : " · Inactive"}
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

        <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              From
            </label>
            <input
              type="date"
              name="from"
              defaultValue={from}
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
              defaultValue={to}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div className="flex items-end">
            <Link
              href="/admin/finance/ledger"
              className="w-full rounded-xl border px-4 py-2.5 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Reset Filters
            </Link>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1700px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Party</th>
                <th className="px-4 py-3 font-medium">Booking / Tour</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 text-right font-medium">Money In</th>
                <th className="px-4 py-3 text-right font-medium">Money Out</th>
                <th className="px-4 py-3 font-medium">Bank Account</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((transaction) => {
                const booking =
                  transaction.booking ||
                  transaction.payment?.booking ||
                  transaction.supplierPayablePayment?.payable?.booking ||
                  null;

                const bookingRef = booking
                  ? booking.bookingDisplayCode || booking.bookingReference
                  : null;

                const supplierName =
                  transaction.supplierPayablePayment?.payable
                    ?.supplierNameSnapshot ||
                  transaction.supplierPayablePayment?.payable?.supplier?.name ||
                  null;

                const party =
                  supplierName ||
                  transaction.supplierPayablePayment?.payable?.agencyGroupName ||
                  booking?.agencyNameSnapshot ||
                  booking?.customerName ||
                  booking?.groupName ||
                  transaction.expense?.vendorName ||
                  transaction.expense?.spenderName ||
                  "-";

                const tourLabel = transaction.tour
                  ? transaction.tour.tourCode
                    ? `${transaction.tour.tourCode} — ${transaction.tour.title}`
                    : transaction.tour.title
                  : booking?.tourTitleSnapshot || "-";

                const description =
                  transaction.description ||
                  transaction.supplierPayablePayment?.payable?.title ||
                  transaction.expense?.title ||
                  booking?.tourTitleSnapshot ||
                  formatEnumLabel(transaction.type);

                const reference =
                  transaction.reference ||
                  transaction.payment?.reference ||
                  transaction.supplierPayablePayment?.reference ||
                  "-";

                const source =
                  transaction.payment
                    ? "Customer Payment"
                    : transaction.supplierPayablePayment
                      ? "Supplier Payment"
                      : transaction.expense
                        ? "Additional Expense"
                        : transaction.refund
                          ? "Refund"
                          : transaction.transferGroupId
                            ? "Bank Transfer"
                            : transaction.reversalOfId
                              ? "Reversal"
                              : "Bank Transaction";

                const amount = Number(transaction.amount);

                return (
                  <tr
                    key={transaction.id}
                    className="border-t transition hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-medium">
                        {formatDate(transaction.transactionDate)}
                      </div>
                      {transaction.valueDate ? (
                        <div className="mt-1 text-xs text-slate-400">
                          Value: {formatDate(transaction.valueDate)}
                        </div>
                      ) : null}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getTypeClass(
                          transaction.type,
                        )}`}
                      >
                        {formatEnumLabel(transaction.type)}
                      </span>
                    </td>

                    <td className="px-4 py-3">{party}</td>

                    <td className="px-4 py-3">
                      <div>
                        {booking?.id && bookingRef ? (
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="font-semibold text-blue-700 hover:underline"
                          >
                            {bookingRef}
                          </Link>
                        ) : (
                          <span className="font-medium">{bookingRef || "-"}</span>
                        )}
                      </div>

                      <div className="mt-1 max-w-72 truncate text-xs text-slate-500">
                        {tourLabel}
                      </div>

                      {transaction.departureDate ? (
                        <div className="mt-1 text-xs text-slate-400">
                          {formatDate(transaction.departureDate.date)}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <div className="max-w-80">
                        {description}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {reference}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-green-700">
                      {transaction.status === BankTransactionStatus.POSTED &&
                      transaction.direction === BankTransactionDirection.IN
                        ? formatMoney(amount, transaction.currency)
                        : "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-700">
                      {transaction.status === BankTransactionStatus.POSTED &&
                      transaction.direction === BankTransactionDirection.OUT
                        ? formatMoney(amount, transaction.currency)
                        : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/finance/bank-accounts/${transaction.bankAccount.id}`}
                        className="font-medium text-[#001F3F] hover:text-[#8B0000] hover:underline"
                      >
                        {transaction.bankAccount.name}
                      </Link>
                      <div className="mt-1 text-xs text-slate-400">
                        {transaction.bankAccount.currency}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                          transaction.status,
                        )}`}
                      >
                        {formatEnumLabel(transaction.status)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {source}
                    </td>
                  </tr>
                );
              })}

              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No ledger transactions match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Showing {transactions.length} of {totalCount} transactions — Page{" "}
            {currentPage} of {totalPages}
          </p>

          <div className="flex gap-2">
            <Link
              href={buildPageHref(Math.max(1, currentPage - 1))}
              className={`rounded-lg border px-4 py-2 text-sm ${
                currentPage <= 1
                  ? "pointer-events-none opacity-50"
                  : "hover:border-[#8B0000] hover:text-[#8B0000]"
              }`}
            >
              Previous
            </Link>

            <Link
              href={buildPageHref(Math.min(totalPages, currentPage + 1))}
              className={`rounded-lg border px-4 py-2 text-sm ${
                currentPage >= totalPages
                  ? "pointer-events-none opacity-50"
                  : "hover:border-[#8B0000] hover:text-[#8B0000]"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
