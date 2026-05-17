"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConvertQuoteButton({ quoteId }: { quoteId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleConvert() {
    const confirmed = window.confirm("Convert this quote into a booking?");
    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/quotes/${quoteId}/convert`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to convert quote.");
      }

      // 👉 if your API returns bookingId
      if (data.booking?.id) {
        router.push(`/admin/bookings/${data.booking.id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Failed to convert quote."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConvert}
      disabled={loading}
      className="text-emerald-700 hover:underline disabled:opacity-50"
    >
      {loading ? "Converting..." : "Convert"}
    </button>
  );
}