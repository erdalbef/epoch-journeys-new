type BreakdownLine = {
  label: string;
  value: string | number;
};

type Props = {
  title: string;
  lines: BreakdownLine[];
  totalLabel?: string;
  total: string | number;
};

export default function CostBreakdownCard({
  title,
  lines,
  totalLabel = "Total",
  total,
}: Props) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>

      <div className="space-y-1">
        {lines.map((line, index) => (
          <div
            key={`${line.label}-${index}`}
            className="flex items-center justify-between gap-3 text-xs text-slate-600"
          >
            <span>{line.label}</span>
            <span className="font-medium text-slate-800">{line.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t pt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-600">
            {totalLabel}
          </span>
          <span className="text-base font-semibold text-slate-900">
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}