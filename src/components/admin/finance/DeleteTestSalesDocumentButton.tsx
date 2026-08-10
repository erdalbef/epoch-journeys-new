"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  documentId: string;
  documentNumber: string | null;
  documentType: string;
  bookingReference?: string | null;
};

export default function DeleteTestSalesDocumentButton({
  documentId,
  documentNumber,
  documentType,
  bookingReference,
}: Props) {
  const router = useRouter();

  const [deleting, setDeleting] =
    useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `DELETE TEST SALES DOCUMENT?\n\n` +
        `Type: ${documentType}\n` +
        `Number: ${documentNumber || "Draft"}\n` +
        `Booking: ${bookingReference || "-"}\n\n` +
        `This permanently removes this TEST document.\n\n` +
        `Do not use this for a real accounting invoice.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/admin/finance/sales-documents/${documentId}`,
        {
          method: "DELETE",
        },
      );

      const result =
        (await response.json()) as {
          success?: boolean;
          message?: string;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to delete test sales document.",
        );
      }

      toast.success(
        result.message ||
          "Test sales document deleted.",
      );

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete test sales document.";

      toast.error(message, {
        duration: 10000,
      });

      window.alert(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {deleting
        ? "Deleting..."
        : "Delete Test"}
    </button>
  );
}