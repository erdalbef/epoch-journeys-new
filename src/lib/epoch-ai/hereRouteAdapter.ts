export type HereRouteAssessment = {
  provider: "HERE";
  status: "route-data-available" | "unavailable" | "critical-restriction";
  distanceKm: number | null;
  drivingMinutes: number | null;
  warnings: string[];
  coachAccess: "unverified";
  requiresManualReview: true;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value);
}

function validMetric(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 10000000;
}

function unavailable(reason: string): HereRouteAssessment {
  return {
    provider: "HERE",
    status: "unavailable",
    distanceKm: null,
    drivingMinutes: null,
    warnings: [reason],
    coachAccess: "unverified",
    requiresManualReview: true,
  };
}

/**
 * Local interpreter for selected HERE Routing API v8 fields.
 * The caller must select a route and record transport mode,
 * vehicle characteristics, retrieval date and provenance.
 *
 * This module never calls an API or confirms coach access.
 */
export function assessHereRouteResponse(
  response: unknown,
): HereRouteAssessment {
  if (!isRecord(response) || !Array.isArray(response.routes)) {
    return unavailable("Missing or invalid HERE route response.");
  }

  if (response.routes.length !== 1) {
    return unavailable(
      "Exactly one selected route is required; alternatives need review."
    );
  }

  const route: unknown = response.routes[0];

  if (!isRecord(route) ||
      !Array.isArray(route.sections) ||
      route.sections.length === 0) {
    return unavailable("HERE route sections are missing.");
  }

  let meters = 0;
  let seconds = 0;
  let critical = false;
  const warnings: string[] = [];

  for (const section of route.sections) {
    if (!isRecord(section) || !isRecord(section.summary)) {
      return unavailable("A route section is missing its summary.");
    }

    const length = section.summary.length;
    const duration = section.summary.duration;

    if (!validMetric(length) || !validMetric(duration)) {
      return unavailable("Invalid route length or duration.");
    }

    meters += length;
    seconds += duration;

    if (!Array.isArray(section.notices)) {
      warnings.push("Restriction notices are missing or unavailable.");
      continue;
    }

    for (const notice of section.notices) {
      if (!isRecord(notice) || typeof notice.severity !== "string") {
        warnings.push("Unrecognized restriction notice requires review.");
      } else if (notice.severity.toLowerCase() === "critical") {
        critical = true;
      } else {
        warnings.push("Noncritical route notice requires review.");
      }
    }
  }

  if (!validMetric(meters) || !validMetric(seconds)) {
    return unavailable("Combined route metrics exceed supported limits.");
  }

  if (critical) {
    warnings.push(
      "Critical restriction reported; resolve before scheduling this route."
    );
  }

  warnings.push(
    "Routing data alone does not confirm full-size coach suitability."
  );
  warnings.push(
    "Verify mode, coach dimensions, road access, parking and current restrictions."
  );

  return {
    provider: "HERE",
    status: critical ? "critical-restriction" : "route-data-available",
    distanceKm: Math.round(meters / 100) / 10,
    drivingMinutes: Math.ceil(seconds / 60),
    warnings,
    coachAccess: "unverified",
    requiresManualReview: true,
  };
}