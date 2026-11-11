"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  ticketId: string;
  archived: boolean;
  onSuccess?: () => void | Promise<void>;
};

export function SupportArchiveButton({
  ticketId,
  archived,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleAction() {
    const action = archived ? "restore" : "archive";

    const warning = archived
      ? "Restore this support ticket to your active list?"
      : "Archive this support ticket? The conversation and attachments will be preserved. You can restore it later.";

    if (!window.confirm(warning)) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/support/tickets/${encodeURIComponent(ticketId)}/archive`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Action failed.");
      }

      if (onSuccess) {
        await onSuccess();
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Action failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-2">
      <button
        type="button"
        onClick={handleAction}
        disabled={busy}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy
          ? "Processing..."
          : archived
            ? "Restore Ticket"
            : "Archive Ticket"}
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
