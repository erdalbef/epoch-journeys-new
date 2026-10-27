"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteSupplierButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function deleteSupplier() {
    const typed = window.prompt(`PERMANENT DELETE: Type the supplier name exactly to confirm deletion.\n\n${name}\n\nSuppliers with contacts, services, rates, contracts, Mass arrangements or financial records cannot be deleted.`);
    if (typed === null) return;
    if (typed.trim() !== name.trim()) {
      setError("Deletion cancelled: supplier name did not match.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/suppliers/${id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw Error(result.error || "Could not delete supplier.");
      router.push("/admin/suppliers");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete supplier.");
    } finally { setWorking(false); }
  }

  return <div className="flex flex-col items-end gap-2">
    <button type="button" disabled={working} onClick={() => { void deleteSupplier(); }}
      className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 disabled:opacity-50">
      {working ? "Deleting..." : "Delete Supplier"}
    </button>
    {error && <p role="alert" className="max-w-xs rounded-lg bg-red-50 p-2 text-right text-xs font-medium text-red-800">{error}</p>}
  </div>;
}
