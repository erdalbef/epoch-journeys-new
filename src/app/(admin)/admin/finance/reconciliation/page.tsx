import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BankReconciliationStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import ReconciliationForm from "./ReconciliationForm";

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
  if (!value) {
    return "-";
  }

  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status: BankReconciliationStatus) {
  switch (status) {
    case BankReconciliationStatus.LOCKED:
      return "bg-slate-900 text-white";

    case BankReconciliationStatus.RECONCILED:
      return "bg-emerald-100 text-emerald-800";

    case BankReconciliationStatus.IN_PROGRESS:
      return "bg-blue-100 text-blue-800";

    default:
      return "bg-amber-100 text-amber-800";
  }
}

function statusLabel(status: BankReconciliationStatus) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function BankReconciliationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const [accounts, reconciliations] = await Promise.all([
    db.bankAccount.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          currency: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        currency: true,
        openingBalance: true,
      },
    }),

    db.bankReconciliation.findMany({
      orderBy: [
        {
          statementDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 100,
      select: {
        id: true,
        statementDate: true,
        statementOpeningBalance: true,
        statementClosingBalance: true,
        ledgerOpeningBalance: true,
        ledgerClosingBalance: true,
        difference: true,
        status: true,
        reconciledAt: true,
        lockedAt: true,
        createdAt: true,
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
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Bank Reconciliation
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Match posted Bank Ledger transactions to bank statements, verify
            statement closing balances, and lock completed reconciliations for
            audit control.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            ← Finance Center
          </Link>

          <Link
            href="/admin/finance/bank-accounts"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Bank Accounts
          </Link>

          <Link
            href="/admin/finance/bank-statements"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Bank Statements
          </Link>

          <Link
            href="/admin/finance/documents"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Finance Documents
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          Reconciliation Rule
        </p>

        <p className="mt-2 font-semibold text-blue-950">
          Ledger Opening Balance + matched posted IN − matched posted OUT =
          Ledger Closing Balance
        </p>

        <p className="mt-1 text-xs leading-5 text-blue-800">
          The reconciliation difference is Statement Closing Balance − Ledger
          Closing Balance. Reconciliation does not create or change cash
          transactions.
        </p>
      </section>

      <ReconciliationForm accounts={accounts} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Reconciliation History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Open a reconciliation to match transactions, review differences,
            reconcile, or lock the statement period.
          </p>
        </div>

        {reconciliations.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No bank reconciliations yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Statement Date</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3 text-right">Statement Opening</th>
                  <th className="px-4 py-3 text-right">Statement Closing</th>
                  <th className="px-4 py-3 text-right">Ledger Closing</th>
                  <th className="px-4 py-3 text-right">Difference</th>
                  <th className="px-4 py-3">Matched</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created By</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {reconciliations.map((item) => {
                  const difference = Number(item.difference);
                  const matched = Math.abs(difference) < 0.005;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">
                        {formatDate(item.statementDate)}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#001F3F]">
                          {item.bankAccount.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.bankAccount.currency}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        {money(
                          Number(item.statementOpeningBalance),
                          item.bankAccount.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        {money(
                          Number(item.statementClosingBalance),
                          item.bankAccount.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        {money(
                          Number(item.ledgerClosingBalance),
                          item.bankAccount.currency,
                        )}
                      </td>

                      <td
                        className={`px-4 py-4 text-right font-bold ${
                          matched ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {money(difference, item.bankAccount.currency)}
                      </td>

                      <td className="px-4 py-4">
                        {item._count.transactions}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                            item.status,
                          )}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {item.createdBy?.fullName ||
                          item.createdBy?.email ||
                          "Admin"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/admin/finance/reconciliation/${item.id}`}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          Open
                        </Link>
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
