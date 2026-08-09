"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BankAccountForm() {
  const router =
    useRouter();

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    setSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/admin/bank-accounts",
          {
            method: "POST",
            body: formData,
          },
        );

      const data =
        (await response
          .json()
          .catch(
            () => null,
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
            "Failed to save bank account.",
        );
      }

      toast.success(
        "Bank account created.",
      );

      form.reset();

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save bank account.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
          New Account
        </p>

        <h2 className="mt-1 text-lg font-bold text-[#001F3F]">
          Add Bank or Cash
          Account
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Enter the account&apos;s
          starting balance. Current
          balances are calculated from
          the Bank Ledger and cannot
          be entered manually.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label
              htmlFor="bank-account-name"
              className={labelClass}
            >
              Account Name *
            </label>

            <input
              id="bank-account-name"
              name="name"
              required
              className={inputClass}
              placeholder="EUR Operating Account"
            />
          </div>

          <div>
            <label
              htmlFor="bank-account-currency"
              className={labelClass}
            >
              Currency *
            </label>

            <input
              id="bank-account-currency"
              name="currency"
              defaultValue="EUR"
              maxLength={3}
              required
              className={`${inputClass} uppercase`}
            />

            <p className="mt-1.5 text-xs text-slate-400">
              ISO currency code,
              e.g. EUR, USD, GBP.
            </p>
          </div>

          <div>
            <label
              htmlFor="bank-opening-balance"
              className={labelClass}
            >
              Opening Balance
            </label>

            <input
              id="bank-opening-balance"
              name="openingBalance"
              type="number"
              step="0.01"
              defaultValue="0"
              className={inputClass}
            />

            <p className="mt-1.5 text-xs text-slate-400">
              Starting balance before
              ERP ledger movements.
            </p>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={
                submitting
              }
              className="h-11 w-full rounded-xl bg-[#8B0000] px-4 text-sm font-semibold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Creating..."
                : "Add Account"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="bank-account-notes"
            className={labelClass}
          >
            Notes
          </label>

          <textarea
            id="bank-account-notes"
            name="notes"
            rows={3}
            placeholder="Optional notes"
            className={textareaClass}
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked
            className="h-4 w-4"
          />

          Active and available for
          finance transactions
        </label>
      </form>
    </section>
  );
}

const labelClass =
  "mb-1.5 block text-sm font-semibold text-slate-700";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";