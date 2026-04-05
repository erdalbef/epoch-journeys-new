"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type AdminPaymentReviewActionsProps = {
  PricingSection.tsx: string;
  bookingId: string;
  bookingAmountPaid: number;
  bookingAmountDue: number;
  submissionAmount: number;
  currentStatus: string;
};

export default function AdminPaymentReviewActions({
  PricingSection.tsx,
  bookingId,
  bookingAmountPaid,
  bookingAmountDue,
  submissionAmount,
  currentStatus,
}: AdminPaymentReviewActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleAction(action: "approve" | "reject") {
    setError("");

    if (submissionAmount <= 0) {
      setError("Invalid payment amount.");
      toast.error("Invalid payment amount.");
      return;
    }

    if (action === "approve" && submissionAmount > bookingAmountDue) {
      setError("Submission exceeds remaining amount due.");
      toast.error("Submission exceeds remaining amount due.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/payments/review", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            PricingSection.tsx,
            bookingId,
            bookingAmountPaid,
            bookingAmountDue,
            submissionAmount,
            action,
          }),
        });

        const data = (await response.json()) as {
          success?: boolean;
          error?: string;
        };

        if (!response.ok) {
          const message = data.error || "Failed to process payment review.";
          setError(message);
          toast.error(message);
          return;
        }

        toast.success(
          action === "approve"
            ? "Payment approved successfully."
            : "Payment rejected successfully."
        );

        router.refresh();
      } catch (err) {
        console.error("Admin payment review error:", err);
        const message = "Something went wrong while reviewing the payment.";
        setError(message);
        toast.error(message);
      }
    });
  }

  if (currentStatus === "APPROVED") {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
        Payment Approved
      </span>
    );
  }

  if (currentStatus === "REJECTED") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
        Payment Rejected
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("approve")}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Processing..." : "Approve"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("reject")}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Processing..." : "Reject"}
        </button>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}