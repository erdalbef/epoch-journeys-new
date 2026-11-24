import { createHash } from "node:crypto";

export type DeliveryLedgerEvent = {
  id: string;
  providerMessageId: string;
  type: string;
  occurredAt: Date | string;
};

export type VerifiedRecipientEvent = {
  eventId: string;
  providerMessageId: string;
  type: string;
  recipient: string;
  occurredAt: string;
  payloadHash: string;
  bounceType?: string;
  bounceSubType?: string;
  bounceMessage?: string;
};

/** Errors are safe to show to an Admin. Provider bodies and credentials are never included. */
export class EvidenceReadError extends Error {
  public readonly code: string;
  public readonly status: number;
  constructor(
    code: string,
    message: string,
    status = 503,
  ) {
    super(message);
    this.name = "EvidenceReadError";
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_WEBHOOK = "https://www.epochjourneys.com/api/webhooks/resend/hotel-supplier";
const API_ORIGIN = "https://api.resend.com";
const MAX_EVENTS = 24;
const MAX_WEBHOOK_PAGES = 6;
const MAX_RESPONSE_BYTES = 262144;
const REQUEST_SPACING_MS = 600;
const EVENT_TYPES = new Set([
  "email.delivered", "email.bounced", "email.complained",
  "email.failed", "email.suppressed", "email.delivery_delayed",
]);
const ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;
const EMAIL_PATTERN = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isoTime(value: unknown): string | null {
  if (!(typeof value === "string" || value instanceof Date)) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function invalidEvidence(): never {
  throw new EvidenceReadError(
    "EVIDENCE_MISMATCH",
    "Provider event evidence does not match the saved delivery record. Review the original send before proceeding.",
    409,
  );
}

function optionalText(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.length <= maxLength ? value : undefined;
}

/**
 * Recover recipient-specific delivery evidence from Resend's authenticated event API.
 * The supplied IDs must come from our signed-webhook ledger, never from a browser.
 * This function performs GET requests only. It does not send, replay or alter an email.
 * Docs: https://resend.com/docs/api-reference/webhooks/get-event
 * Recipient semantics: https://resend.com/changelog/webhook-event-visibility
 */
export async function fetchVerifiedRecipientEvents(
  input: {
    apiKey: string;
    events: DeliveryLedgerEvent[];
    expectedProviderMessageId: string;
    expectedWebhookEndpoint?: string;
  },
  fetcher: typeof fetch = fetch,
): Promise<VerifiedRecipientEvent[]> {
  if (!input.apiKey?.trim()) {
    throw new EvidenceReadError("PROVIDER_KEY_MISSING", "Provider event access is not configured. No replacement was authorized.");
  }
  if (!ID_PATTERN.test(input.expectedProviderMessageId)) invalidEvidence();

  const events = new Map<string, DeliveryLedgerEvent>();
  for (const event of input.events) {
    if (!ID_PATTERN.test(event.id) || event.providerMessageId !== input.expectedProviderMessageId ||
        !EVENT_TYPES.has(event.type) || !isoTime(event.occurredAt)) invalidEvidence();
    const previous = events.get(event.id);
    if (previous && (previous.type !== event.type ||
        previous.providerMessageId !== event.providerMessageId ||
        isoTime(previous.occurredAt) !== isoTime(event.occurredAt))) invalidEvidence();
    events.set(event.id, event);
  }
  if (!events.size) {
    throw new EvidenceReadError("NO_SAVED_EVENTS", "No saved delivery events are available to verify the original recipient's bounce.", 409);
  }
  if (events.size > MAX_EVENTS) {
    throw new EvidenceReadError("TOO_MANY_EVENTS", "The original send has more delivery events than this replacement review can verify. Manual investigation is required.", 409);
  }

  const endpoint = input.expectedWebhookEndpoint ?? DEFAULT_WEBHOOK;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) invalidEvidence();
  } catch (error) {
    if (error instanceof EvidenceReadError) throw error;
    invalidEvidence();
  }

  let requested = false;
  async function getJson(path: string): Promise<Record<string, unknown>> {
    // Pace this review's requests without retrying a failed request.
    if (requested) await new Promise<void>((resolve) => setTimeout(resolve, REQUEST_SPACING_MS));
    requested = true;
    let response: Response;
    try {
      response = await fetcher(`${API_ORIGIN}${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${input.apiKey.trim()}`, Accept: "application/json" },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new EvidenceReadError("PROVIDER_UNAVAILABLE", "Provider event access is temporarily unavailable. Review again later; no replacement was authorized.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new EvidenceReadError("PROVIDER_ACCESS_DENIED", "Provider event access is unavailable for the configured Resend key. Event-read permission must be reviewed before a replacement can be authorized.");
    }
    if (response.status === 429) {
      throw new EvidenceReadError("PROVIDER_RATE_LIMITED", "Provider event access is rate limited. Review again later; no replacement was authorized.");
    }
    if (!response.ok) {
      throw new EvidenceReadError("PROVIDER_EVENT_UNAVAILABLE", "A required provider event could not be retrieved. Review the original send before proceeding.");
    }
    const length = response.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > MAX_RESPONSE_BYTES)) {
      throw new EvidenceReadError("INVALID_PROVIDER_RESPONSE", "Provider event response could not be verified.");
    }
    let value: unknown;
    try {
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) throw new Error();
      value = JSON.parse(text);
    } catch {
      throw new EvidenceReadError("INVALID_PROVIDER_RESPONSE", "Provider event response could not be verified.");
    }
    if (!record(value)) {
      throw new EvidenceReadError("INVALID_PROVIDER_RESPONSE", "Provider event response could not be verified.");
    }
    return value;
  }

  let webhookId: string | undefined;
  let after: string | undefined;
  const seenCursors = new Set<string>();
  let finished = false;
  for (let page = 0; page < MAX_WEBHOOK_PAGES; page++) {
    const result = await getJson(`/webhooks?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`);
    if (result.object !== "list" || !Array.isArray(result.data) ||
        typeof result.has_more !== "boolean" || result.data.length > 100) invalidEvidence();
    for (const webhook of result.data) {
      if (!record(webhook) || typeof webhook.id !== "string" || !ID_PATTERN.test(webhook.id) ||
          typeof webhook.endpoint !== "string" || typeof webhook.status !== "string") invalidEvidence();
      if (webhook.endpoint === endpoint && webhook.status === "enabled") {
        if (webhookId) {
          throw new EvidenceReadError("AMBIGUOUS_WEBHOOK", "More than one enabled supplier webhook matches this environment. Review the provider configuration.");
        }
        webhookId = webhook.id;
      }
    }
    if (!result.has_more) {
      finished = true;
      break;
    }
    const last = result.data.at(-1);
    if (!record(last) || typeof last.id !== "string" || seenCursors.has(last.id)) invalidEvidence();
    after = last.id;
    seenCursors.add(after);
  }
  if (!finished) {
    throw new EvidenceReadError("WEBHOOK_LIST_INCOMPLETE", "Supplier webhook lookup exceeded its review limit. Review the provider configuration.");
  }
  if (!webhookId) {
    throw new EvidenceReadError("WEBHOOK_NOT_FOUND", "No enabled supplier webhook matches this environment. Review the provider configuration.");
  }

  const verified: VerifiedRecipientEvent[] = [];
  for (const event of events.values()) {
    const result = await getJson(`/webhooks/${encodeURIComponent(webhookId)}/events/${encodeURIComponent(event.id)}`);
    if (result.object !== "webhook_event" || result.id !== event.id || result.type !== event.type ||
        !isoTime(result.created_at) || !record(result.payload)) invalidEvidence();
    const payload = result.payload;
    // The ledger records the signed payload's occurrence time. The API envelope's
    // creation time can describe when the webhook record was created instead.
    if (payload.type !== event.type || isoTime(payload.created_at) !== isoTime(event.occurredAt) ||
        !record(payload.data)) invalidEvidence();
    const data = payload.data;
    if (data.email_id !== input.expectedProviderMessageId || !Array.isArray(data.to) || data.to.length !== 1 ||
        typeof data.to[0] !== "string" || data.to[0] !== data.to[0].trim() ||
        data.to[0].length > 254 || !EMAIL_PATTERN.test(data.to[0])) invalidEvidence();
    const bounce = record(data.bounce) ? data.bounce : {};
    const bounceType = optionalText(bounce.type, 128);
    const bounceSubType = optionalText(bounce.subType, 128);
    const bounceMessage = optionalText(bounce.message, 2000);
    verified.push({
      eventId: event.id,
      providerMessageId: input.expectedProviderMessageId,
      type: event.type,
      recipient: data.to[0].toLowerCase(),
      occurredAt: isoTime(payload.created_at)!,
      payloadHash: createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex"),
      ...(bounceType !== undefined ? { bounceType } : {}),
      ...(bounceSubType !== undefined ? { bounceSubType } : {}),
      ...(bounceMessage !== undefined ? { bounceMessage } : {}),
    });
  }
  return verified;
}
