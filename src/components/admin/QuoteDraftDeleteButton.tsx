"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  quoteId: string;
  quoteReference: string;
};

type DeleteResponse = { ok?: boolean; error?: string };

export default function QuoteDraftDeleteButton({ quoteId, quoteReference }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting) return;

    // Explicit consent is required for a permanent deletion.
    if (!window.confirm(
      `Permanently delete draft quotation ${quoteReference}?\n\nThis cannot be undone. Finalized, sent and converted quotes cannot be deleted.`
    )) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
        method: "DELETE",
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new Error(`Delete failed: server returned HTTP ${response.status} instead of JSON.`);
      }

      const data = (await response.json()) as DeleteResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not delete the draft quotation.");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not delete the quotation.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      aria-label={`Delete draft quotation ${quoteReference}`}
      className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
