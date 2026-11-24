import { describe, expect, it, vi } from "vitest";
import {
  BOUNCE_REPLACEMENT_CC, ReplacementBlocked, bounceReplacementEventKey,
  bounceReplacementFingerprint, bounceReplacementSnapshot, replacementContextVersion, replacementDeliveryTracking,
  reviewReplacementContext,
} from "./hotelBounceReplacementCore";
import type { ReplacementContext, ReplacementOutbox } from "./hotelBounceReplacementCore";
import { createBounceReplacementService } from "./hotelBounceReplacementService";
import type { ReplacementDependencies } from "./hotelBounceReplacementService";
import type { VerifiedRecipientEvent } from "./hotelBounceReplacementEvidence";

function fixture(): ReplacementContext {
  const originalInquiry = {
    id: "original", tourId: "tour", supplierId: "hotel", destination: "Kotor Bay",
    checkIn: "2027-05-08", checkOut: "2027-05-10", rooms: 20,
    recipient: "groups@humahotel.me", subject: "Group accommodation", body: "Approved body",
    status: "APPROVED", approvedAt: new Date("2026-11-24T10:00:00Z"), approvedBy: "admin",
    createdAt: new Date("2026-11-24T09:00:00Z"),
    supplier: { id: "hotel", name: "HUMA", type: "HOTEL", status: "ACTIVE",
      email: "reservations@humahotel.me", contacts: [] },
  };
  const stayKey = `supplier:hotel-inquiry:stay:${"a".repeat(64)}:v1`;
  const entry = { ...originalInquiry, id: "revised", recipient: "reservations@humahotel.me",
    createdAt: new Date("2026-11-24T13:30:00Z"), approvedAt: new Date("2026-11-24T14:00:00Z") };
  return {
    entry, originalInquiry, newestInquiryId: entry.id, stayKey,
    original: {
      id: "original-outbox", eventKey: stayKey, recipient: originalInquiry.recipient,
      subject: originalInquiry.subject,
      body: JSON.stringify({ schema: "epoch-hotel-supplier-email-v1", test: false,
        supplierSentAttempted: true, inquiryId: "original", supplierId: "hotel",
        to: originalInquiry.recipient, cc: BOUNCE_REPLACEMENT_CC, subject: originalInquiry.subject }),
      targetUrl: "supplier:hotel-inquiry:original", status: "ACCEPTED", providerMessageId: "provider-original",
      createdAt: new Date("2026-11-24T12:59:00Z"), acceptedAt: new Date("2026-11-24T12:59:00Z"),
      lastAttemptAt: new Date("2026-11-24T12:59:00Z"), lastError: null,
    },
    originalAttemptCount: 1, originalEvents: [{ id: "bounce-event", providerMessageId: "provider-original",
      type: "email.bounced", occurredAt: new Date("2026-11-24T13:00:00Z") }],
    replacement: null, replacementEvents: [], contentBlocks: [],
    previewHtml: "<p>Approved replacement</p>", previewText: "Approved replacement",
  };
}

function bounceEvidence(): VerifiedRecipientEvent[] {
  return [{ eventId: "bounce-event", providerMessageId: "provider-original", type: "email.bounced",
    recipient: "groups@humahotel.me", occurredAt: "2026-11-24T13:00:00.000Z",
    payloadHash: "a".repeat(64), bounceType: "Permanent", bounceMessage: "Recipient not found" }];
}

function authorization(context: ReplacementContext, evidence = bounceEvidence(), mode = "SEND") {
  return { mode, confirmation: mode === "VALIDATE_ONLY" ? "VALIDATE" : "SEND",
    inquiryId: context.entry.id, to: context.entry.recipient, cc: BOUNCE_REPLACEMENT_CC,
    subject: context.entry.subject, fingerprint: bounceReplacementFingerprint(context, evidence),
    originalOutboxId: context.original.id, originalProviderMessageId: context.original.providerMessageId };
}

function setup(context = fixture(), evidence = bounceEvidence()) {
  let reserved = false;
  const deps: ReplacementDependencies = {
    loadContext: vi.fn(async () => context),
    verifyEvidence: vi.fn(async () => evidence),
    sendEnabled: () => true, environmentAllowed: () => true, emailConfigured: () => true,
    claim: vi.fn(async () => {
      if (reserved) throw new ReplacementBlocked("Already reserved");
      reserved = true;
    }),
    send: vi.fn(async () => ({ data: { id: "provider-replacement" } })),
    finalize: vi.fn(async () => {}), now: () => new Date("2026-11-24T15:00:00Z"),
  };
  return { context, deps, service: createBounceReplacementService(deps) };
}

describe("Approved bounced hotel inquiry replacement", () => {
  it("accepts the supplier bounce while keeping delivered CC distinct", () => {
    const evidence = [...bounceEvidence(), { ...bounceEvidence()[0], eventId: "cc-event",
      recipient: BOUNCE_REPLACEMENT_CC, type: "email.delivered" }];
    expect(reviewReplacementContext(fixture(), evidence).eligible).toBe(true);
  });

  it("does not authorize replacing the supplier because only CC bounced", () => {
    const events = bounceEvidence().map(e => ({ ...e, recipient: BOUNCE_REPLACEMENT_CC }));
    expect(reviewReplacementContext(fixture(), events).eligible).toBe(false);
  });

  it.each(["email.delivered", "email.complained"])("blocks conflicting supplier %s evidence", type => {
    const events = [...bounceEvidence(), { ...bounceEvidence()[0], eventId: "conflict", type }];
    expect(reviewReplacementContext(fixture(), events).eligible).toBe(false);
  });

  it("keeps suppression following permanent bounce eligible", () => {
    const events = [...bounceEvidence(), { ...bounceEvidence()[0], eventId: "suppression", type: "email.suppressed" }];
    expect(reviewReplacementContext(fixture(), events).eligible).toBe(true);
  });

  it.each(["SENDING", "UNCERTAIN", "FAILED", "DELIVERED"])("blocks original status %s", status => {
    const context = fixture(); context.original.status = status;
    expect(reviewReplacementContext(context, bounceEvidence()).eligible).toBe(false);
  });

  it("blocks the original bounced recipient even when it remains in CRM", () => {
    const context = fixture(); context.entry.recipient = context.original.recipient;
    context.entry.supplier.contacts = [{ email: context.original.recipient }];
    expect(reviewReplacementContext(context, bounceEvidence()).eligible).toBe(false);
  });

  it("blocks multiple addresses even when that string is in CRM", () => {
    const context = fixture(); context.entry.recipient = "one,two@hotel.example";
    context.entry.supplier.email = context.entry.recipient;
    expect(reviewReplacementContext(context, bounceEvidence()).eligible).toBe(false);
  });

  it("requires a fresh approval after the bounce and the exact original stay", () => {
    const context = fixture(); context.entry.approvedAt = new Date("2026-11-24T12:00:00Z");
    expect(reviewReplacementContext(context, bounceEvidence()).eligible).toBe(false);
    context.entry.approvedAt = new Date("2026-11-24T14:00:00Z");
    context.entry.checkIn = "2027-05-09";
    expect(reviewReplacementContext(context, bounceEvidence()).eligible).toBe(false);
  });

  it("blocks a mismatched original snapshot supplier", () => {
    const context = fixture();
    context.original.body = context.original.body.replace('"supplierId":"hotel"', '"supplierId":"different"');
    expect(reviewReplacementContext(context, bounceEvidence()).eligible).toBe(false);
  });

  it("uses one replacement key across inquiry IDs and corrected addresses", () => {
    const a = fixture(), b = fixture(); b.entry.id = "another"; b.entry.recipient = "new@hotel.example";
    expect(bounceReplacementEventKey(a.stayKey)).toBe(bounceReplacementEventKey(b.stayKey));
    expect(bounceReplacementEventKey(a.stayKey)).toMatch(/^supplier:hotel-inquiry:/);
  });

  it("VALIDATE performs no write or email send", async () => {
    const { context, deps, service } = setup();
    const result = await service.submit(context.entry.id, authorization(context, undefined, "VALIDATE_ONLY"), "admin");
    expect(result).toMatchObject({ status: "VALIDATED_NOT_SENT", sent: false, outboxCreated: false });
    expect(deps.claim).not.toHaveBeenCalled(); expect(deps.send).not.toHaveBeenCalled();
    expect(deps.finalize).not.toHaveBeenCalled();
  });

  it("never trusts browser bounce or approval flags", async () => {
    const { context, deps, service } = setup(fixture(), []);
    await expect(service.submit("revised", { ...authorization(context, []),
      originalRecipientBounceVerified: true, adminApproved: true }, "admin")).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(deps.claim).not.toHaveBeenCalled(); expect(deps.send).not.toHaveBeenCalled();
  });

  it.each(["to", "cc", "subject", "fingerprint", "originalOutboxId", "originalProviderMessageId"])(
    "rejects stale or altered %s confirmation", async field => {
      const { context, deps, service } = setup();
      await expect(service.submit("revised", { ...authorization(context), [field]: "different" }, "admin")).rejects.toBeInstanceOf(ReplacementBlocked);
      expect(deps.claim).not.toHaveBeenCalled(); expect(deps.send).not.toHaveBeenCalled();
    },
  );

  it("invalidates a preview when approved content changes", async () => {
    const { context, deps, service } = setup(); const old = authorization(context);
    context.previewHtml = "<p>Changed</p>";
    await expect(service.submit("revised", old, "admin")).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("blocks when recipient is removed from current CRM", async () => {
    const { context, deps, service } = setup(); const auth = authorization(context);
    context.entry.supplier.email = "other@hotel.example";
    await expect(service.submit("revised", auth, "admin")).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("requires the release gate and allowed environment for SEND", async () => {
    const { context, deps } = setup(); deps.sendEnabled = () => false;
    await expect(createBounceReplacementService(deps).submit("revised", authorization(context), "admin")).rejects.toMatchObject({ status: 423 });
    deps.sendEnabled = () => true; deps.environmentAllowed = () => false;
    await expect(createBounceReplacementService(deps).submit("revised", authorization(context), "admin")).rejects.toMatchObject({ status: 403 });
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("concurrent SEND requests reserve and send only one replacement", async () => {
    const { context, deps, service } = setup(); const auth = authorization(context);
    const results = await Promise.allSettled([
      service.submit("revised", auth, "first-admin"), service.submit("revised", auth, "second-admin"),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(deps.send).toHaveBeenCalledTimes(1); expect(deps.finalize).toHaveBeenCalledTimes(1);
    expect(deps.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "reservations@humahotel.me", cc: BOUNCE_REPLACEMENT_CC, replyTo: "erdal@epochjourneys.com",
    }));
  });

  it("does not contact provider if the claim-time recheck fails", async () => {
    const { context, deps } = setup();
    deps.claim = vi.fn(async () => { throw new ReplacementBlocked("Evidence changed"); });
    await expect(createBounceReplacementService(deps).submit("revised", authorization(context), "admin")).rejects.toThrow("Evidence changed");
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("saves original linkage, recipient evidence, actor and mandatory CC in the new snapshot", async () => {
    const { context, deps, service } = setup();
    const original = JSON.stringify(context.original);
    await service.submit("revised", authorization(context), "admin-123");
    const input = vi.mocked(deps.claim).mock.calls[0][0];
    expect(JSON.parse(input.snapshot)).toMatchObject({ originalOutboxId: "original-outbox",
      originalProviderMessageId: "provider-original", originalRecipient: "groups@humahotel.me",
      authorizedBy: "admin-123", cc: BOUNCE_REPLACEMENT_CC, evidenceSource: "resend-authenticated-webhook-event-api" });
    expect(JSON.stringify(context.original)).toBe(original);
  });

  it("records UNCERTAIN after an interrupted send and never retries", async () => {
    const { context, deps } = setup();
    deps.send = vi.fn(async () => { throw new Error("network interruption"); });
    const service = createBounceReplacementService(deps);
    expect(await service.submit("revised", authorization(context), "admin")).toMatchObject({ status: "UNCERTAIN", deliveryConfirmed: false });
    await expect(service.submit("revised", authorization(context), "admin")).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it.each(["ACCEPTED", "FAILED", "UNCERTAIN", "SENDING"])("an existing %s replacement blocks another attempt", async status => {
    const { context, deps, service } = setup();
    context.replacement = { ...context.original, id: "replacement", status,
      eventKey: bounceReplacementEventKey(context.stayKey), recipient: context.entry.recipient };
    await expect(service.submit("revised", authorization(context), "admin")).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(deps.claim).not.toHaveBeenCalled(); expect(deps.send).not.toHaveBeenCalled();
  });

  it("audit failure retains the consumed claim without another send", async () => {
    const { context, deps } = setup(); deps.finalize = vi.fn(async () => { throw new Error("DB unavailable"); });
    const service = createBounceReplacementService(deps);
    await expect(service.submit("revised", authorization(context), "admin")).rejects.toMatchObject({ status: 503 });
    await expect(service.submit("revised", authorization(context), "admin")).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(deps.send).toHaveBeenCalledTimes(1);
  });

  it("does not report hotel delivery from the replacement CC's delivered event", () => {
    const context = fixture(); const outbox: ReplacementOutbox = {
      ...context.original, recipient: context.entry.recipient, providerMessageId: "provider-replacement",
    };
    const event = { ...bounceEvidence()[0], providerMessageId: "provider-replacement",
      recipient: BOUNCE_REPLACEMENT_CC, type: "email.delivered" };
    expect(replacementDeliveryTracking(outbox, [event]).delivered).toBe(false);
    expect(replacementDeliveryTracking(outbox, [{ ...event, recipient: outbox.recipient }]).delivered).toBe(true);
  });

  it("claim version changes when new evidence or CRM data arrives", () => {
    const context = fixture(); const before = replacementContextVersion(context);
    context.originalEvents.push({ ...context.originalEvents[0], id: "new-event", type: "email.delivered" });
    expect(replacementContextVersion(context)).not.toBe(before);
  });

  it("can show corrected-recipient delivery after original provider evidence expires", async () => {
    const { context, deps } = setup();
    context.replacement = { ...context.original, id: "replacement",
      eventKey: bounceReplacementEventKey(context.stayKey), recipient: context.entry.recipient,
      providerMessageId: "provider-replacement", targetUrl: "supplier:hotel-inquiry:revised",
      body: bounceReplacementSnapshot(context, bounceEvidence(), "admin", "saved-fingerprint", new Date()) };
    context.replacementEvents = [{ id: "new-delivered", providerMessageId: "provider-replacement",
      type: "email.delivered", occurredAt: new Date("2026-11-24T15:02:00Z") }];
    deps.verifyEvidence = vi.fn(async (_events, id) => {
      if (id === "provider-original") throw new Error("Historical provider payload expired");
      return [{ ...bounceEvidence()[0], eventId: "new-delivered", providerMessageId: id,
        recipient: context.entry.recipient, type: "email.delivered" }];
    });
    const view = await createBounceReplacementService(deps).review("revised");
    expect(view.deliveryTracking.delivered).toBe(true);
    expect(view.eligible).toBe(false);
    expect(view.bounceEvidence?.recipient).toBe(context.original.recipient);
    expect(deps.verifyEvidence).toHaveBeenCalledTimes(1);
    expect(deps.send).not.toHaveBeenCalled();
  });
});
