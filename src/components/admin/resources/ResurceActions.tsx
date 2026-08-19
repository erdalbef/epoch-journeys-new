"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResourceStatus } from "@prisma/client";

export default function ResourceActions({
  resourceId,
  title,
  status,
  editHref,
}: {
  resourceId: string;
  title: string;
  status: ResourceStatus;
  editHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function changeStatus(nextStatus: ResourceStatus) {
    setBusy(true);

    try {
      const response = await fetch(`/api/admin/resources/${resourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        window.alert(data?.error || "Could not update resource status.");
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function removeResource() {
    const confirmed = window.confirm(
      `Permanently delete \"${title}\"?\n\nThis removes the database record and the uploaded file. This cannot be undone.`,
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const response = await fetch(`/api/admin/resources/${resourceId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        window.alert(data?.error || "Could not delete resource.");
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link
        href={editHref}
        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        Edit
      </Link>

      {status === ResourceStatus.ACTIVE ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => changeStatus(ResourceStatus.ARCHIVED)}
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          Archive
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => changeStatus(ResourceStatus.ACTIVE)}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
        >
          Restore
        </button>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={removeResource}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        Delete
      </button>
    </>
  );
}
