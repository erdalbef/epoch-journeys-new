"use client";

export function ExportPayoutsButton() {
  function handleExport() {
    window.location.href = "/api/admin/payouts/export";
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
    >
      Export CSV
    </button>
  );
}