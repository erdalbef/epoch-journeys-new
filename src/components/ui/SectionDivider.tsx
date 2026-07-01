interface SectionDividerProps {
  color?: "gold" | "white";
}

export default function SectionDivider({
  color = "gold",
}: SectionDividerProps) {
  const line =
    color === "gold" ? "bg-yellow-400" : "bg-white/70";

  const cross =
    color === "gold"
      ? "text-yellow-500"
      : "text-white";

  return (
    <div className="flex w-full max-w-xs items-center gap-4">
      <div className={`h-px flex-1 ${line}`} />

      <span className={`text-lg ${cross}`}>✠</span>

      <div className={`h-px flex-1 ${line}`} />
    </div>
  );
}