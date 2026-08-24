import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BankStatementLineMatchStatus,
  BankStatementStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

import BankStatementImportForm from "./BankStatementImportForm";
import DeleteBankStatementButton from "./DeleteBankStatementButton";

function money(value: number | null, currency: string) {
  if (value === null) {
    return "-";
  }

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

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: BankStatementStatus) {
  switch (status) {
    case BankStatementStatus.RECONCILED:
      return "bg-emerald-100 text-emerald-800";
    case BankStatementStatus.REVIEWED:
      return "bg-blue-100 text-blue-800";
    case BankStatementStatus.ARCHIVED:
      return "bg-slate-900 text-white";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

export default async function BankStatementsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const [accounts, statements] = await Promise.all([
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
      },
    }),

    db.bankStatement.findMany({
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
        fileName: true,
        statementDate: true,
        openingBalance: true,
        closingBalance: true,
        currency: true,
        status: true,
        createdAt: true,
        bankAccount: {
          select: {
            id: true,
            name: true,
          },
        },
        uploadedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
        lines: {
          select: {
            matchStatus: true,
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
            Bank Statements
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Import CSV bank statements, review statement lines, and match them
            against posted Bank Ledger transactions before reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance"
            className={secondaryButton}
          >
            ← Finance Center
          </Link>

          <Link
            href="/admin/finance/reconciliation"
            className={secondaryButton}
          >
            Bank Reconciliation
          </Link>

          <Link
            href="/admin/finance/documents"
            className={secondaryButton}
          >
            Finance Documents
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          CSV Import
        </p>

        <p className="mt-2 font-semibold text-blue-950">
          Importing a statement does not create Bank Ledger transactions.
        </p>

        <p className="mt-1 text-xs leading-5 text-blue-800">
          Statement lines are external evidence. They are matched to existing
          posted ledger entries. Missing or incorrect ledger activity should be
          corrected through the normal payment, expense, refund, transfer, or
          adjustment workflow.
        </p>
      </section>

      <BankStatementImportForm accounts={accounts} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Statement History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review imported statement lines and matching progress.
          </p>
        </div>

        {statements.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No bank statements imported yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1250px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Statement Date</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3 text-right">Opening</th>
                  <th className="px-4 py-3 text-right">Closing</th>
                  <th className="px-4 py-3">Lines</th>
                  <th className="px-4 py-3">Matching</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Imported By</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {statements.map((statement) => {
                  const matched = statement.lines.filter(
                    (line) =>
                      line.matchStatus ===
                      BankStatementLineMatchStatus.MATCHED,
                  ).length;

                  const ignored = statement.lines.filter(
                    (line) =>
                      line.matchStatus ===
                      BankStatementLineMatchStatus.IGNORED,
                  ).length;

                  const unmatched =
                    statement.lines.length - matched - ignored;

                  return (
                    <tr key={statement.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">
                        {formatDate(statement.statementDate)}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#001F3F]">
                          {statement.bankAccount.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {statement.currency}
                        </p>
                      </td>

                      <td className="max-w-[220px] px-4 py-4">
                        <p className="truncate text-slate-700">
                          {statement.fileName || "CSV import"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-right">
                        {money(
                          statement.openingBalance === null
                            ? null
                            : Number(statement.openingBalance),
                          statement.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {money(
                          statement.closingBalance === null
                            ? null
                            : Number(statement.closingBalance),
                          statement.currency,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {statement.lines.length}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
                            {matched} matched
                          </span>

                          {ignored > 0 && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                              {ignored} ignored
                            </span>
                          )}

                          {unmatched > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                              {unmatched} unmatched
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                            statement.status,
                          )}`}
                        >
                          {statusLabel(statement.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {statement.uploadedBy?.fullName ||
                          statement.uploadedBy?.email ||
                          "Admin"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-3 whitespace-nowrap">
                          <Link
                            href={`/admin/finance/bank-statements/${statement.id}`}
                            className="font-semibold text-blue-700 hover:underline"
                          >
                            Open
                          </Link>

                          {statement.status !== BankStatementStatus.RECONCILED &&
                            statement.status !== BankStatementStatus.ARCHIVED && (
                              <DeleteBankStatementButton
                                statementId={statement.id}
                                fileName={statement.fileName || "CSV import"}
                              />
                            )}
                        </div>
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

const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";
