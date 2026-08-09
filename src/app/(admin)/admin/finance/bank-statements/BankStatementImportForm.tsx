"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Account = {
  id: string;
  name: string;
  currency: string;
};

type Props = {
  accounts: Account[];
};

export default function BankStatementImportForm({ accounts }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/finance/bank-statements", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        statement?: {
          id: string;
          importedLines: number;
        };
      } | null;

      if (!response.ok || !data?.success || !data.statement?.id) {
        throw new Error(
          data?.error || "Failed to import bank statement.",
        );
      }

      toast.success(
        `Bank statement imported with ${data.statement.importedLines} line${
          data.statement.importedLines === 1 ? "" : "s"
        }.`,
      );

      router.push(
        `/admin/finance/bank-statements/${data.statement.id}`,
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to import bank statement.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
          Import Statement
        </p>

        <h2 className="mt-1 text-lg font-bold text-[#001F3F]">
          Upload CSV Statement
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Supported layouts include either Amount + Direction or separate
          Debit / Credit columns. Common Date, Value Date, Description,
          Reference, Balance, Debit, Credit, Amount and Direction headers are
          detected automatically.
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No active bank or cash accounts are available.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className={labelClass}>
                Bank / Cash Account *
              </label>

              <select
                name="bankAccountId"
                required
                defaultValue=""
                className={inputClass}
              >
                <option value="" disabled>
                  Select account
                </option>

                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.currency}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Statement Date *
              </label>

              <input
                name="statementDate"
                type="date"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Opening Balance
              </label>

              <input
                name="openingBalance"
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="Optional"
              />
            </div>

            <div>
              <label className={labelClass}>
                Closing Balance
              </label>

              <input
                name="closingBalance"
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="Optional"
              />
            </div>

            <div>
              <label className={labelClass}>
                Currency *
              </label>

              <input
                name="currency"
                defaultValue="EUR"
                maxLength={3}
                required
                className={`${inputClass} uppercase`}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <div>
              <label className={labelClass}>
                CSV File *
              </label>

              <input
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
                className="block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold"
              />
            </div>

            <div>
              <label className={labelClass}>
                Notes
              </label>

              <input
                name="notes"
                className={inputClass}
                placeholder="Optional statement notes"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="h-11 rounded-xl bg-[#8B0000] px-5 text-sm font-semibold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Importing..." : "Import CSV"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            Recommended headers: <strong>Date</strong>,{" "}
            <strong>Description</strong>, <strong>Reference</strong>,{" "}
            <strong>Debit</strong>, <strong>Credit</strong>, and{" "}
            <strong>Balance</strong>. Alternatively use{" "}
            <strong>Amount</strong> and <strong>Direction</strong> where
            Direction is IN / OUT, CREDIT / DEBIT, or similar.
          </div>
        </form>
      )}
    </section>
  );
}

const labelClass =
  "mb-1.5 block text-sm font-semibold text-slate-700";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
