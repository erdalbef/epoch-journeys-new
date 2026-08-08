"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type BankAccountOption = {
  id: string;
  name: string;
  currency: string;
};

type Props = {
  bankAccounts: BankAccountOption[];
};

export default function BankTransferForm({
  bankAccounts,
}: Props) {
  const router = useRouter();

  const [fromBankAccountId, setFromBankAccountId] =
    useState("");

  const [toBankAccountId, setToBankAccountId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [transactionDate, setTransactionDate] =
    useState("");

  const [reference, setReference] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const fromAccount =
    bankAccounts.find(
      (account) =>
        account.id === fromBankAccountId,
    );

  const currency =
    fromAccount?.currency || "EUR";

  const destinationAccounts =
    useMemo(() => {
      if (!fromAccount) {
        return [];
      }

      return bankAccounts.filter(
        (account) =>
          account.id !== fromAccount.id &&
          account.currency === fromAccount.currency,
      );
    }, [
      bankAccounts,
      fromAccount,
    ]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const numericAmount =
      Number(amount);

    if (!fromBankAccountId) {
      toast.error(
        "Select the source account.",
      );
      return;
    }

    if (!toBankAccountId) {
      toast.error(
        "Select the destination account.",
      );
      return;
    }

    if (
      fromBankAccountId ===
      toBankAccountId
    ) {
      toast.error(
        "Source and destination accounts must be different.",
      );
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      toast.error(
        "Transfer amount must be greater than zero.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/admin/finance/bank-transfers",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            fromBankAccountId,
            toBankAccountId,
            amount: numericAmount,
            currency,
            transactionDate:
              transactionDate || null,
            reference:
              reference.trim() || null,
            notes:
              notes.trim() || null,
          }),
        },
      );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Failed to create bank transfer.",
        );
      }

      toast.success(
        "Bank transfer posted successfully.",
      );

      setFromBankAccountId("");
      setToBankAccountId("");
      setAmount("");
      setTransactionDate("");
      setReference("");
      setNotes("");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create bank transfer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#001F3F]">
          New Bank Transfer
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          The system posts both sides of the transfer automatically.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>
              From Account *
            </label>

            <select
              value={fromBankAccountId}
              onChange={(event) => {
                const nextId =
                  event.target.value;

                setFromBankAccountId(
                  nextId,
                );

                setToBankAccountId("");
              }}
              required
              className={inputClass}
            >
              <option value="">
                Select source account...
              </option>

              {bankAccounts.map(
                (account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                    {" · "}
                    {account.currency}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              To Account *
            </label>

            <select
              value={toBankAccountId}
              onChange={(event) =>
                setToBankAccountId(
                  event.target.value,
                )
              }
              required
              disabled={
                !fromBankAccountId
              }
              className={inputClass}
            >
              <option value="">
                Select destination account...
              </option>

              {destinationAccounts.map(
                (account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                    {" · "}
                    {account.currency}
                  </option>
                ),
              )}
            </select>

            {fromAccount &&
            destinationAccounts.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-700">
                No other active {currency} account is available.
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClass}>
              Amount *
            </label>

            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value,
                )
              }
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Currency
            </label>

            <input
              readOnly
              value={currency}
              className={`${inputClass} bg-slate-50`}
            />
          </div>

          <div>
            <label className={labelClass}>
              Transfer Date
            </label>

            <input
              type="date"
              value={transactionDate}
              onChange={(event) =>
                setTransactionDate(
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Reference
            </label>

            <input
              value={reference}
              onChange={(event) =>
                setReference(
                  event.target.value,
                )
              }
              placeholder="Transfer reference"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Notes
          </label>

          <textarea
            rows={3}
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
            placeholder="Optional transfer notes..."
            className={textareaClass}
          />
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">
            Accounting treatment
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-800">
            Internal transfers do not count as revenue or expense. The system
            creates one TRANSFER OUT entry for the source account and one
            TRANSFER IN entry for the destination account.
          </p>
        </div>

        <button
          type="submit"
          disabled={
            submitting ||
            destinationAccounts.length === 0
          }
          className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Posting..."
            : "Post Transfer"}
        </button>
      </form>
    </section>
  );
}

const labelClass =
  "mb-1.5 block text-sm font-semibold text-slate-700";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50 disabled:bg-slate-50 disabled:text-slate-400";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";