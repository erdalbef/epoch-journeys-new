"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminAgentActionsProps = {
  agentId: string;
  approved: boolean;
};

export function AdminAgentActions({
  agentId,
  approved,
}: AdminAgentActionsProps) {
  const router = useRouter();
  const [approveLoading, setApproveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setApproveLoading(true);

      const res = await fetch(`/api/admin/agents/${agentId}/approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Approve failed");
        return;
      }

      alert(data.message || "Agent approved successfully.");
      router.refresh();
    } catch (error) {
      console.error("APPROVE_AGENT_CLIENT_ERROR", error);
      alert("Approve failed");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this partner? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeleteLoading(true);

      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Delete failed");
        return;
      }

      alert(data.message || "Partner deleted successfully.");
      router.push("/admin/agents");
      router.refresh();
    } catch (error) {
      console.error("DELETE_AGENT_CLIENT_ERROR", error);
      alert("Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!approved && (
        <button
          type="button"
          onClick={handleApprove}
          disabled={approveLoading || deleteLoading}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {approveLoading ? "Approving..." : "Approve"}
        </button>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={approveLoading || deleteLoading}
        className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleteLoading ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}