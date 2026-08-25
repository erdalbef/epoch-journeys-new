import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BankReconciliationStatus,
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

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function parseDateEnd(value: string | undefined) {
  if (!value) return null;

  const date = new Date(
    `${value}T23:59:59.999Z`,
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function validEnum<
  T extends Record<string, string>,
>(
  source: T,
  value: string | undefined,
): T[keyof T] | undefined {
  if (!value) return undefined;

  return Object.values(source).includes(
    value,
  )
    ? (value as T[keyof T])
    : undefined;
}

function money(
  value: number,
  currency: string,
) {
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

function formatDate(
  value: Date | null | undefined,
) {
  if (!value) return "—";

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
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
}

function reconciliationClass(
  status: BankReconciliationStatus | undefined,
) {
  switch (status) {
    case BankReconciliationStatus.RECONCILED:
      return "bg-green-100 text-green-700";

    case BankReconciliationStatus.LOCKED:
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default async function CashBankReportPage({
  searchParams,
}: PageProps) {
  const session =
    await getServerSession(
      authOptions,
    );

  if (
    !session?.user ||
    session.user.role !== Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const params = await searchParams;

  const from =
    parseDateStart(
      params.from,
    );

  const to =
    parseDateEnd(
      params.to,
    );

  const type =
    validEnum(
      BankTransactionType,
      params.type,
    );

  const direction =
    validEnum(
      BankTransactionDirection,
      params.direction,
    );

  const reconciliationStatus =
    validEnum(
      BankReconciliationStatus,
      params.reconciliationStatus,
    );

  const q =
    params.q?.trim() || "";

  // ==========================================================
  // BANK ACCOUNTS
  // ==========================================================

  const accounts =
    await db.bankAccount.findMany({
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
    accounts.some(
      (account) =>
        account.id ===
        params.bankAccountId,
    )
      ? params.bankAccountId
      : undefined;

  const accountIds =
    selectedAccount
      ? [selectedAccount]
      : accounts.map(
          (account) =>
            account.id,
        );

  // ==========================================================
  // TRANSACTION FILTER
  // ==========================================================

  const transactionWhere:
    Prisma.BankTransactionWhereInput = {
    ...(selectedAccount
      ? {
          bankAccountId:
            selectedAccount,
        }
      : {}),

    ...(from || to
      ? {
          transactionDate: {
            ...(from
              ? {
                  gte: from,
                }
              : {}),

            ...(to
              ? {
                  lte: to,
                }
              : {}),
          },
        }
      : {}),

    ...(type
      ? {
          type,
        }
      : {}),

    ...(direction
      ? {
          direction,
        }
      : {}),

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

  // ==========================================================
  // DATA
  // ==========================================================

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
          by: [
            "bankAccountId",
            "direction",
          ],

          where: {
            bankAccountId: {
              in: accountIds,
            },

            status:
              BankTransactionStatus.POSTED,

            type: {
              not:
                BankTransactionType.OPENING_BALANCE,
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
          by: [
            "bankAccountId",
            "direction",
          ],

          where: {
            bankAccountId: {
              in: accountIds,
            },

            status:
              BankTransactionStatus.POSTED,

            type: {
              not:
                BankTransactionType.OPENING_BALANCE,
            },

            ...(from || to
              ? {
                  transactionDate: {
                    ...(from
                      ? {
                          gte: from,
                        }
                      : {}),

                    ...(to
                      ? {
                          lte: to,
                        }
                      : {}),
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
              status:
                reconciliationStatus,
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

        statementClosingBalance:
          true,

        ledgerClosingBalance:
          true,

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

  // ==========================================================
  // PRE-PERIOD MOVEMENT
  // ==========================================================

  const preMap = new Map<
    string,
    {
      incoming: number;
      outgoing: number;
    }
  >();

  for (const row of prePeriodGrouped) {
    const current =
      preMap.get(
        row.bankAccountId,
      ) ?? {
        incoming: 0,
        outgoing: 0,
      };

    const amount =
      Number(
        row._sum.amount ?? 0,
      );

    if (
      row.direction ===
      BankTransactionDirection.IN
    ) {
      current.incoming += amount;
    } else {
      current.outgoing += amount;
    }

    preMap.set(
      row.bankAccountId,
      current,
    );
  }

  // ==========================================================
  // PERIOD MOVEMENT
  // ==========================================================

  const periodMap = new Map<
    string,
    {
      incoming: number;
      outgoing: number;
    }
  >();

  for (const row of periodGrouped) {
    const current =
      periodMap.get(
        row.bankAccountId,
      ) ?? {
        incoming: 0,
        outgoing: 0,
      };

    const amount =
      Number(
        row._sum.amount ?? 0,
      );

    if (
      row.direction ===
      BankTransactionDirection.IN
    ) {
      current.incoming += amount;
    } else {
      current.outgoing += amount;
    }

    periodMap.set(
      row.bankAccountId,
      current,
    );
  }

  // ==========================================================
  // ACCOUNT CARDS
  // ==========================================================

  const visibleAccounts =
    selectedAccount
      ? accounts.filter(
          (account) =>
            account.id ===
            selectedAccount,
        )
      : accounts;

  const accountCards =
    visibleAccounts.map(
      (account) => {
        const before =
          preMap.get(account.id) ?? {
            incoming: 0,
            outgoing: 0,
          };

        const period =
          periodMap.get(account.id) ?? {
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

        const latestReconciliation =
          reconciliations.find(
            (item) =>
              item.bankAccountId ===
              account.id,
          );

        const latestStatement =
          statements.find(
            (item) =>
              item.bankAccountId ===
              account.id,
          );

        return {
          ...account,

          opening,

          incoming:
            period.incoming,

          outgoing:
            period.outgoing,

          calculatedClosing,

          differenceToStored:
            calculatedClosing -
            account.currentBalance,

          latestReconciliation,

          latestStatement,
        };
      },
    );

  // ==========================================================
  // TRANSACTION TYPE BREAKDOWN
  // ==========================================================

  const typeBreakdown =
    new Map<
      string,
      Map<
        string,
        {
          incoming: number;
          outgoing: number;
        }
      >
    >();

  for (
    const transaction of
    transactions
  ) {
    if (
      transaction.status !==
      BankTransactionStatus.POSTED
    ) {
      continue;
    }

    const currencyMap =
      typeBreakdown.get(
        transaction.type,
      ) ??
      new Map<
        string,
        {
          incoming: number;
          outgoing: number;
        }
      >();

    const current =
      currencyMap.get(
        transaction.currency,
      ) ?? {
        incoming: 0,
        outgoing: 0,
      };

    const amount =
      Number(
        transaction.amount,
      );

    if (
      transaction.direction ===
      BankTransactionDirection.IN
    ) {
      current.incoming += amount;
    } else {
      current.outgoing += amount;
    }

    currencyMap.set(
      transaction.currency,
      current,
    );

    typeBreakdown.set(
      transaction.type,
      currencyMap,
    );
  }

  // ==========================================================
  // EXPORT
  // ==========================================================

  const exportParams =
    new URLSearchParams();

  if (params.from) {
    exportParams.set(
      "from",
      params.from,
    );
  }

  if (params.to) {
    exportParams.set(
      "to",
      params.to,
    );
  }

  if (selectedAccount) {
    exportParams.set(
      "bankAccountId",
      selectedAccount,
    );
  }

  if (type) {
    exportParams.set(
      "type",
      type,
    );
  }

  if (direction) {
    exportParams.set(
      "direction",
      direction,
    );
  }

  if (reconciliationStatus) {
    exportParams.set(
      "reconciliationStatus",
      reconciliationStatus,
    );
  }

  if (q) {
    exportParams.set(
      "q",
      q,
    );
  }

  const exportHref =
    `/api/admin/finance/reports/cash-bank?${exportParams.toString()}`;

  const secondaryButton =
    "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";

  const primaryButton =
    "rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002d5a]";

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Cash & Bank Report
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
            Bank and cash positions, posted inflows and outflows,
            account movements, statement status and reconciliation
            control.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance/reports"
            className={secondaryButton}
          >
            ← Back to Reports
          </Link>

          <a
            href={exportHref}
            className={secondaryButton}
          >
            Export Report
          </a>

          <Link
            href="/admin/finance/bank-accounts"
            className={primaryButton}
          >
            Bank Accounts
          </Link>
        </div>
      </div>

      {/* FILTERS */}

      <form className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <div className="xl:col-span-2">
            <label
              htmlFor="q"
              className="text-sm font-semibold text-slate-700"
            >
              Search
            </label>

            <input
              id="q"
              name="q"
              type="text"
              defaultValue={q}
              placeholder="Reference, description, booking or notes"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="from"
              className="text-sm font-semibold text-slate-700"
            >
              From
            </label>

            <input
              id="from"
              name="from"
              type="date"
              defaultValue={
                params.from || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="text-sm font-semibold text-slate-700"
            >
              To
            </label>

            <input
              id="to"
              name="to"
              type="date"
              defaultValue={
                params.to || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="bankAccountId"
              className="text-sm font-semibold text-slate-700"
            >
              Bank Account
            </label>

            <select
              id="bankAccountId"
              name="bankAccountId"
              defaultValue={
                selectedAccount || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All Accounts
              </option>

              {accounts.map(
                (account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name} · {account.currency}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="type"
              className="text-sm font-semibold text-slate-700"
            >
              Transaction Type
            </label>

            <select
              id="type"
              name="type"
              defaultValue={type || ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All Types
              </option>

              {Object.values(
                BankTransactionType,
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="direction"
              className="text-sm font-semibold text-slate-700"
            >
              Direction
            </label>

            <select
              id="direction"
              name="direction"
              defaultValue={
                direction || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                BankTransactionDirection,
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label
              htmlFor="reconciliationStatus"
              className="text-sm font-semibold text-slate-700"
            >
              Reconciliation Status
            </label>

            <select
              id="reconciliationStatus"
              name="reconciliationStatus"
              defaultValue={
                reconciliationStatus ||
                ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                BankReconciliationStatus,
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
            >
              Apply Filters
            </button>

            <Link
              href="/admin/finance/reports/cash-bank"
              className={secondaryButton}
            >
              Clear
            </Link>
          </div>
        </div>
      </form>

      {/* BANK ACCOUNT POSITIONS */}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Bank Account Positions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Calculated opening and closing balances for the selected
            reporting period.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {accountCards.map(
            (account) => (
              <div
                key={account.id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#001F3F]">
                      {account.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {account.isActive
                        ? "Active account"
                        : "Inactive account"}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {account.currency}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-500">
                      Opening
                    </p>

                    <p className="mt-1 font-bold text-[#001F3F]">
                      {money(
                        account.opening,
                        account.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-3">
                    <p className="text-xs font-medium text-green-700">
                      Incoming
                    </p>

                    <p className="mt-1 font-bold text-green-900">
                      {money(
                        account.incoming,
                        account.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs font-medium text-red-700">
                      Outgoing
                    </p>

                    <p className="mt-1 font-bold text-red-900">
                      {money(
                        account.outgoing,
                        account.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-3">
                    <p className="text-xs font-medium text-blue-700">
                      Calculated Closing
                    </p>

                    <p className="mt-1 font-bold text-blue-900">
                      {money(
                        account.calculatedClosing,
                        account.currency,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">
                      Stored Balance
                    </p>

                    <p className="mt-1 font-semibold text-[#001F3F]">
                      {money(
                        account.currentBalance,
                        account.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">
                      Difference
                    </p>

                    <p
                      className={`mt-1 font-semibold ${
                        Math.abs(
                          account.differenceToStored,
                        ) < 0.005
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {money(
                        account.differenceToStored,
                        account.currency,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-slate-500">
                      Latest Statement
                    </p>

                    <p className="mt-1 font-semibold text-[#001F3F]">
                      {account.latestStatement
                        ? formatDate(
                            account.latestStatement
                              .statementDate,
                          )
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Latest Reconciliation
                      </p>

                      {account.latestReconciliation ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${reconciliationClass(
                              account.latestReconciliation
                                .status,
                            )}`}
                          >
                            {enumLabel(
                              account.latestReconciliation
                                .status,
                            )}
                          </span>

                          <span className="text-xs text-slate-500">
                            {formatDate(
                              account.latestReconciliation
                                .statementDate,
                            )}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-slate-500">
                          No reconciliation recorded.
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/admin/finance/bank-accounts/${account.id}`}
                      className="text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Open Account
                    </Link>
                  </div>
                </div>
              </div>
            ),
          )}

          {accountCards.length === 0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500 xl:col-span-2">
              No bank accounts are available.
            </div>
          ) : null}
        </div>
      </section>

      {/* TYPE BREAKDOWN */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Transaction Type Breakdown
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Posted bank activity grouped by transaction type and
            currency.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Type
                </th>

                <th className="px-3 py-3 font-medium">
                  Currency
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Incoming
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Outgoing
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Net Movement
                </th>
              </tr>
            </thead>

            <tbody>
              {Array.from(
                typeBreakdown.entries(),
              ).flatMap(
                ([transactionType, currencyMap]) =>
                  Array.from(
                    currencyMap.entries(),
                  ).map(
                    ([currency, values]) => (
                      <tr
                        key={`${transactionType}-${currency}`}
                        className="border-t"
                      >
                        <td className="px-3 py-3 font-medium text-[#001F3F]">
                          {enumLabel(
                            transactionType,
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {currency}
                        </td>

                        <td className="px-3 py-3 text-right font-semibold text-green-700">
                          {money(
                            values.incoming,
                            currency,
                          )}
                        </td>

                        <td className="px-3 py-3 text-right font-semibold text-red-700">
                          {money(
                            values.outgoing,
                            currency,
                          )}
                        </td>

                        <td
                          className={`px-3 py-3 text-right font-semibold ${
                            values.incoming -
                              values.outgoing >=
                            0
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {money(
                            values.incoming -
                              values.outgoing,
                            currency,
                          )}
                        </td>
                      </tr>
                    ),
                  ),
              )}

              {typeBreakdown.size === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-slate-500"
                  >
                    No posted bank transactions match the selected
                    filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* TRANSACTION REGISTER */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Bank Transaction Register
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Detailed bank ledger activity matching the selected
              filters.
            </p>
          </div>

          <p className="text-sm font-medium text-slate-500">
            {transactions.length} transaction
            {transactions.length === 1
              ? ""
              : "s"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Date
                </th>

                <th className="px-3 py-3 font-medium">
                  Bank Account
                </th>

                <th className="px-3 py-3 font-medium">
                  Type
                </th>

                <th className="px-3 py-3 font-medium">
                  Reference
                </th>

                <th className="px-3 py-3 font-medium">
                  Description
                </th>

                <th className="px-3 py-3 font-medium">
                  Related Record
                </th>

                <th className="px-3 py-3 font-medium">
                  Reconciliation
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {transactions.map(
                (transaction) => {
                  const bookingReference =
                    transaction.booking
                      ?.bookingDisplayCode ||
                    transaction.booking
                      ?.bookingReference;

                  const refundReference =
                    transaction.refund?.booking
                      ?.bookingDisplayCode ||
                    transaction.refund?.booking
                      ?.bookingReference;

                  const supplierLabel =
                    transaction.supplierPayablePayment
                      ?.payable
                      .supplierNameSnapshot;

                  const expenseLabel =
                    transaction.expense?.vendorName ||
                    transaction.expense?.title;

                  const relatedRecord =
                    bookingReference
                      ? `Booking: ${bookingReference}`
                      : supplierLabel
                        ? `Supplier: ${supplierLabel}`
                        : expenseLabel
                          ? `Expense: ${expenseLabel}`
                          : refundReference
                            ? `Refund: ${refundReference}`
                            : transaction.transferGroupId
                              ? "Bank Transfer"
                              : "—";

                  return (
                    <tr
                      key={transaction.id}
                      className="border-t align-top"
                    >
                      <td className="whitespace-nowrap px-3 py-3">
                        {formatDate(
                          transaction.transactionDate,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-semibold text-[#001F3F]">
                          {transaction.bankAccount.name}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {transaction.currency}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {enumLabel(
                            transaction.type,
                          )}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {enumLabel(
                            transaction.status,
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {transaction.reference ||
                          "—"}
                      </td>

                      <td className="px-3 py-3">
                        <div className="max-w-72">
                          {transaction.description ||
                            "—"}
                        </div>

                        {transaction.notes ? (
                          <div className="mt-1 max-w-72 text-xs text-slate-500">
                            {transaction.notes}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-3 py-3">
                        {relatedRecord}
                      </td>

                      <td className="px-3 py-3">
                        {transaction.reconciliationId ? (
                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                            Reconciled
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Unreconciled
                          </span>
                        )}
                      </td>

                      <td
                        className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${
                          transaction.direction ===
                          BankTransactionDirection.IN
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {transaction.direction ===
                        BankTransactionDirection.IN
                          ? "+"
                          : "-"}

                        {money(
                          Number(
                            transaction.amount,
                          ),
                          transaction.currency,
                        )}
                      </td>
                    </tr>
                  );
                },
              )}

              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    No bank transactions match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* RECONCILIATION CONTROL */}

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#001F3F]">
                Reconciliations
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Bank statement and ledger reconciliation status.
              </p>
            </div>

            <Link
              href="/admin/finance/reconciliation"
              className="text-sm font-semibold text-[#8B0000] hover:underline"
            >
              Open Reconciliation
            </Link>
          </div>

          <div className="space-y-3">
            {reconciliations.slice(0, 10).map(
              (item) => {
                const account =
                  accounts.find(
                    (account) =>
                      account.id ===
                      item.bankAccountId,
                  );

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-[#001F3F]">
                          {account?.name ||
                            "Bank Account"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Statement:{" "}
                          {formatDate(
                            item.statementDate,
                          )}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${reconciliationClass(
                          item.status,
                        )}`}
                      >
                        {enumLabel(
                          item.status,
                        )}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-500">
                          Statement
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          {account
                            ? money(
                                Number(
                                  item.statementClosingBalance,
                                ),
                                account.currency,
                              )
                            : Number(
                                item.statementClosingBalance,
                              ).toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Ledger
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          {account
                            ? money(
                                Number(
                                  item.ledgerClosingBalance,
                                ),
                                account.currency,
                              )
                            : Number(
                                item.ledgerClosingBalance,
                              ).toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Difference
                        </p>

                        <p
                          className={`mt-1 text-sm font-semibold ${
                            Math.abs(
                              Number(
                                item.difference,
                              ),
                            ) < 0.005
                              ? "text-green-700"
                              : "text-red-700"
                          }`}
                        >
                          {account
                            ? money(
                                Number(
                                  item.difference,
                                ),
                                account.currency,
                              )
                            : Number(
                                item.difference,
                              ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              },
            )}

            {reconciliations.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No reconciliation records match the selected filters.
              </p>
            ) : null}
          </div>
        </div>

        {/* STATEMENTS */}

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#001F3F]">
                Bank Statements
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest imported bank statements.
              </p>
            </div>

            <Link
              href="/admin/finance/bank-statements"
              className="text-sm font-semibold text-[#8B0000] hover:underline"
            >
              Open Statements
            </Link>
          </div>

          <div className="space-y-3">
            {statements.slice(0, 10).map(
              (statement) => {
                const account =
                  accounts.find(
                    (account) =>
                      account.id ===
                      statement.bankAccountId,
                  );

                return (
                  <Link
                    key={statement.id}
                    href={`/admin/finance/bank-statements/${statement.id}`}
                    className="block rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-red-50"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-[#001F3F]">
                          {account?.name ||
                            "Bank Account"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(
                            statement.statementDate,
                          )}
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {enumLabel(
                          statement.status,
                        )}
                      </span>
                    </div>

                    <p className="mt-3 text-sm">
                      Closing Balance:{" "}
                      <span className="font-semibold">
                        {account
                          ? money(
                              Number(
                                statement.closingBalance,
                              ),
                              account.currency,
                            )
                          : Number(
                              statement.closingBalance,
                            ).toFixed(2)}
                      </span>
                    </p>
                  </Link>
                );
              },
            )}

            {statements.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No bank statements are available.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Bank accounts are always reported in their original currency.
        Different currencies are never combined. Calculated balances
        use the account opening balance plus posted bank ledger
        movements; opening-balance ledger entries themselves are
        excluded from movement totals.
      </p>
    </div>
  );
}