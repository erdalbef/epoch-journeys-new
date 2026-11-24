export type FacilityStatus = "confirmed" | "unverified" | "unsuitable";

export type ComfortStopCandidate = {
  name: string;
  drivingMinutesFromStart: number;
  breakMinutes: number;
  kind: "comfort" | "lunch";
  coachAccess: FacilityStatus;
  toilets: FacilityStatus;
  accessibility: FacilityStatus;
  openingHours: FacilityStatus;
  groupCapacity: FacilityStatus;
  detourMinutes: number | null;
  evidenceReference?: string;
};

export type ComfortStopInput = {
  totalDrivingMinutes: number | null;
  candidates: ComfortStopCandidate[];
};

export type ComfortStopResult = {
  proposedStops: ComfortStopCandidate[];
  warnings: string[];
  status: "candidate-review" | "attention-required" | "insufficient-evidence";
  requiresManualReview: true;
};

const TARGET_MINUTES = 120;
const PREFERRED_EARLY_MINUTES = 90;
const PREFERRED_LATE_MINUTES = 150;
const MAX_DETOUR_MINUTES = 20;
const MIN_REMAINING_DRIVE_MINUTES = 30;

function isSuitable(candidate: ComfortStopCandidate): boolean {
  const required: FacilityStatus[] = [
    candidate.coachAccess,
    candidate.toilets,
    candidate.accessibility,
    candidate.openingHours,
    candidate.groupCapacity,
  ];
  return (
    required.every((value) => value === "confirmed") &&
    candidate.detourMinutes !== null &&
    candidate.detourMinutes <= MAX_DETOUR_MINUTES &&
    Boolean(candidate.evidenceReference?.trim()) &&
    candidate.breakMinutes >= (candidate.kind === "lunch" ? 90 : 30)
  );
}

/** Pure candidate assessment: no live map, facility search or external verification. */
export function planIntelligentComfortStops(input: ComfortStopInput): ComfortStopResult {
  const warnings: string[] = [];
  if (
    input.totalDrivingMinutes !== null &&
    (!Number.isInteger(input.totalDrivingMinutes) ||
      input.totalDrivingMinutes < 0 ||
      input.totalDrivingMinutes > 1440)
  ) {
    throw new Error("Invalid total driving duration.");
  }
  if (!Array.isArray(input.candidates) || input.candidates.length > 100) {
    throw new Error("Invalid comfort stop candidate list.");
  }
  for (const candidate of input.candidates) {
    if (
      !candidate.name.trim() ||
      !Number.isInteger(candidate.drivingMinutesFromStart) ||
      candidate.drivingMinutesFromStart < 0 ||
      !Number.isInteger(candidate.breakMinutes) ||
      candidate.breakMinutes < 0 ||
      candidate.breakMinutes > 240 ||
      (candidate.detourMinutes !== null &&
        (!Number.isFinite(candidate.detourMinutes) ||
          candidate.detourMinutes < 0 ||
          candidate.detourMinutes > 1440))
    ) {
      throw new Error("Invalid comfort stop candidate.");
    }
  }
  const total = input.totalDrivingMinutes;
  if (total === null) {
    return {
      proposedStops: [],
      warnings: ["Driving duration is unknown; stop locations cannot be assessed."],
      status: "insufficient-evidence",
      requiresManualReview: true,
    };
  }
  const suitable = input.candidates
    .filter((candidate) =>
      candidate.drivingMinutesFromStart > 0 &&
      candidate.drivingMinutesFromStart < total &&
      isSuitable(candidate)
    )
    .sort((a, b) => a.drivingMinutesFromStart - b.drivingMinutesFromStart);

  if (input.candidates.some((candidate) => !isSuitable(candidate))) {
    warnings.push("Some candidate stops lack confirmed facilities, acceptable detours, or supporting evidence.");
  }
  const proposedStops: ComfortStopCandidate[] = [];
  let lastDrivingPosition = 0;
  let unresolved = false;

  while (total - lastDrivingPosition > PREFERRED_LATE_MINUTES) {
    const remainingCandidates = suitable.filter((candidate) =>
      candidate.drivingMinutesFromStart > lastDrivingPosition &&
      candidate.drivingMinutesFromStart <= total - MIN_REMAINING_DRIVE_MINUTES
    );
    const preferred = remainingCandidates.filter((candidate) => {
      const gap = candidate.drivingMinutesFromStart - lastDrivingPosition;
      return gap >= PREFERRED_EARLY_MINUTES && gap <= PREFERRED_LATE_MINUTES;
    });
    const next = preferred.sort((a, b) =>
      Math.abs(a.drivingMinutesFromStart - lastDrivingPosition - TARGET_MINUTES) -
      Math.abs(b.drivingMinutesFromStart - lastDrivingPosition - TARGET_MINUTES)
    )[0] ?? remainingCandidates[0];

    if (!next) {
      warnings.push(`No suitable documented stop found after ${lastDrivingPosition} driving minutes; route review required.`);
      unresolved = true;
      break;
    }
    const gap = next.drivingMinutesFromStart - lastDrivingPosition;
    if (gap > PREFERRED_LATE_MINUTES) {
      warnings.push(`${next.name}: proposed break follows ${gap} minutes of driving; investigate an earlier stopping location.`);
      unresolved = true;
    } else if (gap < PREFERRED_EARLY_MINUTES) {
      warnings.push(`${next.name}: proposed break is earlier than the preferred interval; review remaining route coverage.`);
    }
    proposedStops.push(next);
    lastDrivingPosition = next.drivingMinutesFromStart;
  }

  if (proposedStops.length > 0) {
    warnings.push("Candidate stops require manual source, coach-access, opening-hours and operational verification.");
  }
  return {
    proposedStops,
    warnings,
    status: unresolved
      ? "attention-required"
      : input.candidates.length === 0 && total > PREFERRED_LATE_MINUTES
        ? "insufficient-evidence"
        : "candidate-review",
    requiresManualReview: true,
  };
}
