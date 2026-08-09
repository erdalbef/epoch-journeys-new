import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BankReconciliationStatus,
  BankStatementStatus,
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  bankAccountId?: string;
  type?: string;
  direction?: string;
  reconciliationStatus?: string;
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

function enumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function CashBankReportPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = await searchParams;

  const from = parseDateStart(params.from);
  const to = parseDateEnd(params.to);

  const type = validEnum(BankTransactionType, params.type);
  const direction = validEnum(
    BankTransactionDirection,
    params.direction,
  );
  const reconciliationStatus = validEnum(
    BankReconciliationStatus,
    params.reconciliationStatus,
  );

  const q = params.q?.trim() || "";

  const accounts = await db.bankAccount.findMany({
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
      currentBalance: true,
      isActive: true,
      notes: true,
    },
  });

  const selectedAccount =
    params.bankAccountId &&
    accounts.some((account) => account.id === params.bankAccountId)
      ? params.bankAccountId
      : undefined;

  const accountIds = selectedAccount
    ? [selectedAccount]
    : accounts.map((account) => account.id);

  const transactionWhere: Prisma.BankTransactionWhereInput = {
    ...(selectedAccount
      ? {
          bankAccountId: selectedAccount,
        }
      : {}),

    ...(from || to
      ? {
          transactionDate: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),

    ...(type ? { type } : {}),
    ...(direction ? { direction } : {}),

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
              description: {
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
          ],
        }
      : {}),
  };

  const [
    transactions,
    prePeriodGrouped,
    periodGrouped,
    reconciliations,
    statements,
  ] = await Promise.all([
    db.bankTransaction.findMany({
      where: transactionWhere,
      orderBy: [
        {
          transactionDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 2500,
      select: {
        id: true,
        bankAccountId: true,
        type: true,
        direction: true,
        status: true,
        amount: true,
        currency: true,
        transactionDate: true,
        valueDate: true,
        reference: true,
        description: true,
        notes: true,
        reconciliationId: true,
        reconciledAt: true,
        transferGroupId: true,

        bankAccount: {
          select: {
            name: true,
            currency: true,
          },
        },

        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },

        payment: {
          select: {
            id: true,
          },
        },

        supplierPayablePayment: {
          select: {
            id: true,
            payable: {
              select: {
                title: true,
                supplierNameSnapshot: true,
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

        refund: {
          select: {
            id: true,
            booking: {
              select: {
                bookingReference: true,
                bookingDisplayCode: true,
              },
            },
          },
        },

        statementLine: {
          select: {
            id: true,
            bankStatementId: true,
          },
        },
      },
    }),

    from && accountIds.length > 0
      ? db.bankTransaction.groupBy({
          by: ["bankAccountId", "direction"],
          where: {
            bankAccountId: {
              in: accountIds,
            },
            status: BankTransactionStatus.POSTED,
            type: {
              not: BankTransactionType.OPENING_BALANCE,
            },
            transactionDate: {
              lt: from,
            },
          },
          _sum: {
            amount: true,
          },
        })
      : Promise.resolve([]),

    accountIds.length > 0
      ? db.bankTransaction.groupBy({
          by: ["bankAccountId", "direction"],
          where: {
            bankAccountId: {
              in: accountIds,
            },
            status: BankTransactionStatus.POSTED,
            type: {
              not: BankTransactionType.OPENING_BALANCE,
            },
            ...(from || to
              ? {
                  transactionDate: {
                    ...(from ? { gte: from } : {}),
                    ...(to ? { lte: to } : {}),
                  },
                }
              : {}),
          },
          _sum: {
            amount: true,
          },
        })
      : Promise.resolve([]),

    db.bankReconciliation.findMany({
      where: {
        bankAccountId: {
          in: accountIds,
        },
        ...(reconciliationStatus
          ? {
              status: reconciliationStatus,
            }
          : {}),
      },
      orderBy: {
        statementDate: "desc",
      },
      select: {
        id: true,
        bankAccountId: true,
        statementDate: true,
        statementClosingBalance: true,
        ledgerClosingBalance: true,
        difference: true,
        status: true,
        reconciledAt: true,
        lockedAt: true,
      },
    }),

    db.bankStatement.findMany({
      where: {
        bankAccountId: {
          in: accountIds,
        },
      },
      orderBy: {
        statementDate: "desc",
      },
      select: {
        id: true,
        bankAccountId: true,
        statementDate: true,
        closingBalance: true,
        status: true,
      },
    }),
  ]);

  const preMap = new Map<
    string,
    {
      incoming: number;
      outgoing: number;
    }
  >();

  for (const row of prePeriodGrouped) {
    const current = preMap.get(row.bankAccountId) ?? {
      incoming: 0,
      outgoing: 0,
    };

    const amount = Number(row._sum.amount ?? 0);

    if (row.direction === BankTransactionDirection.IN) {
      current.incoming += amount;
    } else {
      current.outgoing += amount;
    }

    preMap.set(row.bankAccountId, current);
  }

  const periodMap = new Map<
    string,
    {
      incoming: number;
      outgoing: number;
    }
  >();

  for (const row of periodGrouped) {
    const current = periodMap.get(row.bankAccountId) ?? {
      incoming: 0,
      outgoing: 0,
    };

    const amount = Number(row._sum.amount ?? 0);

    if (row.direction === BankTransactionDirection.IN) {
      current.incoming += amount;
    } else {
      current.outgoing += amount;
    }

    periodMap.set(row.bankAccountId, current);
  }

  const visibleAccounts = selectedAccount
    ? accounts.filter((account) => account.id === selectedAccount)
    : accounts;

  const accountCards = visibleAccounts.map((account) => {
    const before = preMap.get(account.id) ?? {
      incoming: 0,
      outgoing: 0,
    };

    const period = periodMap.get(account.id) ?? {
      incoming: 0,
      outgoing: 0,
    };

    const opening =
      account.openingBalance +
      before.incoming -
      before.outgoing;

    const calculatedClosing =
      opening +
      period.incoming -
      period.outgoing;

    const latestReconciliation = reconciliations.find(
      (item) => item.bankAccountId === account.id,
    );

    const latestStatement = statements.find(
      (item) => item.bankAccountId === account.id,
    );

    return {
      ...account,
      opening,
      incoming: period.incoming,
      outgoing: period.outgoing,
      calculatedClosing,
      differenceToStored:
        calculatedClosing - account.currentBalance,
      latestReconciliation,
      latestStatement,
    };
  });

  const typeBreakdown = new Map<
    string,
    Map<
      string,
      {
        incoming: number;
        outgoing: number;
      }
    >
  >();

  for (const transaction of transactions) {
    if (transaction.status !== BankTransactionStatus.POSTED) {
      continue;
    }

    const currencyMap =
      typeBreakdown.get(transaction.type) ??
      new Map<
        string,
        {
          incoming: number;
          outgoing: number;
        }
      >();

    const current =
      currencyMap.get(transaction.currency) ?? {
        incoming: 0,
        outgoing: 0,
      };

    const amount = Number(transaction.amount);

    if (transaction.direction === BankTransactionDirection.IN) {
      current.incoming += amount;
    } else {
      current.outgoing += amount;
    }

    currencyMap.set(transaction.currency, current);
    typeBreakdown.set(transaction.type, currencyMap);
  }

  const exportParams = new URLSearchParams();

  if (params.from) exportParams.set("from", params.from);
  if (params.to) exportParams.set("to", params.to);
  if (selectedAccount) {
    exportParams.set("bankAccountId", selectedAccount);
  }
  if (type) exportParams.set("type", type);
  if (direction) exportParams.set("direction", direction);
  if (reconciliationStatus) {
    exportParams.set(
      "reconciliationStatus",
      reconciliationStatus,
    );
  }
  if (q) exportParams.set("q", q);

  const exportHref =
    `/api/admin/finance/reports/cash-bank?${exportParams.toString()}`;

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Cash & Bank Report
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Bank and cash positions, posted inflows and outflows, account
            movements, statement status, and reconciliation control.
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
          <FilterField label="From">
            <input
              name="from"
              type="date"
              defaultValue={params.from || ""}
              className={inputClass}
            />
          </FilterField>

          <FilterField label="To">
            <input
              name="to"
              type="date"
              defaultValue={params.to || ""}
              className={inputClass}
            />
          </FilterField>

          <FilterField label="Account">
            <select
              name="bankAccountId"
              defaultValue={selectedAccount || ""}
              className={inputClass}
            >
              <option value="">All accounts</option>

              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Transaction Type">
            <select
              name="type"
              defaultValue={type || ""}
              className={inputClass}
            >
              <option value="">All types</option>

              {Object.values(BankTransactionType).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Direction">
            <select
              name="direction"
              defaultValue={direction || ""}
              className={inputClass}
            >
              <option value="">All directions</option>

              {Object.values(BankTransactionDirection).map(
                (value) => (
                  <option key={value} value={value}>
                    {enumLabel(value)}
                  </option>
                ),
              )}
            </select>
          </FilterField>

          <FilterField label="Reconciliation">
            <select
              name="reconciliationStatus"
              defaultValue={reconciliationStatus || ""}
              className={inputClass}
            >
              <option value="">All statuses</option>

              {Object.values(BankReconciliationStatus).map(
                (value) => (
                  <option key={value} value={value}>
                    {enumLabel(value)}
                  </option>
                ),
              )}
            </select>
          </FilterField>

          <FilterField label="Search">
            <input
              name="q"
              defaultValue={q}
              placeholder="Reference, booking..."
              className={inputClass}
            />
          </FilterField>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Link
            href="/admin/finance/reports/cash-bank"
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

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {accountCards.map((account) => (
          <div
            key={account.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#001F3F]">
                  {account.name}
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  {account.currency}
                  {!account.isActive ? " · Inactive" : ""}
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  account.isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {account.isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            <div className="mt-5 grid gap-2 text-sm">
              <PositionRow
                label="Opening Position"
                value={money(account.opening, account.currency)}
              />

              <PositionRow
                label="Posted In"
                value={money(account.incoming, account.currency)}
                positive
              />

              <PositionRow
                label="Posted Out"
                value={money(account.outgoing, account.currency)}
                negative
              />

              <div className="border-t border-slate-200 pt-2">
                <PositionRow
                  label="Calculated Closing"
                  value={money(
                    account.calculatedClosing,
                    account.currency,
                  )}
                  strong
                />
              </div>

              <PositionRow
                label="Stored Current Balance"
                value={money(
                  account.currentBalance,
                  account.currency,
                )}
              />

              <PositionRow
                label="Stored Difference"
                value={money(
                  account.differenceToStored,
                  account.currency,
                )}
                warning={
                  Math.abs(account.differenceToStored) >= 0.005
                }
              />
            </div>

            <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Latest Statement
                </p>

                {account.latestStatement ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatDate(
                        account.latestStatement.statementDate,
                      )}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {enumLabel(account.latestStatement.status)}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">
                    None
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Latest Reconciliation
                </p>

                {account.latestReconciliation ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {formatDate(
                        account.latestReconciliation.statementDate,
                      )}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {enumLabel(
                        account.latestReconciliation.status,
                      )}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">
                    None
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      {typeBreakdown.size > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Transaction Type Breakdown
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[...typeBreakdown.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([transactionType, currencyMap]) => (
                <div
                  key={transactionType}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {enumLabel(transactionType)}
                  </p>

                  <div className="mt-3 space-y-2">
                    {[...currencyMap.entries()].map(
                      ([currency, values]) => (
                        <div
                          key={currency}
                          className="border-t border-slate-200 pt-2 first:border-t-0 first:pt-0"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {currency}
                          </p>

                          <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                            <span className="text-emerald-700">
                              In {money(values.incoming, currency)}
                            </span>

                            <span className="text-red-700">
                              Out {money(values.outgoing, currency)}
                            </span>
                          </div>
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
          <strong>Cash position basis:</strong> account opening balance plus
          POSTED inflows less POSTED outflows. OPENING_BALANCE transaction
          records are excluded from movement totals because the account opening
          balance is already stored directly on BankAccount.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Cash & Bank Transactions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Showing {transactions.length} transaction
            {transactions.length === 1 ? "" : "s"}. Maximum 2,500 records on
            screen.
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No bank transactions match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1900px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Statement</th>
                  <th className="px-4 py-3">Reconciliation</th>
                  <th className="px-4 py-3 text-right">In</th>
                  <th className="px-4 py-3 text-right">Out</th>
                  <th className="px-4 py-3">Transfer Group</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => {
                  const incoming =
                    transaction.direction ===
                    BankTransactionDirection.IN;

                  const source =
                    transaction.booking
                      ? transaction.booking.bookingDisplayCode ||
                        transaction.booking.bookingReference
                      : transaction.supplierPayablePayment
                        ? `${transaction.supplierPayablePayment.payable.supplierNameSnapshot} · ${transaction.supplierPayablePayment.payable.title}`
                        : transaction.expense
                          ? transaction.expense.vendorName
                            ? `${transaction.expense.title} · ${transaction.expense.vendorName}`
                            : transaction.expense.title
                          : transaction.refund
                            ? transaction.refund.booking
                                .bookingDisplayCode ||
                              transaction.refund.booking
                                .bookingReference
                            : transaction.payment
                              ? "Customer payment"
                              : "-";

                  return (
                    <tr key={transaction.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-4">
                        {formatDate(transaction.transactionDate)}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#001F3F]">
                          {transaction.bankAccount.name}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {transaction.currency}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {enumLabel(transaction.type)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            transaction.status ===
                            BankTransactionStatus.POSTED
                              ? "bg-emerald-100 text-emerald-800"
                              : transaction.status ===
                                  BankTransactionStatus.REVERSED
                                ? "bg-purple-100 text-purple-800"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {enumLabel(transaction.status)}
                        </span>
                      </td>

                      <td className="max-w-[300px] px-4 py-4 text-slate-700">
                        {transaction.description || "-"}
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        {transaction.reference || "-"}
                      </td>

                      <td className="max-w-[280px] px-4 py-4 text-slate-600">
                        {source}
                      </td>

                      <td className="px-4 py-4">
                        {transaction.statementLine ? (
                          <Link
                            href={`/admin/finance/bank-statements/${transaction.statementLine.bankStatementId}`}
                            className="font-semibold text-blue-700 hover:underline"
                          >
                            Matched
                          </Link>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {transaction.reconciliationId ? (
                          <Link
                            href={`/admin/finance/reconciliation/${transaction.reconciliationId}`}
                            className="font-semibold text-blue-700 hover:underline"
                          >
                            Open
                          </Link>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-emerald-700">
                        {incoming
                          ? money(
                              Number(transaction.amount),
                              transaction.currency,
                            )
                          : "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-red-700">
                        {!incoming
                          ? money(
                              Number(transaction.amount),
                              transaction.currency,
                            )
                          : "-"}
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-500">
                        {transaction.transferGroupId || "-"}
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

function PositionRow({
  label,
  value,
  positive = false,
  negative = false,
  strong = false,
  warning = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  strong?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>

      <span
        className={
          warning
            ? "font-bold text-amber-700"
            : strong
              ? "font-bold text-[#001F3F]"
              : positive
                ? "font-semibold text-emerald-700"
                : negative
                  ? "font-semibold text-red-700"
                  : "font-medium text-slate-700"
        }
      >
        {value}
      </span>
    </div>
  );
}

const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
