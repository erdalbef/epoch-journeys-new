"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  quoteId: string;
  currentStatus: string;
};

type UpdateResponse = {
  ok?: boolean;
  error?: string;
  quote?: {
    id: string;
    status: string;
    sentAt: string | null;
    expiresAt: string | null;
    convertedAt: string | null;
  };
};

export default function UpdateQuoteStatusButton({
  quoteId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  async function handleUpdate(newStatus: string) {
    if (loading || newStatus === currentStatus) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/quotes/${quoteId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      let data: UpdateResponse = {};

      if (contentType.includes("application/json")) {
        data = (await res.json()) as UpdateResponse;
      } else {
        const text = await res.text();
        throw new Error(
          text || `Server returned non-JSON response (${res.status}).`
        );
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update quote status.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Failed to update quote status:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while updating the quote status."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => handleUpdate("DRAFT")}
        disabled={loading || currentStatus === "DRAFT"}
        className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && currentStatus !== "DRAFT" ? "Updating..." : "Draft"}
      </button>

      <button
        type="button"
        onClick={() => handleUpdate("SENT")}
        disabled={loading || currentStatus === "SENT"}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && currentStatus !== "SENT" ? "Updating..." : "Sent"}
      </button>

      <button
        type="button"
        onClick={() => handleUpdate("FINALIZED")}
        disabled={loading || currentStatus === "FINALIZED"}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && currentStatus !== "FINALIZED" ? "Updating..." : "Finalize"}
      </button>

      <button
        type="button"
        onClick={() => handleUpdate("CONVERTED")}
        disabled={loading || currentStatus === "CONVERTED"}
        className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && currentStatus !== "CONVERTED" ? "Updating..." : "Convert"}
      </button>

      <button
        type="button"
        onClick={() => handleUpdate("CANCELLED")}
        disabled={loading || currentStatus === "CANCELLED"}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && currentStatus !== "CANCELLED" ? "Updating..." : "Cancel"}
      </button>
    </div>
  );
}