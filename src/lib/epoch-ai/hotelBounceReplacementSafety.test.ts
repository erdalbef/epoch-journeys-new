import { describe, expect, it } from "vitest";
import { reviewBounceReplacement } from "./hotelBounceReplacementSafety";

const valid = {
  originalRecipient: "groups@humahotel.me",
  replacementRecipient: "reservations@humahotel.me",
  crmEmails: ["reservations@humahotel.me"],
  originalOutboxId: "original-audit-id",
  originalProviderMessageId: "original-provider-id",
  sameHotelStay: true,
  originalRecipientBounceVerified: true,
  originalHadOtherDeliveryProblem: false,
  replacementAlreadyAttempted: false,
  adminApproved: true
};

describe("Bounced hotel inquiry replacement safety", () => {
  it("allows eligibility only when all evidence exists", () => {
    expect(reviewBounceReplacement(valid).eligible).toBe(true);
  });

  it("blocks missing recipient-specific bounce evidence", () => {
    expect(reviewBounceReplacement({
      ...valid,
      originalRecipientBounceVerified: false
    }).eligible).toBe(false);
  });

  it("blocks the original bounced recipient", () => {
    expect(reviewBounceReplacement({
      ...valid,
      replacementRecipient: "groups@humahotel.me"
    }).eligible).toBe(false);
  });

  it("blocks recipients not listed in Supplier CRM", () => {
    expect(reviewBounceReplacement({
      ...valid,
      replacementRecipient: "unknown@example.com"
    }).eligible).toBe(false);
  });

  it("blocks duplicate replacement attempts", () => {
    expect(reviewBounceReplacement({
      ...valid,
      replacementAlreadyAttempted: true
    }).eligible).toBe(false);
  });

  it("blocks replacement without Admin approval", () => {
    expect(reviewBounceReplacement({
      ...valid,
      adminApproved: false
    }).eligible).toBe(false);
  });

  it("blocks conflicting delivery evidence", () => {
    expect(reviewBounceReplacement({
      ...valid,
      originalHadOtherDeliveryProblem: true
    }).eligible).toBe(false);
  });

  it("requires original audit and provider records", () => {
    expect(reviewBounceReplacement({
      ...valid,
      originalOutboxId: ""
    }).eligible).toBe(false);
  });

  it("requires the same hotel stay", () => {
    expect(reviewBounceReplacement({
      ...valid,
      sameHotelStay: false
    }).eligible).toBe(false);
  });
});