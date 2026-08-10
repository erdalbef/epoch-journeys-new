"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type DeleteAgentButtonProps = {
  agentId: string;
  agentEmail: string;
};

export function DeleteAgentButton({
  agentId,
  agentEmail,
}: DeleteAgentButtonProps) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] =
    useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete ${agentEmail}?\n\n` +
        "Use this only for test, duplicate, or unused partner accounts.\n\n" +
        "This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);

      const response = await fetch(
        `/api/admin/agents/${agentId}/delete`,
        {
          method: "DELETE",
        },
      );

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to delete partner.",
        );
      }

      toast.success("Partner deleted.");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete partner.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}