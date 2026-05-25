import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

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
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">Bank Accounts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage opening balances and active bank account for finance reports.
          </p>
        </div>

        <Link
          href="/admin/finance"
          className="rounded-xl border px-4 py-2 text-sm font-medium hover:border-[#8B0000] hover:text-[#8B0000]"
        >
          Back to Finance Dashboard
        </Link>
      </div>

      <BankAccountForm />

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Currency</th>
              <th className="px-4 py-3 text-right font-medium">
                Opening Balance
              </th>
              <th className="px-4 py-3 text-right font-medium">
                Current Balance
              </th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t">
                <td className="px-4 py-3 font-medium text-[#001F3F]">
                  {account.name}
                </td>

                <td className="px-4 py-3">{account.currency}</td>

                <td className="px-4 py-3 text-right">
                  {formatCurrency(account.openingBalance, account.currency)}
                </td>

                <td className="px-4 py-3 text-right">
                  {formatCurrency(account.currentBalance, account.currency)}
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
                  <BankAccountActions account={account} />
                </td>
              </tr>
            ))}

            {accounts.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No bank accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}