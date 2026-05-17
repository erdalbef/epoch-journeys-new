"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  quoteId: string;
};

export default function DeleteQuoteButton({ quoteId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this draft quote?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "DELETE",
      });

      let data: { ok?: boolean; error?: string } | null = null;

      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text) as { ok?: boolean; error?: string };
        } catch {
          throw new Error("Server returned an invalid response.");
        }
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to delete quote.");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Failed to delete quote."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:underline disabled:opacity-50"
    >
      {loading ? "Removing..." : "Remove"}
    </button>
  );
}