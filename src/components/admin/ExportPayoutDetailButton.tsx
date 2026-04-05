"use client";

type Props = {
  payoutId: string;
};

export function ExportPayoutDetailButton({ payoutId }: Props) {
  return (
    <a
      href={`/api/admin/payouts/${payoutId}/export`}
      className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
    >
      Export Payout CSV
    </a>
  );
}