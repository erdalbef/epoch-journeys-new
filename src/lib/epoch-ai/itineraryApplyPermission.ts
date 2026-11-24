export type ApplyPermissionInput = {
  hasDraft: boolean;
  hasReview: boolean;
  blockingErrors: number;
  generatedForDuration: number | null;
  tourDuration: number;
  currentItinerary: string;
  currentOverview: string;
  originalAtGeneration: string;
  overviewAtGeneration: string;
  revisionMode: boolean;
  revisionAtGeneration: boolean;
  approvedReplacement: boolean;
};

export type ApplyPermission = {
  allowed: boolean;
  reason: string;
};

export function getItineraryApplyPermission(
  input: ApplyPermissionInput,
): ApplyPermission {
  const deny = (reason: string): ApplyPermission => ({
    allowed: false,
    reason,
  });

  if (!input.hasDraft || !input.hasReview) {
    return deny("No reviewed AI proposal is available.");
  }

  if (
    input.generatedForDuration === null ||
    input.generatedForDuration !== input.tourDuration
  ) {
    return deny("Tour duration changed. Regenerate the proposal.");
  }

  if (input.blockingErrors > 0) {
    return deny("Structural errors must be corrected before insertion.");
  }

  if (
    input.currentItinerary !== input.originalAtGeneration ||
    input.currentOverview !== input.overviewAtGeneration
  ) {
    return deny("The original working draft changed. Regenerate.");
  }

  if (input.revisionMode !== input.revisionAtGeneration) {
    return deny("Revision Mode changed. Regenerate.");
  }

  const replacingExisting =
    input.currentItinerary.trim().length > 0 ||
    input.currentOverview.trim().length > 0;

  if (replacingExisting && !input.approvedReplacement) {
    return deny("Explicit approval is required before replacement.");
  }

  return { allowed: true, reason: "" };
}