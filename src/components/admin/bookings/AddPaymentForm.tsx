"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PaymentMethod,
  PaymentRecordStatus,
} from "@prisma/client";

type BankAccountOption = {
  id: string;
  name: string;
  currency: string;
};

type AddPaymentFormProps = {
  bookingId: string;
  defaultCurrency?: string;
  disabled?: boolean;
  bankAccounts: BankAccountOption[];
};

export default function AddPaymentForm({
  bookingId,
  defaultCurrency = "EUR",
  disabled = false,
  bankAccounts,
}: AddPaymentFormProps) {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);

  const [method, setMethod] =
    useState<PaymentMethod>("BANK_TRANSFER");

  const [status, setStatus] =
    useState<PaymentRecordStatus>("RECEIVED");

  const [bankAccountId, setBankAccountId] = useState("");

  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const matchingBankAccounts = bankAccounts.filter(
    (account) => account.currency === currency,
  );

  if (disabled) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">
          Add Payment
        </h3>

        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            This booking is fully paid. No further payments are required.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (
        status === "RECEIVED" &&
        !bankAccountId
      ) {
        throw new Error(
          "Please select the bank or cash account where the payment was received.",
        );
      }

      const response = await fetch(
        `/api/admin/bookings/${bookingId}/payments`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            amount: Number(amount),
            currency,
            method,
            status,

            bankAccountId:
              status === "RECEIVED"
                ? bankAccountId
                : null,

            reference,
            paidAt: paidAt || null,
            notes,
          }),
        },
      );

      const data = (await response.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to add payment.",
        );
      }

      setSuccess(
        status === "RECEIVED"
          ? "Payment received and posted to the Bank Ledger."
          : "Payment record added successfully.",
      );

      setAmount("");
      setReference("");
      setPaidAt("");
      setNotes("");

      if (status !== "RECEIVED") {
        setBankAccountId("");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">
          Add Payment
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Received payments are posted automatically to the Bank Ledger.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="payment-amount"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Amount
            </label>

            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#8B0000]"
              placeholder="Enter payment amount"
              required
            />
          </div>

          <div>
            <label
              htmlFor="payment-currency"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Currency
            </label>

            <input
              id="payment-currency"
              type="text"
              maxLength={3}
              value={currency}
              onChange={(event) => {
                const nextCurrency =
                  event.target.value.toUpperCase();

                setCurrency(nextCurrency);

                setBankAccountId((current) => {
                  const selected =
                    bankAccounts.find(
                      (account) =>
                        account.id === current,
                    );

                  if (
                    selected &&
                    selected.currency !== nextCurrency
                  ) {
                    return "";
                  }

                  return current;
                });
              }}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#8B0000]"
              placeholder="EUR"
              required
            />
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Payment Method
            </label>

            <select
              id="payment-method"
              value={method}
              onChange={(event) =>
                setMethod(
                  event.target.value as PaymentMethod,
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="BANK_TRANSFER">
                Bank Transfer
              </option>

              <option value="STRIPE">
                Stripe
              </option>

              <option value="PAYPAL">
                PayPal
              </option>

              <option value="CASH">
                Cash
              </option>

              <option value="OTHER">
                Other
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="payment-status"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Record Status
            </label>

            <select
              id="payment-status"
              value={status}
              onChange={(event) => {
                const value =
                  event.target.value as PaymentRecordStatus;

                setStatus(value);

                if (value !== "RECEIVED") {
                  setBankAccountId("");
                }
              }}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="RECEIVED">
                Received
              </option>

              <option value="PENDING">
                Pending
              </option>

              <option value="FAILED">
                Failed
              </option>

              <option value="REFUNDED">
                Refunded
              </option>
            </select>
          </div>

          {status === "RECEIVED" && (
            <div className="md:col-span-2">
              <label
                htmlFor="bank-account"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Received Into
                <span className="ml-1 text-red-700">
                  *
                </span>
              </label>

              <select
                id="bank-account"
                value={bankAccountId}
                onChange={(event) =>
                  setBankAccountId(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#8B0000]"
                required
              >
                <option value="">
                  Select bank / cash account...
                </option>

                {matchingBankAccounts.map(
                  (account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.name} ·{" "}
                      {account.currency}
                    </option>
                  ),
                )}
              </select>

              {matchingBankAccounts.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  No active {currency} bank or cash account is available.
                  Create one in Finance → Bank Accounts first.
                </p>
              )}

              <p className="mt-2 text-xs text-slate-500">
                This account receives the corresponding CUSTOMER RECEIPT entry
                in the Bank Ledger.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="paid-date"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Paid Date
            </label>

            <input
              id="paid-date"
              type="date"
              value={paidAt}
              onChange={(event) =>
                setPaidAt(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="payment-reference"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Reference
            </label>

            <input
              id="payment-reference"
              type="text"
              value={reference}
              onChange={(event) =>
                setReference(
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#8B0000]"
              placeholder="Bank ref / transaction ID"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="payment-notes"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Notes
          </label>

          <textarea
            id="payment-notes"
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            placeholder="Optional notes"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-medium text-emerald-700">
              {success}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={
            submitting ||
            (
              status === "RECEIVED" &&
              matchingBankAccounts.length === 0
            )
          }
          className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Saving..."
            : status === "RECEIVED"
              ? "Receive Payment"
              : "Add Payment Record"}
        </button>
      </form>
    </div>
  );
}