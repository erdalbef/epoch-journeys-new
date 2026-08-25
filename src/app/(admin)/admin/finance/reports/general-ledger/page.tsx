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

type SearchParams = Promise<{
  from?: string;
  to?: string;
  bankAccountId?: string;
  type?: string;
  direction?: string;
  status?: string;
  q?: string;
}>;

type PageProps = {
  searchParams: SearchParams;
};

type Position = {
  opening: number;
  incoming: number;
  outgoing: number;
  closing: number;
};

function parseDateStart(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function parseDateEnd(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999Z`);

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
  if (!value) {
    return undefined;
  }

  const values = Object.values(source);

  return values.includes(value)
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
  if (!value) {
    return "—";
  }

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

function sourceLabel(transaction: {
  booking: {
    bookingReference: string;
    bookingDisplayCode: string | null;
  } | null;

  payment: {
    id: string;
  } | null;

  supplierPayablePayment: {
    payable: {
      title: string;
      supplierNameSnapshot: string;
    };
  } | null;

  expense: {
    title: string;
    vendorName: string | null;
  } | null;

  refund: {
    booking: {
      bookingReference: string;
      bookingDisplayCode: string | null;
    };
  } | null;

  tour: {
    title: string;
  } | null;
}) {
  if (transaction.booking) {
    return (
      transaction.booking.bookingDisplayCode ||
      transaction.booking.bookingReference
    );
  }

  if (transaction.supplierPayablePayment) {
    return `${transaction.supplierPayablePayment.payable.supplierNameSnapshot} · ${transaction.supplierPayablePayment.payable.title}`;
  }

  if (transaction.expense) {
    return transaction.expense.vendorName
      ? `${transaction.expense.title} · ${transaction.expense.vendorName}`
      : transaction.expense.title;
  }

  if (transaction.refund) {
    return (
      transaction.refund.booking.bookingDisplayCode ||
      transaction.refund.booking.bookingReference
    );
  }

  if (transaction.tour) {
    return transaction.tour.title;
  }

  if (transaction.payment) {
    return "Customer payment";
  }

  return "—";
}

function transactionStatusClass(
  status: BankTransactionStatus,
) {
  switch (status) {
    case BankTransactionStatus.POSTED:
      return "bg-green-100 text-green-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function GeneralLedgerPage({
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

  const selectedType =
    validEnum(
      BankTransactionType,
      params.type,
    );

  const selectedDirection =
    validEnum(
      BankTransactionDirection,
      params.direction,
    );

  const selectedStatus =
    validEnum(
      BankTransactionStatus,
      params.status,
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
        isActive: true,
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

  // ==========================================================
  // FILTERS
  // ==========================================================

  const dateWhere:
    Prisma.BankTransactionWhereInput = {
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
  };

  const rowWhere:
    Prisma.BankTransactionWhereInput = {
    ...dateWhere,

    ...(selectedAccount
      ? {
          bankAccountId:
            selectedAccount,
        }
      : {}),

    ...(selectedType
      ? {
          type:
            selectedType,
        }
      : {}),

    ...(selectedDirection
      ? {
          direction:
            selectedDirection,
        }
      : {}),

    ...(selectedStatus
      ? {
          status:
            selectedStatus,
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

  const positionAccounts =
    selectedAccount
      ? accounts.filter(
          (account) =>
            account.id ===
            selectedAccount,
        )
      : accounts;

  const accountIds =
    positionAccounts.map(
      (account) =>
        account.id,
    );

  // ==========================================================
  // DATA
  // ==========================================================

  const [
    transactions,
    prePeriodRows,
    periodRows,
  ] = await Promise.all([
    db.bankTransaction.findMany({
      where: rowWhere,

      orderBy: [
        {
          bankAccountId: "asc",
        },
        {
          transactionDate: "asc",
        },
        {
          createdAt: "asc",
        },
      ],

      take: 2000,

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

        reconciledAt: true,
        reconciliationId: true,

        transferGroupId: true,

        bankAccount: {
          select: {
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

        booking: {
          select: {
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
            title: true,
            vendorName: true,
          },
        },

        refund: {
          select: {
            booking: {
              select: {
                bookingReference: true,
                bookingDisplayCode: true,
              },
            },
          },
        },

        tour: {
          select: {
            title: true,
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
  ]);

  // ==========================================================
  // PRE-PERIOD POSITION
  // ==========================================================

  const preMap = new Map<
    string,
    {
      incoming: number;
      outgoing: number;
    }
  >();

  for (const row of prePeriodRows) {
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

  for (const row of periodRows) {
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
  // ACCOUNT POSITIONS
  // ==========================================================

  const positions =
    new Map<
      string,
      Position
    >();

  for (const account of positionAccounts) {
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

    positions.set(account.id, {
      opening,

      incoming:
        period.incoming,

      outgoing:
        period.outgoing,

      closing:
        opening +
        period.incoming -
        period.outgoing,
    });
  }

  // ==========================================================
  // RUNNING BALANCE
  // ==========================================================

  const running =
    new Map<
      string,
      number
    >();

  for (const account of positionAccounts) {
    running.set(
      account.id,
      positions.get(account.id)?.opening ??
        account.openingBalance,
    );
  }

  const rows =
    transactions.map(
      (transaction) => {
        let runningBalance =
          running.get(
            transaction.bankAccountId,
          ) ?? 0;

        if (
          transaction.status ===
            BankTransactionStatus.POSTED &&
          transaction.type !==
            BankTransactionType.OPENING_BALANCE
        ) {
          runningBalance +=
            transaction.direction ===
            BankTransactionDirection.IN
              ? Number(
                  transaction.amount,
                )
              : -Number(
                  transaction.amount,
                );

          running.set(
            transaction.bankAccountId,
            runningBalance,
          );
        }

        return {
          ...transaction,

          amountNumber:
            Number(
              transaction.amount,
            ),

          runningBalance,
        };
      },
    );

  // ==========================================================
  // EXPORT
  // ==========================================================

  const query =
    new URLSearchParams();

  if (params.from) {
    query.set(
      "from",
      params.from,
    );
  }

  if (params.to) {
    query.set(
      "to",
      params.to,
    );
  }

  if (selectedAccount) {
    query.set(
      "bankAccountId",
      selectedAccount,
    );
  }

  if (selectedType) {
    query.set(
      "type",
      selectedType,
    );
  }

  if (selectedDirection) {
    query.set(
      "direction",
      selectedDirection,
    );
  }

  if (selectedStatus) {
    query.set(
      "status",
      selectedStatus,
    );
  }

  if (q) {
    query.set(
      "q",
      q,
    );
  }

  const exportHref =
    `/api/admin/finance/reports/general-ledger?${query.toString()}`;

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
            General Ledger
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Posted bank and cash activity with account opening
            position, period inflows and outflows, running balance,
            source references, statement matching and reconciliation
            status.
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
            Export Ledger
          </a>

          <Link
            href="/admin/finance/ledger"
            className={primaryButton}
          >
            Finance Ledger
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
              placeholder="Reference, booking, description or notes"
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
                selectedAccount ||
                ""
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
              defaultValue={
                selectedType || ""
              }
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
                selectedDirection ||
                ""
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
              htmlFor="status"
              className="text-sm font-semibold text-slate-700"
            >
              Transaction Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue={
                selectedStatus || ""
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">
                All
              </option>

              {Object.values(
                BankTransactionStatus,
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
              href="/admin/finance/reports/general-ledger"
              className={secondaryButton}
            >
              Clear
            </Link>
          </div>
        </div>
      </form>

      {/* ACCOUNT POSITIONS */}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Ledger Position by Bank Account
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Opening position and posted movement for the selected
            reporting period.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {positionAccounts.map(
            (account) => {
              const position =
                positions.get(
                  account.id,
                );

              if (!position) {
                return null;
              }

              return (
                <div
                  key={account.id}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
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

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
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
                          position.opening,
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
                          position.incoming,
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
                          position.outgoing,
                          account.currency,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-3">
                      <p className="text-xs font-medium text-blue-700">
                        Closing
                      </p>

                      <p className="mt-1 font-bold text-blue-900">
                        {money(
                          position.closing,
                          account.currency,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            },
          )}

          {positionAccounts.length === 0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500 xl:col-span-2">
              No bank accounts are available.
            </div>
          ) : null}
        </div>
      </section>

      {/* GENERAL LEDGER REGISTER */}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              General Ledger Register
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Chronological bank-ledger activity with running balance
              for each bank account.
            </p>
          </div>

          <p className="text-sm font-medium text-slate-500">
            {rows.length} transaction
            {rows.length === 1
              ? ""
              : "s"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1700px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3 font-medium">
                  Date
                </th>

                <th className="px-3 py-3 font-medium">
                  Value Date
                </th>

                <th className="px-3 py-3 font-medium">
                  Account
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
                  Source
                </th>

                <th className="px-3 py-3 font-medium">
                  Status
                </th>

                <th className="px-3 py-3 font-medium">
                  Matching
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Debit / Out
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Credit / In
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Running Balance
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (row) => (
                  <tr
                    key={row.id}
                    className="border-t align-top"
                  >
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDate(
                        row.transactionDate,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDate(
                        row.valueDate,
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-semibold text-[#001F3F]">
                        {row.bankAccount.name}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {row.currency}
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      {enumLabel(
                        row.type,
                      )}
                    </td>

                    <td className="px-3 py-3">
                      {row.reference ||
                        "—"}
                    </td>

                    <td className="px-3 py-3">
                      <div className="max-w-72">
                        {row.description ||
                          "—"}
                      </div>

                      {row.notes ? (
                        <div className="mt-1 max-w-72 text-xs text-slate-500">
                          {row.notes}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-3 py-3">
                      {sourceLabel(row)}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${transactionStatusClass(
                          row.status,
                        )}`}
                      >
                        {enumLabel(
                          row.status,
                        )}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      {row.reconciliationId ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                          Reconciled
                        </span>
                      ) : row.statementLine ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          Statement Matched
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Unmatched
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-red-700">
                      {row.direction ===
                      BankTransactionDirection.OUT
                        ? money(
                            row.amountNumber,
                            row.currency,
                          )
                        : "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-green-700">
                      {row.direction ===
                      BankTransactionDirection.IN
                        ? money(
                            row.amountNumber,
                            row.currency,
                          )
                        : "—"}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-[#001F3F]">
                      {money(
                        row.runningBalance,
                        row.currency,
                      )}
                    </td>
                  </tr>
                ),
              )}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-3 py-10 text-center text-slate-500"
                  >
                    No ledger transactions match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* CONTROL LINKS */}

      <section className="rounded-2xl border bg-slate-50 p-5">
        <div>
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Ledger Control
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Open the supporting banking tools to verify transactions
            and balances.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/finance/bank-accounts"
            className={secondaryButton}
          >
            Bank Accounts
          </Link>

          <Link
            href="/admin/finance/bank-statements"
            className={secondaryButton}
          >
            Bank Statements
          </Link>

          <Link
            href="/admin/finance/reconciliation"
            className={secondaryButton}
          >
            Reconciliation
          </Link>

          <Link
            href="/admin/finance/bank-transfers"
            className={secondaryButton}
          >
            Bank Transfers
          </Link>

          <Link
            href="/admin/finance/reports/cash-bank"
            className={secondaryButton}
          >
            Cash & Bank Report
          </Link>
        </div>
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Running balances are calculated separately for each bank
        account. Only posted transactions affect the running balance,
        and opening-balance ledger entries are excluded because the
        account opening balance is already used as the starting
        position. Different currencies are never combined.
      </p>
    </div>
  );
}