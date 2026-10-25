"use client";

export type ComplimentaryMode = "AUTOMATIC" | "MANUAL";

type Props = {
  mode: ComplimentaryMode;
  manualCount: number;
  onChange: (patch: {
    complimentaryMode?: ComplimentaryMode;
    manualComplimentaryPassengers?: number;
  }) => void;
};

/**
 * Only the MANUAL count is authoritative in manual mode.
 * Switching modes never overwrites the other mode's stored settings.
 * Named priest/leader travelers are INCLUDED in the exact manual total.
 */
export default function ComplimentaryModeControls({ mode, manualCount, onChange }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold text-[#001F3F]">Complimentary Passenger Selection</h3>
      <div className="mt-3 flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="complimentaryMode"
            checked={mode === "AUTOMATIC"}
            onChange={() => onChange({ complimentaryMode: "AUTOMATIC" })}
          />
          Automatic (configurable free-place rule)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="complimentaryMode"
            checked={mode === "MANUAL"}
            onChange={() => onChange({ complimentaryMode: "MANUAL" })}
          />
          Manual (exact total)
        </label>
      </div>
      {mode === "MANUAL" && (
        <div className="mt-4 max-w-md">
          <label htmlFor="manualComplimentaryPassengers" className="mb-1 block text-sm font-medium text-slate-700">
            Total Complimentary Travelers (0 allowed)
          </label>
          <input
            id="manualComplimentaryPassengers"
            type="number"
            min={0}
            step={1}
            value={manualCount}
            onChange={(event) => {
              const value = Number(event.target.value);
              onChange({ manualComplimentaryPassengers: Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0 });
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-2 text-xs text-slate-600">
            This is the exact total, including any complimentary priest and group leader.
            Automatic free-place rules and additional-place inputs do not add to this number.
            Their settings are kept if you switch back to Automatic.
          </p>
        </div>
      )}
    </div>
  );
}
