"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  Plus,
  Receipt,
  X,
} from "lucide-react";

type InstallmentType =
  | "DEPOSIT_1"
  | "DEPOSIT_2"
  | "DEPOSIT_3"
  | "FINAL"
  | "CUSTOM";

type Schedule = {
  id: string;
  type: InstallmentType;
  title: string | null;
  dueDate: string;
  amount: number;
  amountPaid: number;
  status: string;
};

type BankAccount = {
  id: string;
  name: string;
  currency: string;
};

type PaymentHistoryItem = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
  allocatedAmount: number;
  bankAccountId: string | null;
};

type AllocationRow = {
  paymentScheduleId: string;
  amount: string;
};

type Props = {
  bookingId: string;
  bookingReference: string;
  currency: string;
  totalPrice: number;
  currentAmountPaid: number;
  bankAccounts: BankAccount[];
  schedules: Schedule[];
  payments: PaymentHistoryItem[];
};

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function installmentLabel(item: Schedule) {
  if (item.title?.trim()) return item.title;

  switch (item.type) {
    case "DEPOSIT_1":
      return "Deposit 1";
    case "DEPOSIT_2":
      return "Deposit 2";
    case "DEPOSIT_3":
      return "Deposit 3";
    case "FINAL":
      return "Final Payment";
    default:
      return "Custom";
  }
}

function methodLabel(value: string) {
  return value.replaceAll("_", " ");
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export default function RecordCustomerPayment({
  bookingId,
  bookingReference,
  currency,
  totalPrice,
  currentAmountPaid,
  bankAccounts,
  schedules,
  payments,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [paidAt, setPaidAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const outstanding = Math.max(0, totalPrice - currentAmountPaid);

  const activeSchedules = useMemo(
    () =>
      schedules
        .filter((schedule) => schedule.status !== "CANCELLED")
        .map((schedule) => ({
          ...schedule,
          balance: Math.max(0, schedule.amount - schedule.amountPaid),
        }))
        .filter((schedule) => schedule.balance > 0)
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        ),
    [schedules],
  );

  const paymentAmount = Number(amount);
  const allocatedTotal = allocations.reduce((sum, row) => {
    const value = Number(row.amount);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const remainingToAllocate =
    Number.isFinite(paymentAmount) && paymentAmount > 0
      ? Math.max(0, round2(paymentAmount - allocatedTotal))
      : 0;

  function resetForm() {
    setAmount("");
    setBankAccountId("");
    setMethod("BANK_TRANSFER");
    setPaidAt(new Date().toISOString().slice(0, 10));
    setReference("");
    setNotes("");
    setAllocations([]);
    setError("");
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  function addAllocation() {
    setAllocations((current) => [
      ...current,
      {
        paymentScheduleId: "",
        amount: "",
      },
    ]);
  }

  function updateAllocation(
    index: number,
    field: keyof AllocationRow,
    value: string,
  ) {
    setAllocations((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function removeAllocation(index: number) {
    setAllocations((current) =>
      current.filter((_, rowIndex) => rowIndex !== index),
    );
  }

  function autoAllocate() {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter the payment amount before using Auto Allocate.");
      return;
    }

    let remaining = round2(value);
    const rows: AllocationRow[] = [];

    for (const schedule of activeSchedules) {
      if (remaining <= 0) break;

      const allocation = Math.min(remaining, schedule.balance);

      if (allocation > 0) {
        rows.push({
          paymentScheduleId: schedule.id,
          amount: String(round2(allocation)),
        });
        remaining = round2(remaining - allocation);
      }
    }

    setAllocations(rows);
    setError("");

    if (remaining > 0 && activeSchedules.length > 0) {
      setError(
        `${formatCurrency(
          remaining,
          currency,
        )} could not be allocated because the open installment balances are smaller than this payment.`,
      );
    }
  }

  function submit() {
    setError("");
    setMessage("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (numericAmount > outstanding + 0.000001) {
      setError(
        `Payment cannot exceed the current booking outstanding balance of ${formatCurrency(
          outstanding,
          currency,
        )}.`,
      );
      return;
    }

    if (!bankAccountId) {
      setError("Select the Epoch bank account that received the payment.");
      return;
    }

    if (!paidAt) {
      setError("Enter the payment date.");
      return;
    }

    const cleanedAllocations = allocations
      .filter(
        (row) =>
          row.paymentScheduleId.trim() !== "" &&
          row.amount.trim() !== "" &&
          Number(row.amount) > 0,
      )
      .map((row) => ({
        paymentScheduleId: row.paymentScheduleId,
        amount: Number(row.amount),
      }));

    const allocationSum = cleanedAllocations.reduce(
      (sum, row) => sum + row.amount,
      0,
    );

    if (
      activeSchedules.length > 0 &&
      Math.abs(allocationSum - numericAmount) > 0.009
    ) {
      setError(
        `Allocate the full payment amount before recording it; ${formatCurrency(
          Math.max(0, numericAmount - allocationSum),
          currency,
        )} remains unallocated.`,
      );
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/bookings/${bookingId}/payments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: numericAmount,
              currency,
              method,
              status: "RECEIVED",
              bankAccountId,
              paidAt,
              reference,
              notes,
              allocations: cleanedAllocations,
            }),
          },
        );

        const data = (await response.json().catch(() => null)) as
          | {
              error?: string;
              success?: boolean;
            }
          | null;

        if (!response.ok) {
          setError(data?.error || "Failed to record customer payment.");
          return;
        }

        setMessage("Customer payment recorded and allocated successfully.");
        setShowForm(false);
        resetForm();
        router.refresh();
      } catch (submitError) {
        console.error(submitError);
        setError("Something went wrong while recording the payment.");
      }
    });
  }

  return (
    <section id="record-payment" className="scroll-mt-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Customer Receipts
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
            Record Customer Payment
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Record money actually received by Epoch and allocate it to the
            booking payment schedule.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setMessage("");
            setError("");
          }}
          disabled={outstanding <= 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Summary
          label="Booking Total"
          value={formatCurrency(totalPrice, currency)}
        />
        <Summary
          label="Recorded Paid"
          value={formatCurrency(currentAmountPaid, currency)}
        />
        <Summary
          label="Outstanding"
          value={formatCurrency(outstanding, currency)}
        />
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-[#001F3F]">
                New Customer Receipt
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Booking {bookingReference}
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-2 text-slate-500 hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {bankAccounts.length === 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No active {currency} bank account is available; create or activate
              a matching bank account before recording a customer receipt.
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label={`Amount (${currency}) *`}>
              <input
                type="number"
                min="0.01"
                max={outstanding}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Receiving Bank Account *">
              <select
                value={bankAccountId}
                onChange={(event) => setBankAccountId(event.target.value)}
                className={inputClass}
              >
                <option value="">Select bank account</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {account.currency}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Payment Method *">
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className={inputClass}
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="STRIPE">Stripe</option>
                <option value="PAYPAL">PayPal</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>

            <Field label="Payment Date *">
              <input
                type="date"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Bank / Payment Reference">
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className={inputClass}
                placeholder="Transfer reference"
              />
            </Field>

            <Field label="Notes">
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          {activeSchedules.length > 0 ? (
            <div className="mt-6 rounded-xl border bg-white">
              <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[#001F3F]">
                    Allocate to Installments
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    A received payment must be fully allocated when a schedule
                    exists.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={autoAllocate}
                    className="rounded-lg border border-[#001F3F] px-3 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50"
                  >
                    Auto Allocate Oldest First
                  </button>

                  <button
                    type="button"
                    onClick={addAllocation}
                    className="rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Add Allocation
                  </button>
                </div>
              </div>

              <div className="space-y-3 p-4">
                {allocations.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No allocation rows yet; use Auto Allocate or Add Allocation.
                  </p>
                ) : (
                  allocations.map((row, index) => {
                    const selected = activeSchedules.find(
                      (item) => item.id === row.paymentScheduleId,
                    );

                    return (
                      <div
                        key={`${row.paymentScheduleId}-${index}`}
                        className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_180px_auto]"
                      >
                        <select
                          value={row.paymentScheduleId}
                          onChange={(event) =>
                            updateAllocation(
                              index,
                              "paymentScheduleId",
                              event.target.value,
                            )
                          }
                          className={inputClass}
                        >
                          <option value="">Select installment</option>
                          {activeSchedules.map((schedule) => (
                            <option key={schedule.id} value={schedule.id}>
                              {installmentLabel(schedule)} —{" "}
                              {formatDate(schedule.dueDate)} — Balance{" "}
                              {formatCurrency(schedule.balance, currency)}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          max={selected?.balance}
                          value={row.amount}
                          onChange={(event) =>
                            updateAllocation(index, "amount", event.target.value)
                          }
                          className={inputClass}
                          placeholder="Amount"
                        />

                        <button
                          type="button"
                          onClick={() => removeAllocation(index)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}

                <div className="flex flex-wrap justify-end gap-6 border-t pt-3 text-sm">
                  <span>
                    Allocated:{" "}
                    <strong>
                      {formatCurrency(allocatedTotal, currency)}
                    </strong>
                  </span>
                  <span>
                    Remaining:{" "}
                    <strong
                      className={
                        remainingToAllocate > 0 ? "text-red-700" : "text-green-700"
                      }
                    >
                      {formatCurrency(remainingToAllocate, currency)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              This booking has no open payment schedule, so the payment will be
              recorded directly against the booking balance.
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={isPending || bankAccounts.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Banknote className="h-4 w-4" />
              {isPending ? "Recording..." : "Record Received Payment"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-[#8B0000]" />
          <h3 className="font-semibold text-[#001F3F]">Payment History</h3>
        </div>

        {payments.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed bg-slate-50 p-6 text-center text-sm text-slate-500">
            No recorded customer payments yet.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Reference</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-right">Allocated</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Bank</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const bank = bankAccounts.find(
                    (account) => account.id === payment.bankAccountId,
                  );

                  return (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3">
                        {formatDate(payment.paidAt || payment.createdAt)}
                      </td>
                      <td className="py-3">{methodLabel(payment.method)}</td>
                      <td className="py-3">{payment.reference || "-"}</td>
                      <td className="py-3 text-right font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(payment.allocatedAmount, payment.currency)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            payment.status === "RECEIVED"
                              ? "bg-green-100 text-green-800"
                              : payment.status === "REFUNDED"
                                ? "bg-slate-200 text-slate-700"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3">{bank?.name || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </section>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-bold text-[#001F3F]">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
