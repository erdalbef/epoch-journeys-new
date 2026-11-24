export type DrivingEvidence =
  | "route-service"
  | "planning-estimate"
  | "unavailable";

export type FeasibilityInput = {
  day: number;
  drivingMinutes: number | null;
  drivingEvidence: DrivingEvidence;
  visitMinutes: number | null;
  massMinutes: number | null;
  lunchMinutes: number | null;
  operationalBufferMinutes: number | null;
  fixedAppointments?: boolean;
};

export type FeasibilityResult = {
  day: number;
  status: "review-required" | "long-day" | "high-risk";
  knownMinutes: number;
  totalMinutes: number | null;
  recommendedBreaks: number | null;
  breakMinutes: number | null;
  warnings: string[];
  requiresManualReview: true;
};

function validMinutes(value: number | null): boolean {
  return value === null ||
    (Number.isInteger(value) && value >= 0 && value <= 1440);
}

/**
 * Pure planning calculation; does not call a map, provider, or database.
 * Driving minutes must be supplied from external evidence.
 * Break count is an initial estimate, not a stop-by-stop coach schedule.
 */
export function assessDailyFeasibility(
  input: FeasibilityInput,
): FeasibilityResult {
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > 40) {
    throw new Error("Invalid day number.");
  }

  const values = [
    input.drivingMinutes,
    input.visitMinutes,
    input.massMinutes,
    input.lunchMinutes,
    input.operationalBufferMinutes,
  ];

  if (!values.every(validMinutes)) {
    throw new Error("Durations must be nonnegative whole minutes or null.");
  }

  const warnings: string[] = [];

  if (input.drivingEvidence === "unavailable" &&
      input.drivingMinutes !== null) {
    throw new Error("Unavailable driving evidence cannot supply a duration.");
  }

  if (input.drivingEvidence !== "unavailable" &&
      input.drivingMinutes === null) {
    throw new Error("Driving evidence requires a duration.");
  }

  // Approximately one 30-minute break between successive
  // two-hour driving blocks. The actual route must be reviewed.
  const recommendedBreaks =
    input.drivingMinutes === null
      ? null
      : Math.max(0, Math.ceil(input.drivingMinutes / 120) - 1);

  const breakMinutes =
    recommendedBreaks === null ? null : recommendedBreaks * 30;

  if (input.drivingEvidence !== "route-service") {
    warnings.push("Driving time has not been checked against a road-routing service.");
  } else {
    warnings.push("Road-routing time is not yet verified for a full-size coach.");
  }

  if (input.drivingMinutes !== null && input.drivingMinutes > 240) {
    warnings.push("Substantial coach travel: review the day's comfort and pacing.");
  }

  if (input.drivingMinutes !== null && input.drivingMinutes > 0) {
    warnings.push("Confirm actual comfort-break locations and driving segments.");
  }

  if (input.lunchMinutes === null) {
    warnings.push("Lunch duration is not established.");
  } else if (input.lunchMinutes < 90) {
    warnings.push("Lunch is shorter than the Epoch Standard of 90 minutes.");
  }

  if (input.massMinutes === null) {
    warnings.push("Mass duration or applicability requires review.");
  }

  if (input.visitMinutes === null) {
    warnings.push("Pilgrimage visit and sightseeing time is not established.");
  }

  if (input.operationalBufferMinutes === null) {
    warnings.push("Boarding, walking and operational buffer time is not established.");
  }

  if (input.fixedAppointments) {
    warnings.push(
      "Verify fixed Mass, guide and reservation appointments against the actual timeline."
    );
  }

  const complete = values.every((value) => value !== null);
  const knownMinutes =
    values.reduce<number>(
      (sum, value) => sum + (value ?? 0),
      0
    ) + (breakMinutes ?? 0);

  const totalMinutes = complete ? knownMinutes : null;

  if (totalMinutes !== null && totalMinutes > 660) {
    warnings.push("Daily schedule exceeds 11 hours and requires redesign review.");
  } else if (totalMinutes !== null && totalMinutes > 540) {
    warnings.push("Daily schedule exceeds 9 hours; consider a shorter day.");
  }

  const status =
    totalMinutes !== null && totalMinutes > 660
      ? "high-risk"
      : totalMinutes !== null && totalMinutes > 540
        ? "long-day"
        : "review-required";

  return {
    day: input.day,
    status,
    knownMinutes,
    totalMinutes,
    recommendedBreaks,
    breakMinutes,
    warnings,
    requiresManualReview: true,
  };
}