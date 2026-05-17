"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      }? This cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "DELETE",
      });

      const data: { ok?: boolean; error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete booking.");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Something went wrong while deleting the booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Removing..." : "Remove"}
    </button>
  );
}