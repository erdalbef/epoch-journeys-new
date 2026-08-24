import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  BankTransactionDirection,
  BankTransactionStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/payments/formatCurrency";

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function prettify(value: string) {
  return value.replaceAll("_", " ");
}

export default async function BankAccountLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const { id } = await params;

  const account = await db.bankAccount.findUnique({
    where: { id },
    include: {
      bankTransactions: {
        where: {
          status: BankTransactionStatus.POSTED,
        },
        orderBy: [
          { transactionDate: "asc" },
          { createdAt: "asc" },
        ],
        include: {
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
            },
          },
        },
      },
    },
  });

  if (!account) {
    notFound();
  }

  const rows = account.bankTransactions.reduce<
    Array<{
      transaction: (typeof account.bankTransactions)[number];
      amount: number;
      runningBalance: number;
      bookingRef: string | null;
      bookingId: string | null;
      party: string;
      description: string;
      reference: string;
    }>
  >((result, transaction) => {
    const amount = Number(transaction.amount);

    const previousBalance =
      result.length > 0
        ? result[result.length - 1].runningBalance
        : account.openingBalance;

    const nextBalance =
      transaction.direction === BankTransactionDirection.IN
        ? previousBalance + amount
        : previousBalance - amount;

    const booking =
      transaction.booking ||
      transaction.payment?.booking ||
      transaction.supplierPayablePayment?.payable?.booking ||
      null;

    const bookingRef = booking
      ? booking.bookingDisplayCode || booking.bookingReference
      : null;

    const supplierName =
      transaction.supplierPayablePayment?.payable?.supplierNameSnapshot ||
      transaction.supplierPayablePayment?.payable?.supplier?.name ||
      null;

    const party =
      supplierName ||
      booking?.agencyNameSnapshot ||
      booking?.customerName ||
      booking?.groupName ||
      transaction.expense?.vendorName ||
      "-";

    const description =
      transaction.description ||
      transaction.supplierPayablePayment?.payable?.title ||
      transaction.expense?.title ||
      booking?.tourTitleSnapshot ||
      prettify(transaction.type);

    const reference =
      transaction.reference ||
      transaction.payment?.reference ||
      transaction.supplierPayablePayment?.reference ||
      "-";

    result.push({
      transaction,
      amount,
      runningBalance: nextBalance,
      bookingRef,
      bookingId: booking?.id || null,
      party,
      description,
      reference,
    });

    return result;
  }, []);

  const totalIn = account.bankTransactions
    .filter(
      (transaction) =>
        transaction.direction === BankTransactionDirection.IN,
    )
    .reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0,
    );

  const totalOut = account.bankTransactions
    .filter(
      (transaction) =>
        transaction.direction === BankTransactionDirection.OUT,
    )
    .reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0,
    );

  const calculatedBalance =
    account.openingBalance + totalIn - totalOut;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Bank Ledger
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            {account.name}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {account.currency} account · posted transactions only
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/finance/bank-accounts"
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Back to Bank Accounts
          </Link>

          <Link
            href="/admin/finance"
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Finance Dashboard
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Opening Balance</p>
          <p className="mt-2 text-2xl font-bold text-[#001F3F]">
            {formatCurrency(account.openingBalance, account.currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-green-50 p-5 shadow-sm">
          <p className="text-sm text-green-700">Posted In</p>
          <p className="mt-2 text-2xl font-bold text-green-800">
            {formatCurrency(totalIn, account.currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-700">Posted Out</p>
          <p className="mt-2 text-2xl font-bold text-red-800">
            {formatCurrency(totalOut, account.currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-blue-50 p-5 shadow-sm">
          <p className="text-sm text-blue-700">Calculated Balance</p>
          <p className="mt-2 text-2xl font-bold text-blue-800">
            {formatCurrency(calculatedBalance, account.currency)}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Transaction Ledger
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Running balance is calculated chronologically from the opening balance.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Party</th>
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 text-right font-medium">Money In</th>
                <th className="px-4 py-3 text-right font-medium">Money Out</th>
                <th className="px-4 py-3 text-right font-medium">
                  Running Balance
                </th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-t bg-slate-50/60">
                <td className="px-4 py-3">Opening</td>
                <td className="px-4 py-3 font-medium">OPENING BALANCE</td>
                <td className="px-4 py-3">-</td>
                <td className="px-4 py-3">-</td>
                <td className="px-4 py-3">Opening balance</td>
                <td className="px-4 py-3">-</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right font-bold text-[#001F3F]">
                  {formatCurrency(account.openingBalance, account.currency)}
                </td>
              </tr>

              {rows.map((row) => (
                <tr key={row.transaction.id} className="border-t">
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatDate(row.transaction.transactionDate)}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {prettify(row.transaction.type)}
                    </span>
                  </td>

                  <td className="px-4 py-3">{row.party}</td>

                  <td className="px-4 py-3">
                    {row.bookingId && row.bookingRef ? (
                      <Link
                        href={`/admin/bookings/${row.bookingId}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {row.bookingRef}
                      </Link>
                    ) : (
                      row.bookingRef || "-"
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="max-w-72 truncate">
                      {row.description}
                    </div>
                  </td>

                  <td className="px-4 py-3">{row.reference}</td>

                  <td className="px-4 py-3 text-right font-semibold text-green-700">
                    {row.transaction.direction ===
                    BankTransactionDirection.IN
                      ? formatCurrency(row.amount, account.currency)
                      : "-"}
                  </td>

                  <td className="px-4 py-3 text-right font-semibold text-red-700">
                    {row.transaction.direction ===
                    BankTransactionDirection.OUT
                      ? formatCurrency(row.amount, account.currency)
                      : "-"}
                  </td>

                  <td className="px-4 py-3 text-right font-bold text-[#001F3F]">
                    {formatCurrency(row.runningBalance, account.currency)}
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No posted transactions yet.
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
