import type { RouteDraft } from "./verifiedRoutesLibrary";

export type DualRouteStatus =
  | "comparable"
  | "significant-difference"
  | "insufficient-evidence"
  | "route-mismatch";

export type DualRouteResult = {
  status: DualRouteStatus;
  testedDrivingMinutes: number | null;
  providerDrivingMinutes: number | null;
  drivingDifferenceMinutes: number | null;
  distanceDifferenceKm: number | null;
  summary: string;
  warnings: string[];
  requiresManualReview: true;
};

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

/**
 * Advisory comparison of two unsaved route observations.
 * No networking, persistence, approval or route replacement.
 *
 * Difference = Epoch observation minus provider estimate.
 * Positive values mean the Epoch observation took longer.
 */
export function compareDualRoutes(
  tested: RouteDraft,
  provider: RouteDraft,
  asOfDate: string,
): DualRouteResult {
  if (!validDate(asOfDate)) {
    throw new Error("A valid review date is required.");
  }

  if (tested.source !== "epoch-tested" ||
      provider.source !== "routing-provider") {
    throw new Error("Expected Epoch-tested and routing-provider sources.");
  }

  const warnings: string[] = [];

  const base = {
    testedDrivingMinutes: tested.drivingMinutes,
    providerDrivingMinutes: provider.drivingMinutes,
    drivingDifferenceMinutes: null,
    distanceDifferenceKm: null,
    requiresManualReview: true as const,
  };

  if (tested.routeKey !== provider.routeKey) {
    return {
      ...base,
      status: "route-mismatch",
      summary: "Routes differ; do not compare their travel times.",
      warnings: [
        "Origin, destination, direction or intermediate stops differ.",
        "Verify matching route geography before comparing.",
      ],
    };
  }

  if (tested.coachType !== provider.coachType ||
      tested.coachType === "unknown") {
    warnings.push(
      "Vehicle classifications are not comparable or are unknown."
    );
  }

  if (tested.coachType !== "full-size-coach") {
    warnings.push(
      "The historical observation does not establish full-size coach timings."
    );
  }

  const observationAgeDays =
    (Date.parse(`${asOfDate}T00:00:00Z`) -
      Date.parse(`${tested.observedDate}T00:00:00Z`)) / 86400000;

  if (!Number.isFinite(observationAgeDays) || observationAgeDays < 0) {
    warnings.push("Historical observation date requires verification.");
  } else if (observationAgeDays > 730) {
    warnings.push(
      "Historical observation is more than two years old; recheck current conditions."
    );
  }

  if (provider.observedDate !== asOfDate) {
    warnings.push(
      "Routing-provider evidence is not dated to this review; check its currency."
    );
  }

  warnings.push(
    "Provider estimates and tested journeys may reflect different traffic, stops, vehicles and route restrictions."
  );

  if (tested.drivingMinutes === null ||
      provider.drivingMinutes === null) {
    return {
      ...base,
      status: "insufficient-evidence",
      summary: "Driving-time comparison is unavailable.",
      warnings: [
        ...warnings,
        "At least one driving duration is missing.",
      ],
    };
  }

  const difference =
    tested.drivingMinutes - provider.drivingMinutes;
  const magnitude = Math.abs(difference);

  // Provisional review triggers, not confirmed Epoch policy.
  const timeDifferenceSignificant =
    magnitude >= 30 ||
    (provider.drivingMinutes > 0 &&
      magnitude / provider.drivingMinutes >= 0.20);

  const distanceDifference =
    tested.distanceKm !== null &&
    provider.distanceKm !== null
      ? Math.round(
          (tested.distanceKm - provider.distanceKm) * 10
        ) / 10
      : null;

  const distanceDifferenceSignificant =
    distanceDifference !== null &&
    Math.abs(distanceDifference) >= 20 &&
    provider.distanceKm !== null &&
    provider.distanceKm > 0 &&
    Math.abs(distanceDifference) / provider.distanceKm >= 0.15;

  if (distanceDifference === null) {
    warnings.push("Complete distance evidence is unavailable.");
  }

  if (timeDifferenceSignificant) {
    warnings.push(
      "Significant driving-time difference: check traffic, vehicle suitability and actual route."
    );
  }

  if (distanceDifferenceSignificant) {
    warnings.push(
      "Significant road-distance difference: check for different route alignments."
    );
  }

  const significant =
    timeDifferenceSignificant || distanceDifferenceSignificant;

  return {
    ...base,
    status: significant
      ? "significant-difference"
      : "comparable",
    drivingDifferenceMinutes: difference,
    distanceDifferenceKm: distanceDifference,
    summary: significant
      ? "Route evidence differs significantly; investigate before scheduling."
      : "No major difference detected by provisional thresholds; coach suitability and timing still require review.",
    warnings,
  };
}