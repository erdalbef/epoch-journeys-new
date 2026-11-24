export type RoadEvidence =
  | "routing-service"
  | "planning-estimate"
  | "unavailable";

export type CoachAccess =
  | "confirmed"
  | "unverified"
  | "restriction-reported";

export type RoadSegmentInput = {
  from: string;
  to: string;
  distanceKm: number | null;
  drivingMinutes: number | null;
  evidence: RoadEvidence;
  coachAccess: CoachAccess;
  breakAfterMinutes?: number;
};

export type RoadSegmentReview = {
  totalDistanceKm: number | null;
  totalDrivingMinutes: number | null;
  recommendedBreakCount: number | null;
  recordedBreakMinutes: number;
  warnings: string[];
  coachRouteVerified: false;
  requiresManualReview: true;
};

function validNumber(value: number | null): boolean {
  return value === null ||
    (Number.isFinite(value) && value >= 0 && value <= 10000);
}

export function reviewRoadSegments(
  segments: RoadSegmentInput[],
): RoadSegmentReview {
  const warnings: string[] = [];

  if (!Array.isArray(segments) || segments.length === 0) {
    return {
      totalDistanceKm: null,
      totalDrivingMinutes: null,
      recommendedBreakCount: null,
      recordedBreakMinutes: 0,
      warnings: ["No road segments supplied."],
      coachRouteVerified: false,
      requiresManualReview: true,
    };
  }

  if (segments.length > 40) {
    throw new Error("Too many road segments.");
  }

  let distanceTotal = 0;
  let drivingTotal = 0;
  let allDistancesKnown = true;
  let allDrivingKnown = true;
  let drivingSinceBreak = 0;
  let recordedBreakMinutes = 0;
  let adequateBreaks = 0;

  segments.forEach((segment, index) => {
    const label = `Segment ${index + 1}: ${segment.from} to ${segment.to}`;
    const breakMinutes = segment.breakAfterMinutes ?? 0;

    if (!segment.from.trim() || !segment.to.trim()) {
      throw new Error("Road segment locations are required.");
    }

    if (!validNumber(segment.distanceKm) ||
        !validNumber(segment.drivingMinutes) ||
        !Number.isInteger(breakMinutes) ||
        breakMinutes < 0 ||
        breakMinutes > 180) {
      throw new Error(`Invalid values in ${label}.`);
    }

    if (segment.evidence === "unavailable" &&
        (segment.distanceKm !== null ||
         segment.drivingMinutes !== null)) {
      throw new Error(`Unavailable evidence cannot contain route metrics: ${label}.`);
    }

    if (segment.evidence !== "unavailable" &&
        (segment.distanceKm === null ||
         segment.drivingMinutes === null)) {
      warnings.push(`${label}: route metrics are incomplete.`);
    }

    if (segment.distanceKm === null) {
      allDistancesKnown = false;
    } else {
      distanceTotal += segment.distanceKm;
    }

    if (segment.drivingMinutes === null) {
      allDrivingKnown = false;
      drivingSinceBreak = 0;
      warnings.push(`${label}: driving duration is unknown.`);
    } else {
      drivingTotal += segment.drivingMinutes;
      drivingSinceBreak += segment.drivingMinutes;

      if (drivingSinceBreak > 120) {
        warnings.push(
          `${label}: planned driving exceeds approximately two hours without a documented adequate break.`
        );
      }
    }

    if (segment.evidence !== "routing-service") {
      warnings.push(`${label}: road-routing metrics are not independently verified.`);
    } else {
      warnings.push(`${label}: routing-service data does not establish coach suitability.`);
    }

    if (segment.coachAccess === "restriction-reported") {
      warnings.push(`${label}: coach restriction reported; find a suitable alternative.`);
    } else if (segment.coachAccess === "unverified") {
      warnings.push(`${label}: full-size coach access is unverified.`);
    }

    // Only breaks between segments count as planned comfort stops.
    if (index === segments.length - 1 && breakMinutes > 0) {
      warnings.push(`${label}: break after the final road segment does not count as an en-route stop.`);
    } else if (index < segments.length - 1) {
      recordedBreakMinutes += breakMinutes;

      if (breakMinutes >= 30) {
        adequateBreaks++;
        drivingSinceBreak = 0;
      } else if (breakMinutes > 0) {
        warnings.push(`${label}: planned break is shorter than 30 minutes.`);
      }
    }
  });

  const recommendedBreakCount = allDrivingKnown
    ? Math.max(0, Math.ceil(drivingTotal / 120) - 1)
    : null;

  if (recommendedBreakCount !== null &&
      adequateBreaks < recommendedBreakCount) {
    warnings.push(
      `Only ${adequateBreaks} adequate en-route breaks documented; approximately ${recommendedBreakCount} may be needed. Verify actual break locations.`
    );
  }

  warnings.push(
    "Check coach restrictions, parking, road conditions, fixed appointments and realistic boarding times before approval."
  );

  return {
    totalDistanceKm: allDistancesKnown
      ? Math.round(distanceTotal * 10) / 10
      : null,
    totalDrivingMinutes: allDrivingKnown ? drivingTotal : null,
    recommendedBreakCount,
    recordedBreakMinutes,
    warnings,
    coachRouteVerified: false,
    requiresManualReview: true,
  };
}