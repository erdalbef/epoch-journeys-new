"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BankReconciliationStatus,
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
} from "@prisma/client";
import { toast } from "sonner";

type RelatedTransaction = {
  id: string;
  type: BankTransactionType;
  direction: BankTransactionDirection;
  status: BankTransactionStatus;
  amount: number;
  currency: string;
  transactionDate: string;
  valueDate: string | null;
  reference: string | null;
  description: string | null;
  reconciledAt: string | null;

  booking: {
    id: string;
    bookingReference: string;
    bookingDisplayCode: string | null;
  } | null;

  supplierPayablePayment: {
    id: string;
    payable: {
      title: string;
      supplierNameSnapshot: string;
    };
  } | null;

  expense: {
    id: string;
    title: string;
    vendorName: string | null;
  } | null;

  refund: {
    id: string;
    booking: {
      bookingReference: string;
      bookingDisplayCode: string | null;
    };
  } | null;
};

type AvailableTransaction =
  RelatedTransaction & {
    reconciliationId: string | null;
  };

type Reconciliation = {
  id: string;
  statementDate: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  ledgerOpeningBalance: number;
  ledgerClosingBalance: number;
  difference: number;
  status: BankReconciliationStatus;
  reconciledAt: string | null;
  lockedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  bankAccount: {
    id: string;
    name: string;
    currency: string;
    openingBalance: number;
    isActive: boolean;
  };
};

type Props = {
  reconciliation: Reconciliation;
  previousStatementDate: string | null;
  matchedTransactions: RelatedTransaction[];
  availableTransactions: AvailableTransaction[];
};

function money(
  value: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }
    ).format(value);
  } catch {
    return `${currency} ${value.toFixed(
      2
    )}`;
  }
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "-";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function enumLabel(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function transactionContext(
  transaction: RelatedTransaction
) {
  if (transaction.booking) {
    return (
      transaction.booking
        .bookingDisplayCode ||
      transaction.booking
        .bookingReference
    );
  }

  if (
    transaction.supplierPayablePayment
  ) {
    return `${transaction.supplierPayablePayment.payable.supplierNameSnapshot} · ${transaction.supplierPayablePayment.payable.title}`;
  }

  if (transaction.expense) {
    return transaction.expense
      .vendorName
      ? `${transaction.expense.title} · ${transaction.expense.vendorName}`
      : transaction.expense.title;
  }

  if (transaction.refund) {
    return (
      transaction.refund.booking
        .bookingDisplayCode ||
      transaction.refund.booking
        .bookingReference
    );
  }

  return "-";
}

export default function ReconciliationManager({
  reconciliation,
  previousStatementDate,
  matchedTransactions,
  availableTransactions,
}: Props) {
  const router =
    useRouter();

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    workingTransactionId,
    setWorkingTransactionId,
  ] =
    useState<string | null>(
      null
    );

  /*
   * RECONCILED is now read-only.
   *
   * Once reconciled, the only remaining
   * action is Lock Reconciliation.
   */

  const reconciled =
    reconciliation.status ===
    BankReconciliationStatus.RECONCILED;

  const locked =
    reconciliation.status ===
    BankReconciliationStatus.LOCKED;

  const readOnly =
    reconciled || locked;

  const unmatchedTransactions =
    useMemo(
      () =>
        availableTransactions.filter(
          (transaction) =>
            transaction.reconciliationId !==
            reconciliation.id
        ),
      [
        availableTransactions,
        reconciliation.id,
      ]
    );

  const matchedIn =
    matchedTransactions
      .filter(
        (transaction) =>
          transaction.direction ===
          BankTransactionDirection.IN
      )
      .reduce(
        (sum, transaction) =>
          sum +
          transaction.amount,
        0
      );

  const matchedOut =
    matchedTransactions
      .filter(
        (transaction) =>
          transaction.direction ===
          BankTransactionDirection.OUT
      )
      .reduce(
        (sum, transaction) =>
          sum +
          transaction.amount,
        0
      );

  const openingDifference =
    reconciliation.statementOpeningBalance -
    reconciliation.ledgerOpeningBalance;

  async function patchReconciliation(
    payload: Record<
      string,
      unknown
    >
  ) {
    const response =
      await fetch(
        `/api/admin/finance/reconciliation/${reconciliation.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const data =
      (await response
        .json()
        .catch(
          () =>
            null
        )) as {
        success?: boolean;
        error?: string;
      } | null;

    if (
      !response.ok ||
      !data?.success
    ) {
      throw new Error(
        data?.error ||
          "Failed to update reconciliation."
      );
    }
  }

  async function handleDetailsSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (readOnly) {
      toast.error(
        "This reconciliation is read-only."
      );
      return;
    }

    const formData =
      new FormData(
        event.currentTarget
      );

    setSaving(true);

    try {
      await patchReconciliation({
        action:
          "update",

        statementOpeningBalance:
          Number(
            formData.get(
              "statementOpeningBalance"
            ) || 0
          ),

        statementClosingBalance:
          Number(
            formData.get(
              "statementClosingBalance"
            ) || 0
          ),

        notes:
          String(
            formData.get(
              "notes"
            ) || ""
          ),
      });

      toast.success(
        "Reconciliation details updated."
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update reconciliation."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeTransaction(
    transactionId: string,
    action:
      | "attach"
      | "detach"
  ) {
    if (readOnly) {
      toast.error(
        "Reconciled and locked statements are read-only."
      );
      return;
    }

    setWorkingTransactionId(
      transactionId
    );

    try {
      const response =
        await fetch(
          `/api/admin/finance/reconciliation/${reconciliation.id}/transactions`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                transactionId,
                action,
              }),
          }
        );

      const data =
        (await response
          .json()
          .catch(
            () =>
              null
          )) as {
          success?: boolean;
          error?: string;
        } | null;

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Failed to update reconciliation transaction."
        );
      }

      toast.success(
        action ===
          "attach"
          ? "Transaction matched."
          : "Transaction removed."
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update reconciliation transaction."
      );
    } finally {
      setWorkingTransactionId(
        null
      );
    }
  }

  async function reconcile() {
    if (readOnly) {
      return;
    }

    if (
      Math.abs(
        openingDifference
      ) >= 0.005
    ) {
      toast.error(
        "Statement opening balance must match the ledger opening balance before reconciliation."
      );

      return;
    }

    if (
      Math.abs(
        reconciliation.difference
      ) >= 0.005
    ) {
      toast.error(
        "The reconciliation difference must be zero before marking it reconciled."
      );

      return;
    }

    setSaving(true);

    try {
      await patchReconciliation({
        action:
          "reconcile",
      });

      toast.success(
        "Bank reconciliation marked reconciled."
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reconcile statement."
      );
    } finally {
      setSaving(false);
    }
  }

  async function lockReconciliation() {
    if (
      reconciliation.status !==
      BankReconciliationStatus.RECONCILED
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Lock this bank reconciliation?\n\nOnce locked, statement details and matched transactions can no longer be changed."
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      await patchReconciliation({
        action:
          "lock",
      });

      toast.success(
        "Bank reconciliation locked."
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to lock reconciliation."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* SUMMARY */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Statement Opening"
          value={money(
            reconciliation.statementOpeningBalance,
            reconciliation.bankAccount.currency
          )}
          subtitle={`Ledger opening: ${money(
            reconciliation.ledgerOpeningBalance,
            reconciliation.bankAccount.currency
          )}`}
          attention={
            Math.abs(
              openingDifference
            ) >= 0.005
          }
        />

        <SummaryCard
          title="Matched Movement"
          value={money(
            matchedIn -
              matchedOut,
            reconciliation.bankAccount.currency
          )}
          subtitle={`${money(
            matchedIn,
            reconciliation.bankAccount.currency
          )} in · ${money(
            matchedOut,
            reconciliation.bankAccount.currency
          )} out`}
        />

        <SummaryCard
          title="Ledger Closing"
          value={money(
            reconciliation.ledgerClosingBalance,
            reconciliation.bankAccount.currency
          )}
          subtitle={`${matchedTransactions.length} matched transaction${
            matchedTransactions.length ===
            1
              ? ""
              : "s"
          }`}
        />

        <SummaryCard
          title="Difference"
          value={money(
            reconciliation.difference,
            reconciliation.bankAccount.currency
          )}
          subtitle={
            Math.abs(
              reconciliation.difference
            ) < 0.005
              ? "Balanced"
              : "Needs review"
          }
          attention={
            Math.abs(
              reconciliation.difference
            ) >= 0.005
          }
        />
      </section>

      {/* READ ONLY NOTICE */}

      {reconciled && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-900">
            Reconciliation completed
          </p>

          <p className="mt-1 text-sm leading-6 text-emerald-800">
            Statement details and matched
            transactions are now
            read-only. Review the result
            and lock the reconciliation
            when you are satisfied.
          </p>
        </section>
      )}

      {locked && (
        <section className="rounded-xl border border-slate-300 bg-slate-100 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">
            Reconciliation locked
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            This reconciliation is
            permanently read-only for
            audit control.
          </p>
        </section>
      )}

      {/* DETAILS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Statement Control
            </p>

            <h2 className="mt-1 text-lg font-bold text-[#001F3F]">
              Reconciliation Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Status:{" "}
              <strong>
                {enumLabel(
                  reconciliation.status
                )}
              </strong>
              {" · "}
              Created by{" "}
              {
                reconciliation.createdBy
              }
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={
                  reconcile
                }
                disabled={
                  saving
                }
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Mark Reconciled"}
              </button>
            )}

            {reconciled && (
              <button
                type="button"
                onClick={
                  lockReconciliation
                }
                disabled={
                  saving
                }
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                {saving
                  ? "Locking..."
                  : "Lock Reconciliation"}
              </button>
            )}

            {locked && (
              <span className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
                Locked{" "}
                {formatDate(
                  reconciliation.lockedAt
                )}
              </span>
            )}
          </div>
        </div>

        <form
          onSubmit={
            handleDetailsSubmit
          }
          className="mt-5 grid gap-4 lg:grid-cols-[220px_220px_1fr_auto]"
        >
          <div>
            <label
              className={
                labelClass
              }
            >
              Statement Opening
            </label>

            <input
              name="statementOpeningBalance"
              type="number"
              step="0.01"
              defaultValue={
                reconciliation.statementOpeningBalance
              }
              disabled={
                readOnly
              }
              className={
                inputClass
              }
            />
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Statement Closing
            </label>

            <input
              name="statementClosingBalance"
              type="number"
              step="0.01"
              defaultValue={
                reconciliation.statementClosingBalance
              }
              disabled={
                readOnly
              }
              className={
                inputClass
              }
            />
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Notes
            </label>

            <input
              name="notes"
              defaultValue={
                reconciliation.notes ||
                ""
              }
              disabled={
                readOnly
              }
              className={
                inputClass
              }
              placeholder="Optional reconciliation notes"
            />
          </div>

          <div className="flex items-end">
            {!readOnly ? (
              <button
                type="submit"
                disabled={
                  saving
                }
                className="h-11 rounded-xl bg-[#8B0000] px-5 text-sm font-semibold text-white hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Details"}
              </button>
            ) : (
              <span className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-slate-100 px-5 text-sm font-semibold text-slate-500">
                Read Only
              </span>
            )}
          </div>
        </form>
      </section>

      <TransactionSection
        title="Matched Transactions"
        description="Posted Bank Ledger transactions already cleared against this statement."
        transactions={
          matchedTransactions
        }
        empty="No transactions have been matched yet."
        currency={
          reconciliation.bankAccount.currency
        }
        readOnly={
          readOnly
        }
        workingTransactionId={
          workingTransactionId
        }
        actionLabel="Remove"
        onAction={(
          transactionId
        ) =>
          changeTransaction(
            transactionId,
            "detach"
          )
        }
      />

      <TransactionSection
        title="Available Transactions"
        description={
          previousStatementDate
            ? `Unreconciled posted transactions after ${formatDate(
                previousStatementDate
              )} and through ${formatDate(
                reconciliation.statementDate
              )}.`
            : `Unreconciled posted transactions through ${formatDate(
                reconciliation.statementDate
              )}.`
        }
        transactions={
          unmatchedTransactions
        }
        empty="No eligible unreconciled transactions remain for this statement period."
        currency={
          reconciliation.bankAccount.currency
        }
        readOnly={
          readOnly
        }
        workingTransactionId={
          workingTransactionId
        }
        actionLabel="Match"
        onAction={(
          transactionId
        ) =>
          changeTransaction(
            transactionId,
            "attach"
          )
        }
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  attention = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  attention?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        attention
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          attention
            ? "text-amber-800"
            : "text-[#001F3F]"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {subtitle}
      </p>
    </section>
  );
}

function TransactionSection({
  title,
  description,
  transactions,
  empty,
  currency,
  readOnly,
  workingTransactionId,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  transactions: RelatedTransaction[];
  empty: string;
  currency: string;
  readOnly: boolean;
  workingTransactionId:
    | string
    | null;
  actionLabel:
    | "Match"
    | "Remove";
  onAction: (
    transactionId: string
  ) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#001F3F]">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          </div>

          {readOnly && (
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Read Only
            </span>
          )}
        </div>
      </div>

      {transactions.length ===
      0 ? (
        <div className="px-5 py-10 text-center text-sm text-slate-500">
          {empty}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  Date
                </th>

                <th className="px-4 py-3">
                  Type
                </th>

                <th className="px-4 py-3">
                  Description
                </th>

                <th className="px-4 py-3">
                  Reference
                </th>

                <th className="px-4 py-3">
                  Context
                </th>

                <th className="px-4 py-3 text-right">
                  Amount
                </th>

                {!readOnly && (
                  <th className="px-4 py-3 text-right">
                    Action
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {transactions.map(
                (
                  transaction
                ) => {
                  const incoming =
                    transaction.direction ===
                    BankTransactionDirection.IN;

                  return (
                    <tr
                      key={
                        transaction.id
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-4">
                        {formatDate(
                          transaction.transactionDate
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {enumLabel(
                            transaction.type
                          )}
                        </span>
                      </td>

                      <td className="max-w-[300px] px-4 py-4 text-slate-700">
                        {transaction.description ||
                          "-"}
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        {transaction.reference ||
                          "-"}
                      </td>

                      <td className="max-w-[300px] px-4 py-4 text-slate-600">
                        {transactionContext(
                          transaction
                        )}
                      </td>

                      <td
                        className={`whitespace-nowrap px-4 py-4 text-right font-bold ${
                          incoming
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {incoming
                          ? "+"
                          : "-"}
                        {money(
                          transaction.amount,
                          currency
                        )}
                      </td>

                      {!readOnly && (
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            disabled={
                              workingTransactionId ===
                              transaction.id
                            }
                            onClick={() =>
                              onAction(
                                transaction.id
                              )
                            }
                            className={
                              actionLabel ===
                              "Match"
                                ? "font-semibold text-emerald-700 hover:underline disabled:opacity-50"
                                : "font-semibold text-red-700 hover:underline disabled:opacity-50"
                            }
                          >
                            {workingTransactionId ===
                            transaction.id
                              ? "Saving..."
                              : actionLabel}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const labelClass =
  "mb-1.5 block text-sm font-semibold text-slate-700";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50 disabled:bg-slate-100 disabled:text-slate-500";