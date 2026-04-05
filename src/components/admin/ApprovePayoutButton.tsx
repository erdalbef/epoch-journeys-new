"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  payoutId: string;
  status: string;
};

export function ApprovePayoutButton({ payoutId, status }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show button if payout is still pending
  if (status !== "PENDING") return null;

  async function handleApprove() {
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/approve`, {
        method: "PATCH",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Failed to approve payout."
        );
        return;
      }

      router.refresh();
    } catch (err) {
      console.error("APPROVE_PAYOUT_CLIENT_ERROR", err);
      setError("Unexpected error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <button
        type="button"
        onClick={handleApprove}
        disabled={isSubmitting}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Approving..." : "Approve"}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}