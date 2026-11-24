import {
  reviewRoadSegments,
  type RoadSegmentInput,
} from "./roadSegmentReview";
import {
  assessDailyFeasibility,
  type FeasibilityInput,
} from "./itineraryFeasibility";
import {
  compareDualRoutes,
} from "./dualRouteComparison";
import type { RouteDraft } from "./verifiedRoutesLibrary";

export type CombinedRouteInput = {
  day: Omit<FeasibilityInput, "drivingMinutes" | "drivingEvidence">;
  segments: RoadSegmentInput[];
  testedRoute?: RouteDraft;
  providerRoute?: RouteDraft;
  reviewDate?: string;
};

export function buildRouteFeasibilitySummary(input: CombinedRouteInput) {
  const road = reviewRoadSegments(input.segments);

  const verifiedByProvider = input.segments.length > 0 &&
    input.segments.every(
      (s) => s.evidence === "routing-service" &&
        s.drivingMinutes !== null &&
        s.distanceKm !== null
    );

  const daily = assessDailyFeasibility({
    ...input.day,
    drivingMinutes: road.totalDrivingMinutes,
    drivingEvidence: road.totalDrivingMinutes === null
      ? "unavailable"
      : verifiedByProvider
        ? "route-service"
        : "planning-estimate",
  });

  const warnings = [...road.warnings, ...daily.warnings];

  let comparison = null;

  if (input.testedRoute || input.providerRoute) {
    if (input.testedRoute && input.providerRoute &&
        input.reviewDate) {
      comparison = compareDualRoutes(
        input.testedRoute,
        input.providerRoute,
        input.reviewDate
      );
      warnings.push(...comparison.warnings);
    } else {
      warnings.push(
        "Dual routing comparison is incomplete; both records and review date are required."
      );
    }
  }

  // Detect discontinuities between supplied travel segments.
  const normalize = (value: string) =>
    value.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  let disconnected = false;

  for (let i = 1; i < input.segments.length; i++) {
    if (normalize(input.segments[i - 1].to) !==
        normalize(input.segments[i].from)) {
      disconnected = true;
      warnings.push(
        `Segments ${i} and ${i + 1} do not connect; inspect missing transfers.`
      );
    }
  }

  // Documented breaks and estimated break requirements remain separate.
  // Never add estimated breaks on top of recorded stops automatically.
  const breakCountNeedsReview =
    road.recommendedBreakCount === null ||
    road.warnings.some((w) =>
      w.includes("without a documented adequate break") ||
      w.includes("adequate en-route breaks documented")
    );

  // Combine preliminary and documented break allowances once.
  // This is a provisional duration budget, not stop-location approval.
  const breakMinutesInBudget =
    road.totalDrivingMinutes === null
      ? null
      : Math.max(
          road.recordedBreakMinutes,
          daily.breakMinutes ?? 0
        );

  const estimatedDailyMinutes =
    daily.totalMinutes === null || breakMinutesInBudget === null
      ? null
      : daily.totalMinutes -
          (daily.breakMinutes ?? 0) +
          breakMinutesInBudget;

  if (
    breakMinutesInBudget !== null &&
    road.recordedBreakMinutes > (daily.breakMinutes ?? 0)
  ) {
    warnings.push(
      "Documented comfort breaks exceed the preliminary allowance; the longer duration is counted once."
    );
  }

  if (
    estimatedDailyMinutes !== null &&
    estimatedDailyMinutes > 540 &&
    daily.status === "review-required"
  ) {
    warnings.push(
      "Reconciled daily schedule exceeds nine hours; review pilgrim comfort and timing."
    );
  }
  const blocked =
    disconnected ||
    road.totalDrivingMinutes === null ||
    road.warnings.some((w) => w.includes("restriction reported")) ||
    comparison?.status === "route-mismatch";

  const attention =
    (estimatedDailyMinutes !== null &&
      estimatedDailyMinutes > 540) ||
    daily.status === "high-risk" ||
    daily.status === "long-day" ||
    breakCountNeedsReview ||
    comparison?.status === "significant-difference" ||
    comparison?.status === "insufficient-evidence";

  const status = blocked
    ? "blocked-for-review"
    : attention
      ? "attention-required"
      : "manual-review-required";

  return {
    day: input.day.day,
    status,
    distanceKm: road.totalDistanceKm,
    drivingMinutes: road.totalDrivingMinutes,
    estimatedDailyMinutes,
    recommendedBreakCount: road.recommendedBreakCount,
    documentedBreakMinutes: road.recordedBreakMinutes,
    breakMinutesInBudget,
    comparison,
    warnings: [...new Set(warnings)],
    requiresManualReview: true as const,
  };
}