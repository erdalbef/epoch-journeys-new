"use client";

import { useTransition } from "react";

export function ApproveAgentButton({ agentId }: { agentId: string }) {
  const [isPending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/agents/${agentId}/approve`, {
          method: "POST",
        });

        const data: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          const msg =
            typeof data === "object" && data && "error" in data
              ? String((data as { error?: unknown }).error ?? "Approve failed")
              : "Approve failed";
          alert(msg);
          return;
        }

        // Move the agent between lists by reloading the server page
        window.location.reload();
      } catch (e) {
        alert("Network error. Please try again.");
        console.error(e);
      }
    });
  }

  return (
    <button
      onClick={approve}
      disabled={isPending}
      className="rounded-md bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
    >
      {isPending ? "Approving..." : "Approve"}
    </button>
  );
}
