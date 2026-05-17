"use client";

import { useMemo } from "react";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type: "includes" | "excludes";
};

const INCLUDE_SUGGESTIONS = [
  "Accommodation in selected hotels",
  "Daily breakfast",
  "Daily dinner",
  "Private airport transfers",
  "Private deluxe motor coach",
  "Professional English-speaking guide",
  "Entrance fees as per itinerary",
  "Tour manager",
  "Porterage at hotels",
  "Whisper audio system",
  "Daily Mass arrangements",
];

const EXCLUDE_SUGGESTIONS = [
  "International airfare",
  "Travel insurance",
  "Lunches",
  "Personal expenses",
  "Tips to guide and driver",
  "Beverages with meals",
  "Items not mentioned in the itinerary",
  "Visa fees",
  "Optional tours",
  "Early check-in / late check-out",
];

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(lines: string[]): string {
  return lines.join("\n");
}

export default function IncludesExcludesBuilder({
  label,
  value,
  onChange,
  type,
}: Props) {
  const suggestions = useMemo(
    () => (type === "includes" ? INCLUDE_SUGGESTIONS : EXCLUDE_SUGGESTIONS),
    [type]
  );

  const selectedLines = useMemo(() => splitLines(value), [value]);

  function toggleLine(line: string) {
    const exists = selectedLines.includes(line);

    const nextLines = exists
      ? selectedLines.filter((item) => item !== line)
      : [...selectedLines, line];

    onChange(joinLines(nextLines));
  }

  function handleTextareaChange(text: string) {
    onChange(text);
  }

  return (
    <div className="space-y-4">
      {label ? (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {suggestions.map((line) => {
          const selected = selectedLines.includes(line);

          return (
            <button
              key={line}
              type="button"
              onClick={() => toggleLine(line)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                selected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {line}
            </button>
          );
        })}
      </div>

      <textarea
        className="min-h-45 w-full resize-y rounded-md border p-4 text-sm leading-relaxed"
        placeholder={
          type === "includes"
            ? "Enter included services, one per line"
            : "Enter excluded services, one per line"
        }
        value={value}
        onChange={(e) => handleTextareaChange(e.target.value)}
      />
    </div>
  );
}