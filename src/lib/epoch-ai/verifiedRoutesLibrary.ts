export type RouteSource =
  | "epoch-tested"
  | "routing-provider"
  | "planning-estimate";

export type CoachType =
  | "full-size-coach"
  | "minibus"
  | "unknown";

export type RouteObservationInput = {
  origin: string;
  destination: string;
  via?: string[];
  source: RouteSource;
  observedDate: string;
  coachType: CoachType;
  distanceKm: number | null;
  drivingMinutes: number | null;
  comfortBreakMinutes: number | null;
  lunchMinutes: number | null;
  notes?: string;
  evidenceReference?: string;
};

export type RouteDraft = RouteObservationInput & {
  status: "draft";
  routeKey: string;
  warnings: string[];
  requiresApproval: true;
};

function normalize(value: string): string {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function validMinutes(value: number | null): boolean {
  return value === null ||
    (Number.isInteger(value) && value >= 0 && value <= 1440);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

/**
 * Creates an unsaved route observation for authorized review.
 * Does not access a database, API or application state.
 */
export function prepareRouteDraft(
  input: RouteObservationInput,
): RouteDraft {
  const origin = input.origin.trim();
  const destination = input.destination.trim();
  const via = (input.via ?? []).map((v) => v.trim());

  if (!origin || !destination ||
      origin.length > 150 || destination.length > 150 ||
      via.length > 20 ||
      via.some((v) => !v || v.length > 150)) {
    throw new Error("Route locations are missing or invalid.");
  }

  if (normalize(origin) === normalize(destination) && via.length === 0) {
    throw new Error("Route must identify distinct places or intermediate stops.");
  }

  if (!["epoch-tested", "routing-provider", "planning-estimate"]
      .includes(input.source)) {
    throw new Error("Invalid route source.");
  }

  if (!["full-size-coach", "minibus", "unknown"]
      .includes(input.coachType)) {
    throw new Error("Invalid vehicle type.");
  }

  if (!validDate(input.observedDate)) {
    throw new Error("Invalid observation date.");
  }

  const now = new Date().toISOString().slice(0, 10);
  if (input.observedDate > now) {
    throw new Error("Observation date cannot be in the future.");
  }

  if (input.distanceKm !== null &&
      (!Number.isFinite(input.distanceKm) ||
       input.distanceKm < 0 || input.distanceKm > 10000)) {
    throw new Error("Invalid road distance.");
  }

  if (!validMinutes(input.drivingMinutes) ||
      !validMinutes(input.comfortBreakMinutes) ||
      !validMinutes(input.lunchMinutes)) {
    throw new Error("Invalid time values.");
  }

  if ((input.notes ?? "").length > 3000 ||
      (input.evidenceReference ?? "").length > 500) {
    throw new Error("Notes or evidence reference too long.");
  }

  const warnings: string[] = [];

  if (input.drivingMinutes === null) {
    warnings.push("Actual driving duration is not established.");
  }

  if (input.distanceKm === null) {
    warnings.push("Road distance is not established.");
  }

  if (input.coachType !== "full-size-coach") {
    warnings.push("Full-size touring-coach suitability is not established.");
  }

  if (input.source === "epoch-tested" &&
      !input.evidenceReference?.trim()) {
    warnings.push("Attach or identify the operational evidence before approval.");
  }

  if (input.source === "routing-provider") {
    warnings.push("Provider routing alone does not establish coach access.");
  }

  if (input.source === "planning-estimate") {
    warnings.push("Planning estimate is not an observed or verified journey.");
  }

  if (input.comfortBreakMinutes === null) {
    warnings.push("Comfort-break duration is unknown.");
  }

  if (input.lunchMinutes === null) {
    warnings.push("Lunch duration is unknown.");
  }

  const routeKey = [origin, ...via, destination]
    .map(normalize)
    .join(" -> ");

  return {
    ...input,
    origin,
    destination,
    via,
    status: "draft",
    routeKey,
    warnings,
    requiresApproval: true,
  };
}

export function findPossibleRouteDuplicates(
  candidate: RouteDraft,
  existing: RouteDraft[],
): RouteDraft[] {
  return existing.filter((route) =>
    route.routeKey === candidate.routeKey &&
    route.coachType === candidate.coachType
  );
}