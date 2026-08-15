"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BankAccount } from "@prisma/client";
import { toast } from "sonner";

type Props = {
  account: BankAccount;
};

export default function BankAccountActions({ account }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  async function updateAccount(formData: FormData) {
    const res = await fetch(`/api/admin/bank-accounts/${account.id}`, {
      method: "PATCH",
      body: formData,
    });

    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
    } | null;

    if (!res.ok || !data?.success) {
      toast.error(data?.error || "Failed to update bank account.");
      return;
    }

    toast.success("Bank account updated.");
    setIsEditing(false);
    router.refresh();
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateAccount(new FormData(event.currentTarget));
  }

  async function setActiveAccount() {
    const formData = new FormData();
    formData.set("setActiveOnly", "true");

    await updateAccount(formData);
  }

  async function deleteAccount() {
    if (!confirm("Delete this bank account?")) return;

    const res = await fetch(`/api/admin/bank-accounts/${account.id}`, {
      method: "DELETE",
    });

    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
    } | null;

    if (!res.ok || !data?.success) {
      toast.error(data?.error || "Failed to delete bank account.");
      return;
    }

    toast.success("Bank account deleted.");
    router.refresh();
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleEditSubmit}
        className="min-w-[360px] space-y-3 rounded-xl border bg-slate-50 p-4 text-left"
      >
        <input
          name="name"
          defaultValue={account.name}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        <input
          name="currency"
          defaultValue={account.currency}
          maxLength={3}
          className="w-full rounded-lg border px-3 py-2 text-sm uppercase"
        />

        <input
          name="openingBalance"
          type="number"
          step="0.01"
          defaultValue={account.openingBalance}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        <input
          name="currentBalance"
          type="number"
          step="0.01"
          defaultValue={account.currentBalance}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        <textarea
          name="notes"
          defaultValue={account.notes || ""}
          rows={2}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={account.isActive}
          />
          Active
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-lg bg-[#8B0000] px-3 py-2 text-sm text-white"
          >
            Save
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex justify-end gap-3 whitespace-nowrap">
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-blue-600 hover:underline"
      >
        Edit
      </button>

      {!account.isActive && (
        <button
          type="button"
          onClick={setActiveAccount}
          className="text-green-700 hover:underline"
        >
          Set Active
        </button>
      )}

      <button
        type="button"
        onClick={deleteAccount}
        className="text-red-600 hover:underline"
      >
        Delete
      </button>
    </div>
  );
}