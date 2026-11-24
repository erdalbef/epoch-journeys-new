import {
  BOUNCE_REPLACEMENT_CC, BOUNCE_REPLACEMENT_REPLY_TO, ReplacementBlocked,
  bounceReplacementEventKey, bounceReplacementFingerprint, bounceReplacementSnapshot,
  replacementContextVersion, replacementDeliveryTracking, reviewReplacementContext, recordedReplacementEvidence,
  validateBounceReplacementConfirmation,
} from "./hotelBounceReplacementCore";
import type { ReplacementContext } from "./hotelBounceReplacementCore";
import type { DeliveryLedgerEvent, VerifiedRecipientEvent } from "./hotelBounceReplacementEvidence";

export type ReplacementOutcome = {
  status: "ACCEPTED" | "FAILED" | "UNCERTAIN";
  providerMessageId: string | null;
};

export type ReplacementDependencies = {
  loadContext: (id: string) => Promise<ReplacementContext>;
  verifyEvidence: (events: DeliveryLedgerEvent[], providerMessageId: string) => Promise<VerifiedRecipientEvent[]>;
  sendEnabled: () => boolean;
  environmentAllowed: () => boolean;
  emailConfigured: () => boolean;
  claim: (input: {
    inquiryId: string; expectedContextVersion: string; eventKey: string;
    recipient: string; subject: string; snapshot: string;
  }) => Promise<void>;
  send: (input: {
    to: string; cc: string; replyTo: string; subject: string; html: string; text: string;
  }) => Promise<{ data?: { id?: string } | null; error?: unknown } | null>;
  finalize: (eventKey: string, outcome: ReplacementOutcome) => Promise<void>;
  now?: () => Date;
};

/** Orchestration is isolated so meaningful tests never contact a database or email provider. */
export function createBounceReplacementService(deps: ReplacementDependencies) {
  async function prepare(id: string) {
    const context = await deps.loadContext(id);
    let evidence: VerifiedRecipientEvent[] = context.replacement ? recordedReplacementEvidence(context) : [];
    let evidenceError: string | null = null;
    if (!context.replacement && context.original.providerMessageId && context.originalEvents.some(e => e.type === "email.bounced")) {
      evidence = await deps.verifyEvidence(context.originalEvents, context.original.providerMessageId);
    }
    const review = reviewReplacementContext(context, evidence);
    const fingerprint = bounceReplacementFingerprint(context, evidence);
    let replacementEvidence: VerifiedRecipientEvent[] = [];
    if (context.replacement?.providerMessageId && context.replacementEvents.length) {
      try {
        replacementEvidence = await deps.verifyEvidence(context.replacementEvents, context.replacement.providerMessageId);
      } catch {
        evidenceError = "The replacement attempt is recorded, but recipient-specific delivery evidence is unavailable. Review its provider record.";
      }
    }
    const tracking = replacementDeliveryTracking(context.replacement, replacementEvidence);
    if (evidenceError && context.replacement) {
      tracking.label = evidenceError;
      tracking.requiresInvestigation = true;
      tracking.delivered = false;
    }
    const e = context.entry;
    return {
      context, evidence,
      view: {
        inquiryId: e.id, supplierName: e.supplier.name,
        to: e.recipient, cc: BOUNCE_REPLACEMENT_CC, replyTo: BOUNCE_REPLACEMENT_REPLY_TO,
        subject: e.subject,
        stay: { destination: e.destination, checkIn: e.checkIn, checkOut: e.checkOut, rooms: e.rooms },
        original: {
          outboxId: context.original.id, providerMessageId: context.original.providerMessageId || "",
          recipient: context.original.recipient, status: context.original.status,
        },
        replacement: context.replacement ? {
          status: context.replacement.status, providerMessageId: context.replacement.providerMessageId,
          recipient: context.replacement.recipient,
          inquiryId: context.replacement.targetUrl.replace(/^supplier:hotel-inquiry:/, ""),
        } : null,
        eligible: review.eligible,
        blocks: context.replacement ? ["A replacement attempt is already recorded. Review its status below."] : review.blocks,
        sendEnabled: deps.sendEnabled() && deps.environmentAllowed() && deps.emailConfigured(),
        previewHtml: context.previewHtml, previewText: context.previewText, fingerprint,
        bounceEvidence: review.bounce ? {
          recipient: review.bounce.recipient, eventId: review.bounce.eventId,
          occurredAt: review.bounce.occurredAt, message: review.bounce.bounceMessage,
        } : undefined,
        deliveryTracking: tracking,
      },
    };
  }

  return {
    async review(id: string) { return (await prepare(id)).view; },

    async submit(id: string, submitted: unknown, actor: string) {
      if (!actor.trim()) throw new ReplacementBlocked("An authenticated Admin identity is required.", 403);
      const { context, evidence, view } = await prepare(id);
      if (!validateBounceReplacementConfirmation(submitted, context, view.fingerprint)) {
        throw new ReplacementBlocked("The review or confirmation changed. Reload REVIEW and validate the exact replacement again.");
      }
      if (!view.eligible) throw new ReplacementBlocked("Replacement is blocked by the review checks.", 409, view.blocks);
      if (submitted.mode === "VALIDATE_ONLY") {
        return {
          status: "VALIDATED_NOT_SENT", inquiryId: id, fingerprint: view.fingerprint,
          to: view.to, cc: BOUNCE_REPLACEMENT_CC, sent: false, outboxCreated: false,
        };
      }
      if (!deps.sendEnabled()) throw new ReplacementBlocked("Supplier sending is not activated in this release.", 423);
      if (!deps.environmentAllowed()) throw new ReplacementBlocked("Supplier sending is not allowed in this environment.", 403);
      if (!deps.emailConfigured()) throw new ReplacementBlocked("Email delivery is not configured. No send was attempted.", 503);

      const key = bounceReplacementEventKey(context.stayKey);
      const snapshot = bounceReplacementSnapshot(context, evidence, actor, view.fingerprint, (deps.now || (() => new Date()))());
      // This committed DB-unique claim is the only entry to the provider call.
      // A transaction rechecks approval, CRM and the signed event set before creating it.
      await deps.claim({
        inquiryId: id, expectedContextVersion: replacementContextVersion(context),
        eventKey: key, recipient: context.entry.recipient, subject: context.entry.subject, snapshot,
      });
      const outcome: ReplacementOutcome = { status: "UNCERTAIN", providerMessageId: null };
      try {
        const result = await deps.send({
          to: context.entry.recipient, cc: BOUNCE_REPLACEMENT_CC, replyTo: BOUNCE_REPLACEMENT_REPLY_TO,
          subject: context.entry.subject, html: context.previewHtml, text: context.previewText,
        });
        if (result?.data?.id && !result.error) {
          outcome.status = "ACCEPTED";
          outcome.providerMessageId = result.data.id;
        } else if (result?.error) outcome.status = "FAILED";
      } catch {
        // An interrupted provider request may have sent the email. Its claim remains consumed.
      }
      try { await deps.finalize(key, outcome); }
      catch {
        throw new ReplacementBlocked("The replacement may have been sent, but its audit update failed. Do not resend; inspect the recorded attempt and Resend.", 503);
      }
      return {
        inquiryId: id, status: outcome.status, providerMessageId: outcome.providerMessageId,
        to: context.entry.recipient, cc: BOUNCE_REPLACEMENT_CC,
        outboxCreated: true, sendAttempted: true, deliveryConfirmed: false,
      };
    },
  };
}
