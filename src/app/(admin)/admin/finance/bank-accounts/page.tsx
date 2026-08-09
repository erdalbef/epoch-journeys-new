import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/payments/formatCurrency";

import BankAccountForm from "./BankAccountForm";
import BankAccountActions from "./BankAccountActions";

export default async function BankAccountsPage() {
  const session =
    await getServerSession(
      authOptions,
    );

  if (
    !session?.user ||
    session.user.role !==
      Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const [
    accounts,
    ledgerRows,
  ] = await Promise.all([
    db.bankAccount.findMany({
      orderBy: [
        {
          isActive: "desc",
        },
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
        currentBalance: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            bankTransactions:
              true,
          },
        },
      },
    }),

    db.bankTransaction.groupBy({
      by: [
        "bankAccountId",
        "direction",
      ],

      where: {
        status:
          BankTransactionStatus.POSTED,

        /*
         * Opening balance is already stored
         * on BankAccount.openingBalance.
         *
         * Excluding OPENING_BALANCE here
         * prevents counting it twice.
         */
        type: {
          not:
            BankTransactionType.OPENING_BALANCE,
        },
      },

      _sum: {
        amount: true,
      },
    }),
  ]);

  const ledgerMap =
    new Map<
      string,
      {
        incoming: number;
        outgoing: number;
      }
    >();

  for (const row of ledgerRows) {
    const current =
      ledgerMap.get(
        row.bankAccountId,
      ) ?? {
        incoming: 0,
        outgoing: 0,
      };

    const amount =
      Number(
        row._sum.amount ??
          0,
      );

    if (
      row.direction ===
      BankTransactionDirection.IN
    ) {
      current.incoming +=
        amount;
    } else {
      current.outgoing +=
        amount;
    }

    ledgerMap.set(
      row.bankAccountId,
      current,
    );
  }

  const accountRows =
    accounts.map(
      (account) => {
        const movement =
          ledgerMap.get(
            account.id,
          ) ?? {
            incoming: 0,
            outgoing: 0,
          };

        const ledgerBalance =
          account.openingBalance +
          movement.incoming -
          movement.outgoing;

        /*
         * currentBalance is retained as a
         * legacy/system field for compatibility.
         *
         * The ledger-calculated balance is the
         * authoritative finance balance.
         */
        const storedDifference =
          account.currentBalance -
          ledgerBalance;

        return {
          ...account,

          ledgerIn:
            movement.incoming,

          ledgerOut:
            movement.outgoing,

          ledgerBalance,

          storedDifference,

          hasLedgerActivity:
            account._count
              .bankTransactions >
            0,
        };
      },
    );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Bank & Cash Accounts
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage finance accounts
            and compare stored account
            values against balances
            calculated directly from
            the posted Bank Ledger.
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
            href="/admin/finance/bank-transfers"
            className={secondaryButton}
          >
            Bank Transfers
          </Link>

          <Link
            href="/admin/finance/documents"
            className={secondaryButton}
          >
            Finance Documents
          </Link>
        </div>
      </div>

      {/* ACCOUNTING RULE */}

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
          Balance Source of Truth
        </p>

        <p className="mt-2 font-semibold text-blue-950">
          Opening Balance + Posted
          Ledger IN − Posted Ledger
          OUT = Ledger Balance
        </p>

        <p className="mt-1 text-xs leading-5 text-blue-800">
          Current Balance is no
          longer manually editable.
          The Ledger Balance shown
          below is the authoritative
          finance balance. Opening
          balance transactions are
          excluded from the ledger
          movement calculation to
          prevent double counting.
        </p>
      </section>

      {/* CREATE */}

      <BankAccountForm />

      {/* ACCOUNTS */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Accounts
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Multiple accounts may be
            active at the same time.
            Active means the account
            is available for finance
            transactions.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Account
                </th>

                <th className="px-4 py-3">
                  Currency
                </th>

                <th className="px-4 py-3 text-right">
                  Opening
                </th>

                <th className="px-4 py-3 text-right">
                  Ledger In
                </th>

                <th className="px-4 py-3 text-right">
                  Ledger Out
                </th>

                <th className="px-4 py-3 text-right">
                  Ledger Balance
                </th>

                <th className="px-4 py-3 text-right">
                  Stored Balance
                </th>

                <th className="px-4 py-3 text-right">
                  Difference
                </th>

                <th className="px-4 py-3">
                  Status
                </th>

                <th className="px-4 py-3">
                  Notes
                </th>

                <th className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {accountRows.map(
                (account) => {
                  const matched =
                    Math.abs(
                      account.storedDifference,
                    ) < 0.005;

                  return (
                    <tr
                      key={account.id}
                      className="border-t border-slate-100 align-top hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#001F3F]">
                          {account.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {
                            account._count
                              .bankTransactions
                          }{" "}
                          ledger transaction
                          {account._count
                            .bankTransactions ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {
                          account.currency
                        }
                      </td>

                      <td className="px-4 py-4 text-right">
                        {formatCurrency(
                          account.openingBalance,
                          account.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-emerald-700">
                        {formatCurrency(
                          account.ledgerIn,
                          account.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-red-700">
                        {formatCurrency(
                          account.ledgerOut,
                          account.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-base font-bold text-[#001F3F]">
                        {formatCurrency(
                          account.ledgerBalance,
                          account.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-500">
                        {formatCurrency(
                          account.currentBalance,
                          account.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div
                          className={
                            matched
                              ? "font-semibold text-emerald-700"
                              : "font-semibold text-amber-700"
                          }
                        >
                          {formatCurrency(
                            account.storedDifference,
                            account.currency,
                          )}
                        </div>

                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            matched
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {matched
                            ? "MATCHED"
                            : "REVIEW"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            account.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {account.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="max-w-[260px] px-4 py-4 text-slate-500">
                        {account.notes ||
                          "-"}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <BankAccountActions
                          account={{
                            id:
                              account.id,

                            name:
                              account.name,

                            currency:
                              account.currency,

                            openingBalance:
                              account.openingBalance,

                            currentBalance:
                              account.currentBalance,

                            isActive:
                              account.isActive,

                            notes:
                              account.notes,

                            hasLedgerActivity:
                              account.hasLedgerActivity,
                          }}
                        />
                      </td>
                    </tr>
                  );
                },
              )}

              {accountRows.length ===
                0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No bank or cash
                    accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* RECONCILIATION NEXT */}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="font-semibold text-[#001F3F]">
          Next: Bank
          Reconciliation
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          The Difference column is an
          internal system check between
          the legacy stored balance
          and the Bank Ledger balance.
          Our next step will add a
          separate statement balance
          and formal reconciliation
          workflow.
        </p>
      </section>
    </div>
  );
}

const secondaryButton =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";