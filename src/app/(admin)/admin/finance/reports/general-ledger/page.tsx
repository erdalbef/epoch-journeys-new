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

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function validEnum<T extends Record<string, string>>(
  source: T,
  value: string | undefined,
): T[keyof T] | undefined {
  if (!value) {
    return undefined;
  }

  const values = Object.values(source);

  return values.includes(value) ? (value as T[keyof T]) : undefined;
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

function formatDate(value: Date) {
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

  return "-";
}

export default async function GeneralLedgerPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = await searchParams;

  const from = parseDateStart(params.from);
  const to = parseDateEnd(params.to);

  const selectedType = validEnum(
    BankTransactionType,
    params.type,
  );

  const selectedDirection = validEnum(
    BankTransactionDirection,
    params.direction,
  );

  const selectedStatus = validEnum(
    BankTransactionStatus,
    params.status,
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
      isActive: true,
    },
  });

  const selectedAccount =
    params.bankAccountId &&
    accounts.some((account) => account.id === params.bankAccountId)
      ? params.bankAccountId
      : undefined;

  const dateWhere: Prisma.BankTransactionWhereInput = {
    ...(from || to
      ? {
          transactionDate: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const rowWhere: Prisma.BankTransactionWhereInput = {
    ...dateWhere,
    ...(selectedAccount
      ? {
          bankAccountId: selectedAccount,
        }
      : {}),
    ...(selectedType
      ? {
          type: selectedType,
        }
      : {}),
    ...(selectedDirection
      ? {
          direction: selectedDirection,
        }
      : {}),
    ...(selectedStatus
      ? {
          status: selectedStatus,
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

  const positionAccounts = selectedAccount
    ? accounts.filter((account) => account.id === selectedAccount)
    : accounts;

  const accountIds = positionAccounts.map((account) => account.id);

  const [transactions, prePeriodRows, periodRows] = await Promise.all([
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
          by: [
            "bankAccountId",
            "direction",
          ],
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
  ]);

  const preMap = new Map<
    string,
    {
      incoming: number;
      outgoing: number;
    }
  >();

  for (const row of prePeriodRows) {
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

  for (const row of periodRows) {
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

  const positions = new Map<string, Position>();

  for (const account of positionAccounts) {
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

    positions.set(account.id, {
      opening,
      incoming: period.incoming,
      outgoing: period.outgoing,
      closing:
        opening +
        period.incoming -
        period.outgoing,
    });
  }

  const running = new Map<string, number>();

  for (const account of positionAccounts) {
    running.set(
      account.id,
      positions.get(account.id)?.opening ?? account.openingBalance,
    );
  }

  const rows = transactions.map((transaction) => {
    let runningBalance = running.get(transaction.bankAccountId) ?? 0;

    if (
      transaction.status === BankTransactionStatus.POSTED &&
      transaction.type !== BankTransactionType.OPENING_BALANCE
    ) {
      runningBalance +=
        transaction.direction === BankTransactionDirection.IN
          ? Number(transaction.amount)
          : -Number(transaction.amount);

      running.set(transaction.bankAccountId, runningBalance);
    }

    return {
      ...transaction,
      amountNumber: Number(transaction.amount),
      runningBalance,
    };
  });

  const query = new URLSearchParams();

  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (selectedAccount) query.set("bankAccountId", selectedAccount);
  if (selectedType) query.set("type", selectedType);
  if (selectedDirection) query.set("direction", selectedDirection);
  if (selectedStatus) query.set("status", selectedStatus);
  if (q) query.set("q", q);

  const exportHref =
    `/api/admin/finance/reports/general-ledger?${query.toString()}`;

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance Reports
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            General Ledger
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Posted bank and cash activity with account opening position,
            period inflows and outflows, running balance, source references,
            statement matching, and reconciliation status.
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

          <FilterField label="Type">
            <select
              name="type"
              defaultValue={selectedType || ""}
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
              defaultValue={selectedDirection || ""}
              className={inputClass}
            >
              <option value="">All directions</option>

              {Object.values(BankTransactionDirection).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Status">
            <select
              name="status"
              defaultValue={selectedStatus || ""}
              className={inputClass}
            >
              <option value="">All statuses</option>

              {Object.values(BankTransactionStatus).map((value) => (
                <option key={value} value={value}>
                  {enumLabel(value)}
                </option>
              ))}
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
            href="/admin/finance/reports/general-ledger"
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {positionAccounts.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            No bank accounts available.
          </div>
        ) : (
          positionAccounts.map((account) => {
            const position = positions.get(account.id)!;

            return (
              <div
                key={account.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="font-bold text-[#001F3F]">{account.name}</p>

                <p className="mt-0.5 text-xs text-slate-400">
                  {account.currency}
                  {!account.isActive ? " · Inactive" : ""}
                </p>

                <div className="mt-4 space-y-2 text-sm">
                  <PositionRow
                    label="Opening"
                    value={money(position.opening, account.currency)}
                  />
                  <PositionRow
                    label="Posted In"
                    value={money(position.incoming, account.currency)}
                    positive
                  />
                  <PositionRow
                    label="Posted Out"
                    value={money(position.outgoing, account.currency)}
                    negative
                  />

                  <div className="border-t border-slate-200 pt-2">
                    <PositionRow
                      label="Closing"
                      value={money(position.closing, account.currency)}
                      strong
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs leading-5 text-blue-800">
          <strong>Position cards</strong> always use all POSTED ledger
          transactions for the selected account and date period. Type,
          direction, status, and text filters affect the transaction table,
          but do not distort the true account opening and closing position.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#001F3F]">
                Ledger Transactions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Showing {rows.length} transaction{rows.length === 1 ? "" : "s"}.
                Maximum 2,000 rows on screen; use CSV export for the complete
                filtered result.
              </p>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No ledger transactions match the selected filters.
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
                  <th className="px-4 py-3 text-right">Debit / Out</th>
                  <th className="px-4 py-3 text-right">Credit / In</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                  <th className="px-4 py-3">Created By</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((transaction) => {
                  const incoming =
                    transaction.direction === BankTransactionDirection.IN;

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

                      <td className="max-w-[300px] px-4 py-4 text-slate-600">
                        {sourceLabel(transaction)}
                      </td>

                      <td className="px-4 py-4">
                        {transaction.statementLine ? (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-800">
                            Matched
                          </span>
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
                            Reconciled
                          </Link>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-red-700">
                        {!incoming
                          ? money(
                              transaction.amountNumber,
                              transaction.currency,
                            )
                          : "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-emerald-700">
                        {incoming
                          ? money(
                              transaction.amountNumber,
                              transaction.currency,
                            )
                          : "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right font-bold text-[#001F3F]">
                        {money(
                          transaction.runningBalance,
                          transaction.currency,
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        {transaction.createdBy?.fullName ||
                          transaction.createdBy?.email ||
                          "-"}
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
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>

      <span
        className={
          strong
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
