"use client";

import {
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import { toast } from "sonner";

type Account = {
  id: string;
  name: string;
  currency: string;

  openingBalance: number;
  currentBalance: number;

  isActive: boolean;

  notes:
    | string
    | null;

  hasLedgerActivity: boolean;
};

type Props = {
  account: Account;
};

export default function BankAccountActions({
  account,
}: Props) {
  const router =
    useRouter();

  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    changingStatus,
    setChangingStatus,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  async function updateAccount(
    formData: FormData,
  ) {
    const response =
      await fetch(
        `/api/admin/bank-accounts/${account.id}`,
        {
          method:
            "PATCH",

          body:
            formData,
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
          "Failed to update bank account.",
      );
    }
  }

  async function handleEditSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);

    try {
      await updateAccount(
        new FormData(
          event.currentTarget,
        ),
      );

      toast.success(
        "Bank account updated.",
      );

      setIsEditing(
        false,
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update bank account.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    setChangingStatus(
      true,
    );

    try {
      const formData =
        new FormData();

      formData.set(
        "toggleActive",
        "true",
      );

      await updateAccount(
        formData,
      );

      toast.success(
        account.isActive
          ? "Bank account deactivated."
          : "Bank account activated.",
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to change account status.",
      );
    } finally {
      setChangingStatus(
        false,
      );
    }
  }

  async function deleteAccount() {
    const confirmed =
      window.confirm(
        "Delete this bank account? Accounts with finance history cannot be deleted.",
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response =
        await fetch(
          `/api/admin/bank-accounts/${account.id}`,
          {
            method:
              "DELETE",
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
            "Failed to delete bank account.",
        );
      }

      toast.success(
        "Bank account deleted.",
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete bank account.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <form
        onSubmit={
          handleEditSubmit
        }
        className="ml-auto w-[320px] space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-lg"
      >
        <div>
          <label className={labelClass}>
            Account Name
          </label>

          <input
            name="name"
            defaultValue={
              account.name
            }
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            Currency
          </label>

          <input
            name="currency"
            defaultValue={
              account.currency
            }
            maxLength={3}
            readOnly={
              account.hasLedgerActivity
            }
            className={`${inputClass} uppercase ${
              account.hasLedgerActivity
                ? "bg-slate-100 text-slate-500"
                : ""
            }`}
          />

          {account.hasLedgerActivity && (
            <p className="mt-1 text-xs text-amber-700">
              Currency is locked
              because this account
              already has finance
              history.
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            Opening Balance
          </label>

          <input
            name="openingBalance"
            type="number"
            step="0.01"
            defaultValue={
              account.openingBalance
            }
            readOnly={
              account.hasLedgerActivity
            }
            className={`${inputClass} ${
              account.hasLedgerActivity
                ? "bg-slate-100 text-slate-500"
                : ""
            }`}
          />

          {account.hasLedgerActivity && (
            <p className="mt-1 text-xs text-amber-700">
              Opening balance is
              locked after ledger
              activity exists. Use an
              adjustment transaction
              for later corrections.
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            Current Balance
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            {account.currentBalance.toFixed(
              2,
            )}{" "}
            {
              account.currency
            }
          </div>

          <p className="mt-1 text-xs text-slate-400">
            System field. Not
            manually editable.
          </p>
        </div>

        <div>
          <label className={labelClass}>
            Notes
          </label>

          <textarea
            name="notes"
            defaultValue={
              account.notes ||
              ""
            }
            rows={3}
            className={textareaClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={
              account.isActive
            }
          />

          Active
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() =>
              setIsEditing(
                false,
              )
            }
            disabled={saving}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#8B0000] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex justify-end gap-3 whitespace-nowrap">
      <button
        type="button"
        onClick={() =>
          setIsEditing(
            true,
          )
        }
        className="font-medium text-blue-600 hover:underline"
      >
        Edit
      </button>

      <button
        type="button"
        onClick={
          toggleStatus
        }
        disabled={
          changingStatus
        }
        className={
          account.isActive
            ? "font-medium text-amber-700 hover:underline disabled:opacity-50"
            : "font-medium text-green-700 hover:underline disabled:opacity-50"
        }
      >
        {changingStatus
          ? "Saving..."
          : account.isActive
            ? "Deactivate"
            : "Activate"}
      </button>

      <button
        type="button"
        onClick={
          deleteAccount
        }
        disabled={
          deleting
        }
        className="font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        {deleting
          ? "Deleting..."
          : "Delete"}
      </button>
    </div>
  );
}

const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#8B0000]";

const textareaClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#8B0000]";