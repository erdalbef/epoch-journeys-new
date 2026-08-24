"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  statementId: string;
  fileName: string;
};

export default function DeleteBankStatementButton({
  statementId,
  fileName,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete bank statement "${fileName}"? This will delete only the imported statement and its statement lines. Finance Ledger transactions will not be deleted.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        `/api/admin/finance/bank-statements/${statementId}`,
        {
          method: "DELETE",
        },
      );

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Failed to delete bank statement.",
        );
      }

      toast.success("Bank statement deleted.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete bank statement.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="font-semibold text-red-700 hover:underline disabled:opacity-50"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
