"use client";

type Props = {
  label: string;
  value: string;
  highlight?: boolean;
};

export default function CostSummaryCard({
  label,
  value,
  highlight = false,
}: Props) {
  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        highlight ? "bg-slate-50 border-slate-300" : ""
      }`}
    >
      <div
        className={`${
          highlight ? "font-medium text-slate-700" : "text-slate-600"
        }`}
      >
        {label}
      </div>

      <div
        className={`mt-1 ${
          highlight ? "text-base font-bold" : "font-semibold"
        }`}
      >
        {value}
      </div>
    </div>
  );
}