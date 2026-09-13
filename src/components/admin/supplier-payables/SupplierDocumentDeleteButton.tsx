"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  documentId: string;
  fileName?: string | null;
  compact?: boolean;
};

export default function SupplierDocumentDeleteButton({
  documentId,
  fileName,
  compact = false,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function removeDocument() {
    const confirmed = window.confirm(
      fileName
        ? `Delete "${fileName}"? The stored file will also be permanently removed. This cannot be undone.`
        : "Delete this supplier document? The stored file will also be permanently removed. This cannot be undone.",
    );

    if (!confirmed || deleting) return;

    setDeleting(true);

    try {
      const response = await fetch(
        `/api/admin/finance/documents/${documentId}`,
        { method: "DELETE" },
      );

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Failed to delete supplier document.",
        );
      }

      toast.success("Supplier document removed.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete supplier document.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={removeDocument}
      disabled={deleting}
      className={
        compact
          ? "inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          : "inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      <Trash2 className="h-4 w-4" />
      {deleting ? "Removing..." : "Remove"}
    </button>
  );
}
