"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  bookingId: string;
  bookingReference: string | null;
};

export default function DeleteBookingButton({
  bookingId,
  bookingReference,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete booking ${
        bookingReference || bookingId
      }?\n\nThis cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/admin/bookings/${bookingId}`,
        {
          method: "DELETE",
        },
      );

      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        blockers?: {
          payments?: number;
          expenses?: number;
          financeEntries?: number;
          supplierPayables?: number;
          bankTransactions?: number;
          refunds?: number;
          financeDocuments?: number;
          salesDocuments?: number;
          partnerPayout?: boolean;
        };
      };

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to delete booking.",
        );
      }

      toast.success(
        data.message || "Booking deleted successfully.",
      );

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete booking.";

      console.error("DELETE_BOOKING_CLIENT_ERROR", error);

      toast.error(message, {
        duration: 10000,
      });

      /*
       * Also show a browser alert because the blocker message
       * can contain several lines and is important during test cleanup.
       */
      window.alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Removing..." : "Remove"}
    </button>
  );
}