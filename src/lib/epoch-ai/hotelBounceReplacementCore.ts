import { createHash } from "node:crypto";
import { reviewBounceReplacement } from "./hotelBounceReplacementSafety";
import type { DeliveryLedgerEvent, VerifiedRecipientEvent } from "./hotelBounceReplacementEvidence";

export const BOUNCE_REPLACEMENT_CC = "info@epochjourneys.com" as const;
export const BOUNCE_REPLACEMENT_REPLY_TO = "erdal@epochjourneys.com" as const;

export type ReplacementInquiry = {
  id: string; tourId: string; supplierId: string; destination: string;
  checkIn: string; checkOut: string; rooms: number; recipient: string;
  subject: string; body: string; status: string;
  approvedAt: Date | null; approvedBy: string | null; createdAt: Date;
  supplier: {
    id: string; name: string; type: string; status: string;
    email: string | null; contacts: Array<{ email: string | null }>;
  };
};

export type ReplacementOutbox = {
  id: string; eventKey: string; recipient: string; subject: string; body: string;
  targetUrl: string; status: string; providerMessageId: string | null;
  createdAt: Date; acceptedAt: Date | null; lastAttemptAt: Date | null;
  lastError: string | null;
};

export type ReplacementContext = {
  entry: ReplacementInquiry;
  newestInquiryId: string | null;
  stayKey: string;
  original: ReplacementOutbox;
  originalInquiry: ReplacementInquiry;
  originalAttemptCount: number;
  originalEvents: DeliveryLedgerEvent[];
  replacement: ReplacementOutbox | null;
  replacementEvents: DeliveryLedgerEvent[];
  contentBlocks: string[];
  previewHtml: string;
  previewText: string;
};

export class ReplacementBlocked extends Error {
  readonly status: number;
  readonly blocks: string[];
  constructor(message: string, status = 409, blocks: string[] = []) {
    super(message);
    this.name = "ReplacementBlocked";
    this.status = status;
    this.blocks = blocks;
  }
}

const normalize = (email: string) => email.trim().toLowerCase();
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const dateText = (value: Date | string | null) => value ? new Date(value).toISOString() : null;

/** A single replacement across all corrected addresses and inquiry revisions. */
export function bounceReplacementEventKey(stayKey: string): string {
  if (!/^supplier:hotel-inquiry:stay:[a-f0-9]{64}:v1$/.test(stayKey)) {
    throw new ReplacementBlocked("The original stay identity could not be verified.");
  }
  return `${stayKey}:bounce-replacement:v1`;
}

export function sameReplacementStay(a: ReplacementInquiry, b: ReplacementInquiry): boolean {
  return a.tourId === b.tourId && a.supplierId === b.supplierId &&
    a.destination.trim().toLowerCase() === b.destination.trim().toLowerCase() &&
    a.checkIn === b.checkIn && a.checkOut === b.checkOut && a.rooms === b.rooms;
}

function parsedObject(body: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(body);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown> : null;
  } catch { return null; }
}

/** Only the existing immutable supplier snapshot can identify the original inquiry. */
export function originalSnapshotInquiryId(outbox: ReplacementOutbox): string | null {
  const snapshot = parsedObject(outbox.body);
  if (snapshot?.schema !== "epoch-hotel-supplier-email-v1" || snapshot.test !== false ||
      snapshot.supplierSentAttempted !== true || typeof snapshot.inquiryId !== "string" ||
      snapshot.inquiryId.length > 128 || !snapshot.inquiryId ||
      snapshot.to !== outbox.recipient || snapshot.subject !== outbox.subject ||
      snapshot.cc !== BOUNCE_REPLACEMENT_CC ||
      outbox.targetUrl !== `supplier:hotel-inquiry:${snapshot.inquiryId}`) return null;
  return snapshot.inquiryId;
}

function sortedLedger(events: DeliveryLedgerEvent[]) {
  return events.map(e => [e.id, e.providerMessageId, e.type, dateText(e.occurredAt)])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

/** Re-read inside the claim transaction; a changed approval, CRM or event set invalidates SEND. */
export function replacementContextVersion(context: ReplacementContext): string {
  const orderedInquiry = (entry: ReplacementInquiry) => ({ ...entry,
    supplier: { ...entry.supplier, contacts: entry.supplier.contacts.map(c => c.email).sort() } });
  return hash({
    entry: orderedInquiry(context.entry),
    newestInquiryId: context.newestInquiryId, stayKey: context.stayKey,
    original: context.original, originalInquiry: orderedInquiry(context.originalInquiry),
    originalAttemptCount: context.originalAttemptCount,
    originalEvents: sortedLedger(context.originalEvents),
    replacement: context.replacement,
    replacementEvents: sortedLedger(context.replacementEvents),
    contentBlocks: context.contentBlocks, html: context.previewHtml, text: context.previewText,
  });
}

/** Previously verified evidence is display-only once the unique replacement is consumed. */
export function recordedReplacementEvidence(context: ReplacementContext): VerifiedRecipientEvent[] {
  const snapshot = context.replacement && parsedObject(context.replacement.body);
  if (!snapshot || snapshot.schema !== "epoch-hotel-bounce-replacement-v1" ||
      snapshot.originalOutboxId !== context.original.id ||
      snapshot.originalProviderMessageId !== context.original.providerMessageId ||
      snapshot.evidenceSource !== "resend-authenticated-webhook-event-api" || !Array.isArray(snapshot.evidence)) return [];
  return snapshot.evidence.filter((event): event is VerifiedRecipientEvent =>
    !!event && typeof event === "object" && !Array.isArray(event) &&
    event.providerMessageId === context.original.providerMessageId &&
    typeof event.eventId === "string" && typeof event.type === "string" &&
    typeof event.recipient === "string" && typeof event.occurredAt === "string" &&
    typeof event.payloadHash === "string" &&
    [event.bounceType, event.bounceSubType, event.bounceMessage]
      .every(value => value === undefined || typeof value === "string"));
}

export function reviewReplacementContext(context: ReplacementContext, evidence: VerifiedRecipientEvent[]) {
  const { entry, original, originalInquiry } = context;
  const originalRecipient = normalize(original.recipient);
  const relevant = evidence.filter(e => e.providerMessageId === original.providerMessageId &&
    normalize(e.recipient) === originalRecipient);
  const bounce = relevant.find(e => e.type === "email.bounced" && e.bounceType === "Permanent");
  // Suppression following a permanent bounce is expected. A delivered CC is independent.
  const conflicts = relevant.some(e => ["email.delivered", "email.complained"].includes(e.type)) ||
    evidence.some(e => e.type === "email.complained");
  const reviewed = reviewBounceReplacement({
    originalRecipient: original.recipient,
    replacementRecipient: entry.recipient,
    crmEmails: [entry.supplier.email, ...entry.supplier.contacts.map(c => c.email)]
      .filter((email): email is string => !!email),
    originalOutboxId: original.id,
    originalProviderMessageId: original.providerMessageId || "",
    sameHotelStay: sameReplacementStay(entry, originalInquiry),
    originalRecipientBounceVerified: !!bounce,
    originalHadOtherDeliveryProblem: conflicts,
    replacementAlreadyAttempted: !!context.replacement,
    adminApproved: entry.status === "APPROVED" && !!entry.approvedAt && !!entry.approvedBy,
  });
  const blocks = [...reviewed.blocks, ...context.contentBlocks];
  if (entry.recipient.length > 254 || entry.recipient !== entry.recipient.trim() ||
      !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(entry.recipient)) {
    blocks.push("The replacement must contain one valid email address with no extra separators or whitespace.");
  }
  if (entry.supplier.type !== "HOTEL") blocks.push("The selected supplier must be a hotel.");
  if (context.newestInquiryId !== entry.id) blocks.push("Use the newest saved inquiry for this hotel stay.");
  if (context.originalAttemptCount !== 1) blocks.push("Multiple original attempts require investigation.");
  if (!["ACCEPTED", "BOUNCED", "SUPPRESSED"].includes(original.status)) {
    blocks.push("The original send outcome is unresolved or is not an eligible bounced attempt.");
  }
  const snapshot = parsedObject(original.body);
  const validKey = original.eventKey === context.stayKey ||
    original.eventKey === `supplier:hotel-inquiry:${originalInquiry.id}:v1`;
  if (originalSnapshotInquiryId(original) !== originalInquiry.id ||
      snapshot?.supplierId !== entry.supplierId || !validKey ||
      originalInquiry.recipient !== original.recipient || originalInquiry.subject !== original.subject) {
    blocks.push("The original approved inquiry does not match its permanent sending record.");
  }
  if (entry.id === originalInquiry.id || entry.createdAt <= original.createdAt ||
      (bounce && (!entry.approvedAt || entry.approvedAt < new Date(bounce.occurredAt)))) {
    blocks.push("Create a revised draft with the corrected CRM address, then SAVE and APPROVE it.");
  }
  const uniqueBlocks = [...new Set(blocks)];
  return { eligible: uniqueBlocks.length === 0, blocks: uniqueBlocks, bounce };
}

export function bounceReplacementFingerprint(context: ReplacementContext, evidence: VerifiedRecipientEvent[]): string {
  return hash({
    schema: "epoch-hotel-bounce-confirmation-v1",
    eventKey: bounceReplacementEventKey(context.stayKey),
    inquiryId: context.entry.id, supplierId: context.entry.supplierId,
    originalOutboxId: context.original.id,
    originalProviderMessageId: context.original.providerMessageId,
    originalRecipient: context.original.recipient,
    to: context.entry.recipient, cc: BOUNCE_REPLACEMENT_CC, replyTo: BOUNCE_REPLACEMENT_REPLY_TO,
    subject: context.entry.subject, html: context.previewHtml, text: context.previewText,
    approvedAt: dateText(context.entry.approvedAt), approvedBy: context.entry.approvedBy,
    evidence: evidence.map(e => [e.eventId, e.providerMessageId, e.recipient, e.type, e.payloadHash])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  });
}

export function validateBounceReplacementConfirmation(
  value: unknown, context: ReplacementContext, fingerprint: string,
): value is { mode: "VALIDATE_ONLY" | "SEND"; confirmation: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const correctAction = (v.mode === "VALIDATE_ONLY" && v.confirmation === "VALIDATE") ||
    (v.mode === "SEND" && v.confirmation === "SEND");
  return correctAction && v.inquiryId === context.entry.id &&
    v.to === context.entry.recipient && v.cc === BOUNCE_REPLACEMENT_CC &&
    v.subject === context.entry.subject && v.fingerprint === fingerprint &&
    v.originalOutboxId === context.original.id &&
    v.originalProviderMessageId === context.original.providerMessageId;
}

export function bounceReplacementSnapshot(
  context: ReplacementContext, evidence: VerifiedRecipientEvent[], actor: string,
  fingerprint: string, authorizedAt: Date,
): string {
  return JSON.stringify({
    schema: "epoch-hotel-bounce-replacement-v1", test: false, supplierSentAttempted: true,
    inquiryId: context.entry.id, supplierId: context.entry.supplierId,
    originalInquiryId: context.originalInquiry.id,
    originalOutboxId: context.original.id,
    originalProviderMessageId: context.original.providerMessageId,
    originalRecipient: context.original.recipient,
    originalStayKey: context.stayKey,
    to: context.entry.recipient, cc: BOUNCE_REPLACEMENT_CC, replyTo: BOUNCE_REPLACEMENT_REPLY_TO,
    subject: context.entry.subject, html: context.previewHtml, text: context.previewText,
    evidenceSource: "resend-authenticated-webhook-event-api",
    evidence, fingerprint, authorizedBy: actor, authorizedAt: authorizedAt.toISOString(),
  });
}

export function replacementDeliveryTracking(outbox: ReplacementOutbox | null, evidence: VerifiedRecipientEvent[]) {
  if (!outbox) return { code: "NOT_ATTEMPTED", label: "No replacement email attempted", delivered: false, requiresInvestigation: false };
  const ownEvents = evidence.filter(e => e.providerMessageId === outbox.providerMessageId &&
    normalize(e.recipient) === normalize(outbox.recipient));
  const types = new Set(ownEvents.map(e => e.type));
  if (["email.bounced", "email.complained", "email.failed", "email.suppressed"].some(type => types.has(type))) {
    return { code: "DELIVERY_PROBLEM", label: "Replacement delivery problem - investigate before any further action", delivered: false, requiresInvestigation: true };
  }
  if (types.has("email.delivered")) return { code: "DELIVERED_REPORTED", label: "Delivery to the corrected hotel address reported by Resend", delivered: true, requiresInvestigation: false };
  if (types.has("email.delivery_delayed")) return { code: "DELIVERY_DELAYED", label: "Replacement delivery delayed - monitor the existing attempt", delivered: false, requiresInvestigation: true };
  if (outbox.status === "ACCEPTED") return { code: "PROVIDER_ACCEPTED", label: "Replacement accepted by Resend; hotel delivery not yet confirmed", delivered: false, requiresInvestigation: false };
  return { code: "INVESTIGATE", label: "Replacement attempt recorded - investigate its outcome before any further action", delivered: false, requiresInvestigation: true };
}
