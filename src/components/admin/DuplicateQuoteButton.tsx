"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  quoteId: string;
};

export default function DuplicateQuoteButton({ quoteId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDuplicate() {
    try {
      setLoading(true);

      const res = await fetch(`/api/quotes/${quoteId}/duplicate`, {
        method: "POST",
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        quote?: { id: string };
      };

      if (!res.ok || !data.ok || !data.quote?.id) {
        throw new Error(data.error || "Failed to duplicate quote.");
      }

      router.push(`/admin/quotes/${data.quote.id}`);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Failed to duplicate quote."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={loading}
      className="text-slate-700 hover:underline disabled:opacity-50"
    >
      {loading ? "Duplicating..." : "Duplicate"}
    </button>
  );
}