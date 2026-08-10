"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  bookingId: string;
  paymentId: string;
  amount: number;
  currency: string;
  reference?: string | null;
};

export default function DeleteTestPaymentButton({
  bookingId,
  paymentId,
  amount,
  currency,
  reference,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete this TEST payment?\n\n` +
        `${amount.toFixed(2)} ${currency}\n` +
        `${reference ? `Reference: ${reference}\n` : ""}\n` +
        `This will also remove its unused test bank transaction.\n\n` +
        `Do not use this for real customer payments.`,
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/admin/bookings/${bookingId}/payments/${paymentId}`,
        {
          method: "DELETE",
        },
      );

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to delete test payment.",
        );
      }

      toast.success(
        result.message || "Test payment deleted.",
      );

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete test payment.";

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
      className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {deleting ? "Deleting..." : "Delete Test Payment"}
    </button>
  );
}