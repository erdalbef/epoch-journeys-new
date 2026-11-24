"use client";

import type { buildRouteFeasibilitySummary } from
  "@/lib/epoch-ai/routeFeasibilitySummary";

type RouteReport = ReturnType<typeof buildRouteFeasibilitySummary>;

type Props = {
  report: RouteReport | null;
};

function minutes(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "Not established";
  }

  const hours = Math.floor(value / 60);
  const remainder = value % 60;

  return hours > 0
    ? `${hours}h ${remainder}m`
    : `${remainder}m`;
}

function statusText(status: RouteReport["status"]): string {
  switch (status) {
    case "blocked-for-review":
      return "Critical review required";
    case "attention-required":
      return "Attention required";
    default:
      return "Manual verification required";
  }
}

/**
 * Read-only route feasibility presentation.
 *
 * Receives calculations from the planning engine.
 * Never generates distances, creates records, saves
 * itineraries, approves routes or sends communications.
 */
export default function RouteFeasibilityPanel({
  report,
}: Props) {
  if (!report) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <h3 className="font-semibold text-slate-900">
          Route Feasibility Review
        </h3>
        <p className="text-sm text-slate-600">
          No verified route assessment is available yet.
          Provide route segments, operational times and
          supporting evidence before reviewing feasibility.
        </p>
        <p className="text-xs text-amber-800">
          An AI-generated itinerary is not evidence of verified
          coach driving times or confirmed Mass arrangements.
        </p>
      </section>
    );
  }

  const topWarnings = report.warnings.slice(0, 4);
  const comparison = report.comparison;

  return (
    <section
      aria-label="Route Feasibility Review"
      className="rounded-xl border border-slate-200 bg-white p-4 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">
            Day {report.day} - Route Feasibility Review
          </h3>
          <p className="text-xs text-slate-500">
            Planning assessment only. Human verification required.
          </p>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
          {statusText(report.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Metric
          label="Road distance"
          value={
            report.distanceKm === null
              ? "Not established"
              : `${report.distanceKm.toFixed(1)} km`
          }
        />
        <Metric
          label="Driving time"
          value={minutes(report.drivingMinutes)}
        />
        <Metric
          label="Daily time budget"
          value={minutes(report.estimatedDailyMinutes)}
        />
        <Metric
          label="Estimated break count"
          value={
            report.recommendedBreakCount === null
              ? "Not established"
              : String(report.recommendedBreakCount)
          }
        />
        <Metric
          label="Documented break time"
          value={minutes(report.documentedBreakMinutes)}
        />
        <Metric
          label="Route comparison"
          value={
            comparison
              ? comparison.status.replace(/-/g, " ")
              : "Not available"
          }
        />
      </div>

      <p className="text-xs text-slate-600">
        Estimated breaks and documented stops are different evidence.
        The time budget requires reconciliation before final scheduling.
        Lunch, Mass and operational allowances are assessed by the
        planning engine and must be verified separately.
      </p>

      {comparison && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <h4 className="text-sm font-semibold text-slate-900">
            Epoch-tested route vs routing provider
          </h4>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <p>
              Epoch observation:{" "}
              <strong>{minutes(comparison.testedDrivingMinutes)}</strong>
            </p>
            <p>
              Provider estimate:{" "}
              <strong>{minutes(comparison.providerDrivingMinutes)}</strong>
            </p>
          </div>
          <p className="text-sm text-slate-700">
            {comparison.summary}
          </p>
          {comparison.drivingDifferenceMinutes !== null && (
            <p className="text-xs text-slate-600">
              Driving difference (Epoch minus provider):{" "}
              {comparison.drivingDifferenceMinutes > 0 ? "+" : ""}
              {comparison.drivingDifferenceMinutes} minutes
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-900">
          Operational findings ({report.warnings.length})
        </h4>
        {topWarnings.length === 0 ? (
          <p className="text-sm text-slate-600">
            No specific findings recorded. Verification is still required.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {topWarnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        )}

        {report.warnings.length > 4 && (
          <details className="text-sm text-slate-700">
            <summary className="cursor-pointer font-medium">
              View all {report.warnings.length} findings
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {report.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ol>
          </details>
        )}
      </div>

      <p className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        Read-only advisory report. No itinerary, booking,
        payment or supplier record has been changed.
      </p>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}