"use client";

import { useState, useTransition } from "react";
import { CustomRequestStatus } from "@prisma/client";

type Props = {
  id: string;
  currentStatus: CustomRequestStatus;
  currentReply: string;
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function UpdateRequestForm({
  id,
  currentStatus,
  currentReply,
}: Props) {
  const [status, setStatus] = useState<CustomRequestStatus>(currentStatus);
  const [reply, setReply] = useState(currentReply);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/custom-requests/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            adminReply: reply,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          setMessage(errorText || "Failed to update request.");
          return;
        }

        setMessage("Request updated successfully. Email notification sent if changes were detected.");
      } catch {
        setMessage("Something went wrong while saving the update.");
      }
    });
  };

  return (
    <div className="space-y-4 rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Update Request</h2>

      <div>
        <label className="text-sm text-slate-600">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CustomRequestStatus)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          {Object.values(CustomRequestStatus).map((value) => (
            <option key={value} value={value}>
              {formatLabel(value)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-slate-600">Admin Reply</label>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="mt-1 min-h-35 w-full rounded border px-3 py-2"
        />
      </div>

      {message ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="rounded bg-[#8B0000] px-4 py-2 text-white hover:bg-[#6f0000] disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}