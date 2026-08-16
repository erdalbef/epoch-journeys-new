"use client";

import { useMemo } from "react";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  type: "includes" | "excludes";
};

const INCLUDE_SUGGESTIONS = [
  "Accommodation in selected hotels as specified in the itinerary",
  "Daily breakfast",
  "Daily dinner",
  "Lunches as specifically stated in the itinerary",
  "Private arrival and departure transfers",
  "Transportation by modern, full-size air-conditioned motorcoach",
  "Professional English-speaking local guides",
  "Professional Tour Manager throughout the itinerary",
  "Sightseeing and excursions as mentioned in the itinerary",
  "Entrance fees to all included sites",
  "Whisper headsets / audio system",
  "Bottled water on the motorcoach during transfers and touring",
  "Porterage at hotels where available",
  "Parking fees and road tolls",
  "Gratuities for Tour Manager, guides, drivers, hotels and restaurants",
  "Daily Mass arrangements",
  "Applicable taxes, including VAT, accommodation tax and climate tax",
];

const EXCLUDE_SUGGESTIONS = [
  "International airfare",
  "Domestic or regional airfare unless specifically included",
  "Lunches unless specifically stated as included",
  "Meals and beverages not mentioned in the itinerary",
  "Cruise costs unless specifically included in the proposal",
  "Cruise ship gratuities",
  "Travel and medical insurance",
  "Personal expenses such as laundry, telephone, minibar and room service",
  "Passport and visa fees where applicable",
  "Environmental, visitor, port or destination fees not specifically included",
  "Optional tours, excursions and activities not included in the itinerary",
  "Early check-in and late check-out unless specifically confirmed",
  "Excess baggage and airline ancillary charges",
  "Expenses arising from delays, strikes, weather conditions or circumstances beyond our reasonable control",
  "Any service not specifically listed under Rates Include",
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
    () =>
      type === "includes"
        ? INCLUDE_SUGGESTIONS
        : EXCLUDE_SUGGESTIONS,
    [type]
  );

  const selectedLines = useMemo(
    () => splitLines(value),
    [value]
  );

  function toggleLine(line: string) {
    const exists = selectedLines.includes(line);

    const nextLines = exists
      ? selectedLines.filter(
          (item) => item !== line
        )
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

      <div className="rounded-lg border bg-slate-50 p-4">
        <div className="mb-3">
          <div className="text-sm font-semibold text-[#001F3F]">
            {type === "includes"
              ? "Common Inclusions"
              : "Common Exclusions"}
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Select the items that apply to this
            quotation. You can edit the wording below
            after selecting them.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((line) => {
            const selected =
              selectedLines.includes(line);

            return (
              <button
                key={line}
                type="button"
                onClick={() =>
                  toggleLine(line)
                }
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  selected
                    ? type === "includes"
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-[#8B0000] bg-[#8B0000] text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {line}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            {type === "includes"
              ? "Rates Include"
              : "Rates Exclude"}
          </span>

          <span className="text-xs text-slate-400">
            One item per line
          </span>
        </div>

        <textarea
          className="min-h-64 w-full resize-y rounded-md border p-4 text-sm leading-7"
          placeholder={
            type === "includes"
              ? "Enter included services, one per line"
              : "Enter excluded services, one per line"
          }
          value={value}
          onChange={(e) =>
            handleTextareaChange(
              e.target.value
            )
          }
        />
      </div>
    </div>
  );
}