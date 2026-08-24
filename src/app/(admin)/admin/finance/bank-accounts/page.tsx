import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  BankTransactionDirection,
  BankTransactionStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/payments/formatCurrency";
import BankAccountForm from "./BankAccountForm";
import BankAccountActions from "./BankAccountActions";

export default async function BankAccountsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const accounts = await db.bankAccount.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      bankTransactions: {
        where: {
          status: BankTransactionStatus.POSTED,
        },
        select: {
          id: true,
          amount: true,
          direction: true,
          type: true,
          transactionDate: true,
        },
      },
    },
  });

  const accountRows = accounts.map((account) => {
    const totalIn = account.bankTransactions
      .filter(
        (transaction) =>
          transaction.direction === BankTransactionDirection.IN,
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const totalOut = account.bankTransactions
      .filter(
        (transaction) =>
          transaction.direction === BankTransactionDirection.OUT,
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const calculatedBalance =
      account.openingBalance + totalIn - totalOut;

    return {
      ...account,
      totalIn,
      totalOut,
      calculatedBalance,
      postedTransactionCount: account.bankTransactions.length,
    };
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">
            Bank Accounts
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Opening balance plus posted bank transactions determines the live
            calculated balance.
          </p>
        </div>

        <Link
          href="/admin/finance"
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:border-[#8B0000] hover:text-[#8B0000]"
        >
          Back to Finance Dashboard
        </Link>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
        <strong>Ledger-based balance:</strong> Current Balance is no longer
        entered manually. It is calculated as Opening Balance + POSTED IN -
        POSTED OUT.
      </div>

      <BankAccountForm />

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 text-right font-medium">
                  Opening Balance
                </th>
                <th className="px-4 py-3 text-right font-medium">Posted In</th>
                <th className="px-4 py-3 text-right font-medium">Posted Out</th>
                <th className="px-4 py-3 text-right font-medium">
                  Calculated Balance
                </th>
                <th className="px-4 py-3 text-center font-medium">
                  Transactions
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {accountRows.map((account) => (
                <tr key={account.id} className="border-t">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/admin/finance/bank-accounts/${account.id}`}
                      className="font-semibold text-[#001F3F] hover:text-[#8B0000] hover:underline"
                    >
                      {account.name}
                    </Link>
                  </td>

                  <td className="px-4 py-3">{account.currency}</td>

                  <td className="px-4 py-3 text-right">
                    {formatCurrency(
                      account.openingBalance,
                      account.currency,
                    )}
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-green-700">
                    {formatCurrency(account.totalIn, account.currency)}
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-red-700">
                    {formatCurrency(account.totalOut, account.currency)}
                  </td>

                  <td className="px-4 py-3 text-right font-bold text-[#001F3F]">
                    {formatCurrency(
                      account.calculatedBalance,
                      account.currency,
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {account.postedTransactionCount}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        account.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {account.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {account.notes || "-"}
                  </td>

                  <td className="px-4 py-3">
                    <BankAccountActions
                      account={{
                        id: account.id,
                        name: account.name,
                        currency: account.currency,
                        openingBalance: account.openingBalance,
                        isActive: account.isActive,
                        notes: account.notes,
                      }}
                      />
                  </td>
                </tr>
              ))}

              {accountRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No bank accounts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Click an account name to open its transaction ledger and running balance.
      </p>
    </div>
  );
}
