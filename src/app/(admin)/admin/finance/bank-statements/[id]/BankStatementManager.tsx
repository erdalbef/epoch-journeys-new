"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BankStatementLineMatchStatus,
  BankStatementStatus,
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
} from "@prisma/client";

import { toast } from "sonner";

type Statement = {
  id: string;
  fileName: string | null;
  fileType: string | null;
  statementDate: string;
  openingBalance: number | null;
  closingBalance: number | null;
  currency: string;
  status: BankStatementStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: string;
  bankAccount: {
    id: string;
    name: string;
    currency: string;
  };
};

type Line = {
  id: string;
  transactionDate: string;
  valueDate: string | null;
  description: string | null;
  reference: string | null;
  amount: number;
  direction: BankTransactionDirection;
  currency: string;
  balance: number | null;
  matchStatus: BankStatementLineMatchStatus;
  matchedAt: string | null;
  matchedBankTransactionId: string | null;
  matchedBankTransaction: {
    id: string;
    type: BankTransactionType;
    direction: BankTransactionDirection;
    status: BankTransactionStatus;
    amount: number;
    currency: string;
    transactionDate: string;
    reference: string | null;
    description: string | null;
    reconciliationId: string | null;
  } | null;
};

type Candidate = {
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
  reconciliationId: string | null;

  statementLine: {
    id: string;
    bankStatementId: string;
  } | null;

  booking: {
    bookingReference: string;
    bookingDisplayCode: string | null;
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
};

type Props = {
  statement: Statement;
  previousStatementDate: string | null;
  lines: Line[];
  candidates: Candidate[];
};

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

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-GB", {
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

function candidateContext(candidate: Candidate) {
  if (candidate.booking) {
    return (
      candidate.booking.bookingDisplayCode ||
      candidate.booking.bookingReference
    );
  }

  if (candidate.supplierPayablePayment) {
    return `${candidate.supplierPayablePayment.payable.supplierNameSnapshot} · ${candidate.supplierPayablePayment.payable.title}`;
  }

  if (candidate.expense) {
    return candidate.expense.vendorName
      ? `${candidate.expense.title} · ${candidate.expense.vendorName}`
      : candidate.expense.title;
  }

  if (candidate.refund) {
    return (
      candidate.refund.booking.bookingDisplayCode ||
      candidate.refund.booking.bookingReference
    );
  }

  return "";
}

function candidateLabel(candidate: Candidate) {
  const sign =
    candidate.direction === BankTransactionDirection.IN ? "+" : "-";

  const context = candidateContext(candidate);

  return [
    formatDate(candidate.transactionDate),
    enumLabel(candidate.type),
    `${sign}${money(candidate.amount, candidate.currency)}`,
    candidate.reference || candidate.description || context,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function BankStatementManager({
  statement,
  previousStatementDate,
  lines,
  candidates,
}: Props) {
  const router = useRouter();

  const [working, setWorking] = useState<string | null>(null);
  const [statusWorking, setStatusWorking] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [statementDateInput, setStatementDateInput] = useState(
    statement.statementDate.slice(0, 10),
  );
  const [openingBalanceInput, setOpeningBalanceInput] = useState(
    statement.openingBalance === null ? "" : String(statement.openingBalance),
  );
  const [closingBalanceInput, setClosingBalanceInput] = useState(
    statement.closingBalance === null ? "" : String(statement.closingBalance),
  );
  const [notesInput, setNotesInput] = useState(statement.notes || "");

  const archived = statement.status === BankStatementStatus.ARCHIVED;

  const matchedCount = lines.filter(
    (line) =>
      line.matchStatus === BankStatementLineMatchStatus.MATCHED,
  ).length;

  const ignoredCount = lines.filter(
    (line) =>
      line.matchStatus === BankStatementLineMatchStatus.IGNORED,
  ).length;

  const unmatchedCount = lines.length - matchedCount - ignoredCount;

  const availableCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          !candidate.statementLine ||
          candidate.statementLine.bankStatementId === statement.id,
      ),
    [candidates, statement.id],
  );

  async function lineAction(
    lineId: string,
    action: "match" | "unmatch" | "ignore" | "restore",
    bankTransactionId?: string,
  ) {
    setWorking(lineId);

    try {
      const response = await fetch(
        `/api/admin/finance/bank-statements/${statement.id}/lines`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lineId,
            action,
            bankTransactionId,
          }),
        },
      );

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Failed to update statement line.",
        );
      }

      toast.success("Statement line updated.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update statement line.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function autoMatch() {
    setStatusWorking(true);

    try {
      const response = await fetch(
        `/api/admin/finance/bank-statements/${statement.id}/lines`,
        {
          method: "POST",
        },
      );

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        matched?: number;
      } | null;

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Automatic matching failed.",
        );
      }

      toast.success(
        `${data.matched || 0} statement line${
          data.matched === 1 ? "" : "s"
        } matched automatically.`,
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Automatic matching failed.",
      );
    } finally {
      setStatusWorking(false);
    }
  }

  async function updateStatement(
    action: "review" | "archive",
  ) {
    setStatusWorking(true);

    try {
      const response = await fetch(
        `/api/admin/finance/bank-statements/${statement.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
          }),
        },
      );

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Failed to update bank statement.",
        );
      }

      toast.success("Bank statement updated.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update bank statement.",
      );
    } finally {
      setStatusWorking(false);
    }
  }

  async function saveStatementDetails() {
    const openingBalance =
      openingBalanceInput.trim() === ""
        ? null
        : Number(openingBalanceInput);

    const closingBalance =
      closingBalanceInput.trim() === ""
        ? null
        : Number(closingBalanceInput);

    if (
      openingBalance !== null &&
      !Number.isFinite(openingBalance)
    ) {
      toast.error("Opening balance is invalid.");
      return;
    }

    if (
      closingBalance !== null &&
      !Number.isFinite(closingBalance)
    ) {
      toast.error("Closing balance is invalid.");
      return;
    }

    if (!statementDateInput) {
      toast.error("Statement date is required.");
      return;
    }

    setStatusWorking(true);

    try {
      const response = await fetch(
        `/api/admin/finance/bank-statements/${statement.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update-details",
            statementDate: statementDateInput,
            openingBalance,
            closingBalance,
            notes: notesInput,
          }),
        },
      );

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Failed to update bank statement details.",
        );
      }

      toast.success("Bank statement details updated.");
      setEditingDetails(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update bank statement details.",
      );
    } finally {
      setStatusWorking(false);
    }
  }

  async function startReconciliation() {
    if (
      statement.openingBalance === null ||
      statement.closingBalance === null
    ) {
      toast.error(
        "Opening and closing balances are required before starting reconciliation.",
      );
      return;
    }

    setStatusWorking(true);

    try {
      const response = await fetch(
        "/api/admin/finance/reconciliation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bankStatementId: statement.id,
          }),
        },
      );

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        reconciliation?: {
          id: string;
          attachedTransactions?: number;
        };
      } | null;

      if (!response.ok || !data?.success || !data.reconciliation?.id) {
        throw new Error(
          data?.error || "Failed to start bank reconciliation.",
        );
      }

      toast.success(
        `Bank reconciliation started with ${
          data.reconciliation.attachedTransactions || 0
        } matched ledger transaction${
          data.reconciliation.attachedTransactions === 1 ? "" : "s"
        }.`,
      );

      router.push(
        `/admin/finance/reconciliation/${data.reconciliation.id}`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start bank reconciliation.",
      );
    } finally {
      setStatusWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Opening Balance"
          value={money(statement.openingBalance, statement.currency)}
          subtitle="Statement opening"
        />

        <SummaryCard
          title="Closing Balance"
          value={money(statement.closingBalance, statement.currency)}
          subtitle="Statement closing"
        />

        <SummaryCard
          title="Matched"
          value={`${matchedCount}`}
          subtitle={`${lines.length} total statement lines`}
        />

        <SummaryCard
          title="Ignored"
          value={`${ignoredCount}`}
          subtitle="Non-ledger statement items"
        />

        <SummaryCard
          title="Unmatched"
          value={`${unmatchedCount}`}
          subtitle={
            unmatchedCount === 0 ? "Review complete" : "Needs attention"
          }
          attention={unmatchedCount > 0}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Statement Control
            </p>

            <h2 className="mt-1 text-lg font-bold text-[#001F3F]">
              {enumLabel(statement.status)}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Imported by {statement.uploadedBy}
              {previousStatementDate
                ? ` · Previous statement ${formatDate(
                    previousStatementDate,
                  )}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!archived && unmatchedCount > 0 && (
              <button
                type="button"
                onClick={autoMatch}
                disabled={statusWorking}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                Auto-match Exact
              </button>
            )}

            {!archived &&
              statement.status === BankStatementStatus.IMPORTED &&
              unmatchedCount === 0 && (
                <button
                  type="button"
                  onClick={() => updateStatement("review")}
                  disabled={statusWorking}
                  className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  Mark Reviewed
                </button>
              )}

            {!archived &&
              (statement.status === BankStatementStatus.IMPORTED ||
                statement.status === BankStatementStatus.REVIEWED) && (
                <button
                  type="button"
                  onClick={() => setEditingDetails((value) => !value)}
                  disabled={statusWorking}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#8B0000] hover:text-[#8B0000] disabled:opacity-50"
                >
                  {editingDetails ? "Close Details" : "Edit Statement Details"}
                </button>
              )}

            {!archived &&
              statement.status === BankStatementStatus.REVIEWED && (
                <button
                  type="button"
                  onClick={startReconciliation}
                  disabled={statusWorking}
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  Start Reconciliation
                </button>
              )}

            {!archived &&
              statement.status === BankStatementStatus.RECONCILED && (
                <button
                  type="button"
                  onClick={() => updateStatement("archive")}
                  disabled={statusWorking}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                >
                  Archive
                </button>
              )}
          </div>
        </div>

        {editingDetails && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Statement Date
                </label>

                <input
                  type="date"
                  value={statementDateInput}
                  onChange={(event) =>
                    setStatementDateInput(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Opening Balance
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={openingBalanceInput}
                  onChange={(event) =>
                    setOpeningBalanceInput(event.target.value)
                  }
                  placeholder="Example: 0.00"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Closing Balance
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={closingBalanceInput}
                  onChange={(event) =>
                    setClosingBalanceInput(event.target.value)
                  }
                  placeholder="Example: -690.96"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={saveStatementDetails}
                  disabled={statusWorking}
                  className="h-11 w-full rounded-xl bg-[#8B0000] px-4 text-sm font-semibold text-white hover:bg-[#6f0000] disabled:opacity-50"
                >
                  {statusWorking ? "Saving..." : "Save Details"}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Notes
              </label>

              <textarea
                rows={3}
                value={notesInput}
                onChange={(event) => setNotesInput(event.target.value)}
                placeholder="Optional statement notes"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>
          </div>
        )}

        {statement.notes && !editingDetails && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            {statement.notes}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Statement Lines
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Match each external statement line to the corresponding posted
            Bank Ledger transaction. Use Ignore only for genuine statement
            items that do not belong in the ERP ledger.
          </p>
        </div>

        {lines.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No statement lines were imported.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ledger Match</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => {
                  const incoming =
                    line.direction === BankTransactionDirection.IN;

                  const matchingCandidates = availableCandidates.filter(
                    (candidate) =>
                      candidate.id === line.matchedBankTransactionId ||
                      (!candidate.statementLine &&
                        candidate.direction === line.direction &&
                        candidate.currency === line.currency &&
                        Math.abs(candidate.amount - line.amount) < 0.005),
                  );

                  return (
                    <tr key={line.id} className="align-top hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-4">
                        {formatDate(line.transactionDate)}
                      </td>

                      <td className="max-w-[300px] px-4 py-4 text-slate-700">
                        {line.description || "-"}
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        {line.reference || "-"}
                      </td>

                      <td
                        className={`whitespace-nowrap px-4 py-4 text-right font-bold ${
                          incoming ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {incoming ? "+" : "-"}
                        {money(line.amount, line.currency)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-slate-600">
                        {money(line.balance, line.currency)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            line.matchStatus ===
                            BankStatementLineMatchStatus.MATCHED
                              ? "bg-emerald-100 text-emerald-800"
                              : line.matchStatus ===
                                  BankStatementLineMatchStatus.IGNORED
                                ? "bg-slate-100 text-slate-700"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {enumLabel(line.matchStatus)}
                        </span>
                      </td>

                      <td className="min-w-[430px] px-4 py-4">
                        {line.matchedBankTransaction ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <p className="font-semibold text-emerald-900">
                              {enumLabel(
                                line.matchedBankTransaction.type,
                              )}{" "}
                              ·{" "}
                              {formatDate(
                                line.matchedBankTransaction.transactionDate,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-emerald-800">
                              {line.matchedBankTransaction.reference ||
                                line.matchedBankTransaction.description ||
                                "Ledger transaction"}
                            </p>

                            {line.matchedBankTransaction.reconciliationId && (
                              <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                                Included in bank reconciliation
                              </p>
                            )}
                          </div>
                        ) : line.matchStatus ===
                          BankStatementLineMatchStatus.IGNORED ? (
                          <span className="text-xs text-slate-500">
                            Ignored
                          </span>
                        ) : (
                          <MatchSelector
                            lineId={line.id}
                            candidates={matchingCandidates}
                            disabled={archived || working === line.id}
                            onMatch={(bankTransactionId) =>
                              lineAction(
                                line.id,
                                "match",
                                bankTransactionId,
                              )
                            }
                          />
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-3 whitespace-nowrap">
                          {line.matchStatus ===
                            BankStatementLineMatchStatus.MATCHED && (
                            <button
                              type="button"
                              disabled={archived || working === line.id}
                              onClick={() =>
                                lineAction(line.id, "unmatch")
                              }
                              className="font-semibold text-red-700 hover:underline disabled:opacity-50"
                            >
                              Unmatch
                            </button>
                          )}

                          {line.matchStatus ===
                            BankStatementLineMatchStatus.UNMATCHED && (
                            <button
                              type="button"
                              disabled={archived || working === line.id}
                              onClick={() =>
                                lineAction(line.id, "ignore")
                              }
                              className="font-semibold text-slate-600 hover:underline disabled:opacity-50"
                            >
                              Ignore
                            </button>
                          )}

                          {line.matchStatus ===
                            BankStatementLineMatchStatus.IGNORED && (
                            <button
                              type="button"
                              disabled={archived || working === line.id}
                              onClick={() =>
                                lineAction(line.id, "restore")
                              }
                              className="font-semibold text-blue-700 hover:underline disabled:opacity-50"
                            >
                              Restore
                            </button>
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

function MatchSelector({
  lineId,
  candidates,
  disabled,
  onMatch,
}: {
  lineId: string;
  candidates: Candidate[];
  disabled: boolean;
  onMatch: (bankTransactionId: string) => void;
}) {
  const [value, setValue] = useState("");

  if (candidates.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        No exact amount/direction candidate found. Review the Bank Ledger.
      </p>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        aria-label={`Ledger match for statement line ${lineId}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#8B0000]"
      >
        <option value="">Select ledger transaction</option>

        {candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidateLabel(candidate)}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={disabled || !value}
        onClick={() => onMatch(value)}
        className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        Match
      </button>
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
          attention ? "text-amber-800" : "text-[#001F3F]"
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

