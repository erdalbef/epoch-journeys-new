"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Account = {
  id: string;
  name: string;
  currency: string;
  openingBalance: number;
};

type Props = {
  accounts: Account[];
};

export default function ReconciliationForm({ accounts }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      bankAccountId: String(formData.get("bankAccountId") || ""),
      statementDate: String(formData.get("statementDate") || ""),
      statementOpeningBalance: Number(
        formData.get("statementOpeningBalance") || 0,
      ),
      statementClosingBalance: Number(
        formData.get("statementClosingBalance") || 0,
      ),
      notes: String(formData.get("notes") || ""),
    };

    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/finance/reconciliation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
        reconciliation?: {
          id: string;
        };
      } | null;

      if (!response.ok || !data?.success || !data.reconciliation?.id) {
        throw new Error(
          data?.error || "Failed to create bank reconciliation.",
        );
      }

      toast.success("Bank reconciliation created.");

      router.push(
        `/admin/finance/reconciliation/${data.reconciliation.id}`,
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create bank reconciliation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
          New Statement
        </p>

        <h2 className="mt-1 text-lg font-bold text-[#001F3F]">
          Start Bank Reconciliation
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Create one reconciliation per statement period. Complete and lock the
          current reconciliation before starting the next period for the same
          account.
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No active bank or cash accounts are available.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="bankAccountId" className={labelClass}>
                Bank / Cash Account *
              </label>

              <select
                id="bankAccountId"
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
              <label htmlFor="statementDate" className={labelClass}>
                Statement Date *
              </label>

              <input
                id="statementDate"
                name="statementDate"
                type="date"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="statementOpeningBalance"
                className={labelClass}
              >
                Statement Opening Balance *
              </label>

              <input
                id="statementOpeningBalance"
                name="statementOpeningBalance"
                type="number"
                step="0.01"
                defaultValue="0"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="statementClosingBalance"
                className={labelClass}
              >
                Statement Closing Balance *
              </label>

              <input
                id="statementClosingBalance"
                name="statementClosingBalance"
                type="number"
                step="0.01"
                defaultValue="0"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Optional reconciliation notes"
              className={textareaClass}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Reconciliation"}
            </button>
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

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
