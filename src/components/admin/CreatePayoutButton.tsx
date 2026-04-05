"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  agentId: string;
};

export function CreatePayoutButton({ agentId }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Failed to create payout."
        );
        return;
      }

      if (typeof data?.payoutId === "string" && data.payoutId.length > 0) {
        router.push(`/admin/payouts/${data.payoutId}`);
        router.refresh();
        return;
      }

      router.refresh();
    } catch (err) {
      console.error("CREATE_PAYOUT_CLIENT_ERROR", err);
      setError("Unexpected error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <button
        type="button"
        onClick={handleCreate}
        disabled={isSubmitting}
        className="rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creating payout..." : "Create & Lock Payout"}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}