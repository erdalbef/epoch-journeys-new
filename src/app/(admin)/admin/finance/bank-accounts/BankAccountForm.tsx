"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BankAccountForm() {
  const router = useRouter();

  async function handleSubmit(
    event: React.SyntheticEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const res = await fetch("/api/admin/bank-accounts", {
      method: "POST",
      body: formData,
    });

    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
    } | null;

    if (!res.ok || !data?.success) {
      toast.error(data?.error || "Failed to save bank account.");
      return;
    }

    toast.success("Bank account saved.");
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Account Name *
          </label>

          <input
            name="name"
            required
            placeholder="Epoch EUR Account"
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-[#8B0000]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Currency
          </label>

          <input
            name="currency"
            defaultValue="EUR"
            maxLength={3}
            className="w-full rounded-xl border px-4 py-2.5 text-sm uppercase outline-none focus:border-[#8B0000]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Opening Balance
          </label>

          <input
            name="openingBalance"
            type="number"
            step="0.01"
            defaultValue="0"
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-[#8B0000]"
          />

          <p className="mt-1.5 text-xs text-slate-500">
            Enter the account balance immediately before Epoch starts tracking
            transactions in this ledger.
          </p>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6f0000]"
          >
            Add Bank Account
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Notes
        </label>

        <textarea
          name="notes"
          rows={3}
          placeholder="Optional notes"
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked />
        Active bank account
      </label>
    </form>
  );
}
