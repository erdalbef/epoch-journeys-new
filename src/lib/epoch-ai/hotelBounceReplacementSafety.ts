export type BounceReplacementReview = {
  originalRecipient: string;
  replacementRecipient: string;
  crmEmails: string[];
  originalOutboxId: string;
  originalProviderMessageId: string;
  sameHotelStay: boolean;
  originalRecipientBounceVerified: boolean;
  originalHadOtherDeliveryProblem: boolean;
  replacementAlreadyAttempted: boolean;
  adminApproved: boolean;
};

export function reviewBounceReplacement(input: BounceReplacementReview) {
  const blocks: string[] = [];
  const original = input.originalRecipient.trim().toLowerCase();
  const replacement = input.replacementRecipient.trim().toLowerCase();
  const crmEmails = input.crmEmails.map(e => e.trim().toLowerCase());
  const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

  if (!input.originalOutboxId || !input.originalProviderMessageId)
    blocks.push("Original audited send and provider ID required.");

  if (!input.sameHotelStay)
    blocks.push("Replacement must match the original hotel stay.");

  if (!input.originalRecipientBounceVerified)
    blocks.push("Verified recipient-specific bounce evidence required.");

  if (input.originalHadOtherDeliveryProblem)
    blocks.push("Conflicting delivery evidence requires investigation.");

  if (!emailPattern.test(replacement) || !crmEmails.includes(replacement))
    blocks.push("Replacement recipient must be valid and in Supplier CRM.");

  if (replacement === original)
    blocks.push("Replacement recipient must differ from bounced address.");

  if (input.replacementAlreadyAttempted)
    blocks.push("A replacement attempt already exists.");

  if (!input.adminApproved)
    blocks.push("Explicit Admin approval required.");

  return {
    eligible: blocks.length === 0,
    blocks
  };
}