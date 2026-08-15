"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Edit3,
  Loader2,
  Trash2,
} from "lucide-react";

type Props = {
  documentId: string;
  year: number;
  month: number;
  category?: string | null;
};

export default function AccountingDocumentActions({
  documentId,
  year,
  month,
  category,
}: Props) {
  const router = useRouter();

  const [deleting, setDeleting] =
    useState(false);

  const editHref =
    `/admin/accounting/documents/${documentId}/edit` +
    `?year=${year}&month=${month}` +
    (category
      ? `&category=${encodeURIComponent(category)}`
      : "");

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this accounting document?\n\n" +
        "The database record and uploaded file will both be permanently deleted."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/admin/accounting/documents/${documentId}`,
        {
          method: "DELETE",
        }
      );

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to delete the document."
        );
      }

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete the document.";

      window.alert(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={editHref}
        className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-[#0B1F3A] transition hover:bg-slate-50"
      >
        <Edit3 className="h-4 w-4" />
        Edit
      </Link>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}

        {deleting
          ? "Deleting..."
          : "Delete"}
      </button>
    </div>
  );
}