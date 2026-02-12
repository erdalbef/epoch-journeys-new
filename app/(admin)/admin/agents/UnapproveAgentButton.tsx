"use client";

import { useTransition } from "react";

export function UnapproveAgentButton({ agentId }: { agentId: string }) {
  const [isPending, startTransition] = useTransition();

  function unapprove() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/agents/${agentId}/unapprove`, {
          method: "POST",
        });

        const data: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          const msg =
            typeof data === "object" && data && "error" in data
              ? String((data as { error?: unknown }).error ?? "Unapprove failed")
              : "Unapprove failed";
          alert(msg);
          return;
        }

        window.location.reload();
      } catch (e) {
        alert("Network error. Please try again.");
        console.error(e);
      }
    });
  }

  return (
    <button
      onClick={unapprove}
      disabled={isPending}
      className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
    >
      {isPending ? "Unapproving..." : "Unapprove"}
    </button>
  );
}
