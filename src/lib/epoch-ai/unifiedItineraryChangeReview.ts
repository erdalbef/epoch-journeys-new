import {
  extractItineraryEvidence,
  compareItineraryEvidence,
} from "./itineraryEvidence";
import {
  extractPilgrimageSites,
  comparePilgrimageSites,
} from "./pilgrimageSiteEvidence";

export type UnifiedFinding = {
  day: number;
  category: string;
  original: string;
  proposed: string;
  message: string;
};

export type UnifiedChangeReview = {
  status: "changes-detected" | "review-required";
  requiresReview: true;
  detectedChanges: UnifiedFinding[];
  possibleSiteChanges: UnifiedFinding[];
  unverifiedDetails: string[];
  summary: {
    detectedChanges: number;
    possibleSiteChanges: number;
    unverifiedDetails: number;
  };
};

function uniqueWarnings(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Conservative comparison of two written itineraries.
 *
 * Does not certify itinerary equivalence.
 * An empty finding list is never permission for automatic replacement.
 * The original and proposed itineraries must be reviewed by a person.
 */
export function reviewWrittenItineraryChanges(
  originalText: string,
  proposedText: string,
  duration: number,
): UnifiedChangeReview {
  const original = extractItineraryEvidence(originalText, duration);
  const proposed = extractItineraryEvidence(proposedText, duration);

  const originalSites = extractPilgrimageSites(originalText);
  const proposedSites = extractPilgrimageSites(proposedText);

  const detectedChanges: UnifiedFinding[] =
    compareItineraryEvidence(original, proposed).map((finding) => ({
      day: finding.day,
      category: finding.category,
      original: finding.original,
      proposed: finding.proposed,
      message: `Day ${finding.day}: explicitly labeled ${finding.category} arrangement differs.`,
    }));

  const possibleSiteChanges: UnifiedFinding[] =
    comparePilgrimageSites(originalSites, proposedSites).map((finding) => ({
      day: finding.day,
      category: finding.category,
      original: finding.site,
      proposed: "",
      message: finding.message,
    }));

  const unverifiedDetails: string[] = [];

  if (!originalText.trim() || !proposedText.trim()) {
    unverifiedDetails.push(
      "One or both itineraries are empty; comparison is incomplete."
    );
  }

  const originalByDay = new Map(
    original.days.map((day) => [day.day, day])
  );
  const proposedByDay = new Map(
    proposed.days.map((day) => [day.day, day])
  );

  for (let day = 1; day <= duration; day++) {
    const before = originalByDay.get(day);
    const after = proposedByDay.get(day);

    if (!before || !after) {
      unverifiedDetails.push(
        `Day ${day}: complete source and proposal evidence is unavailable.`
      );
      continue;
    }

    for (const category of ["overnight", "mass"] as const) {
      if (!before[category] || !after[category]) {
        unverifiedDetails.push(
          `Day ${day}: ${category} comparison cannot be verified from both documents.`
        );
      }
    }
  }

  // Shrine labels alone cannot establish that all narrative visits survived.
  unverifiedDetails.push(
    "Pilgrimage visits described only in narrative text are not fully verified."
  );

  // A shrine can be moved, renamed or mentioned elsewhere in the program.
  unverifiedDetails.push(
    "Possible site changes require checking the full original and proposed itineraries."
  );

  unverifiedDetails.push(
    ...original.warnings.map((warning) => `Original: ${warning}`),
    ...proposed.warnings.map((warning) => `Proposal: ${warning}`),
    ...originalSites.warnings.map((warning) => `Original sites: ${warning}`),
    ...proposedSites.warnings.map((warning) => `Proposal sites: ${warning}`)
  );

  const unverified = uniqueWarnings(unverifiedDetails);

  return {
    status:
      detectedChanges.length > 0 || possibleSiteChanges.length > 0
        ? "changes-detected"
        : "review-required",
    requiresReview: true,
    detectedChanges,
    possibleSiteChanges,
    unverifiedDetails: unverified,
    summary: {
      detectedChanges: detectedChanges.length,
      possibleSiteChanges: possibleSiteChanges.length,
      unverifiedDetails: unverified.length,
    },
  };
}