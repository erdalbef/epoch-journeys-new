import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EvidenceReadError,
  fetchVerifiedRecipientEvents,
  type DeliveryLedgerEvent,
} from "./hotelBounceReplacementEvidence";

const endpoint = "https://www.epochjourneys.com/api/webhooks/resend/hotel-supplier";
const occurredAt = "2026-11-24T12:59:00.000Z";
const providerMessageId = "01a20cff-4690-74d9-84d9-743d968a871e";
const bounce: DeliveryLedgerEvent = { id: "msg_bounce", providerMessageId, type: "email.bounced", occurredAt };
const delivered: DeliveryLedgerEvent = { id: "msg_delivered", providerMessageId, type: "email.delivered", occurredAt };
const webhook = { id: "webhook-1", endpoint, status: "enabled" };
const webhookList = { object: "list", has_more: false, data: [webhook] };
const input = { apiKey: "test-key-not-a-secret", events: [bounce], expectedProviderMessageId: providerMessageId };

function providerEvent(event = bounce, recipient = "groups@humahotel.me") {
  return {
    object: "webhook_event", id: event.id, type: event.type, created_at: occurredAt,
    payload: { type: event.type, created_at: occurredAt, data: {
      email_id: providerMessageId, to: [recipient],
      ...(event.type === "email.bounced" ? { bounce: { type: "Permanent", subType: "NoEmail", message: "Recipient not found" } } : {}),
    } },
  };
}

function mockFetch(responses: Array<unknown | Response>) {
  return vi.fn(async () => {
    const next = responses.shift();
    if (next === undefined) throw new Error("Unexpected request");
    return next instanceof Response ? next : new Response(JSON.stringify(next), { status: 200 });
  });
}

async function complete<T>(promise: Promise<T>): Promise<T> {
  // Attach rejection handling before advancing timers; fail-closed test cases reject intentionally.
  const settled = promise.then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }));
  await vi.runAllTimersAsync();
  const result = await settled;
  if (!result.ok) throw result.error;
  return result.value;
}

afterEach(() => vi.useRealTimers());

describe("Verified recipient evidence for a bounced supplier replacement", () => {
  it("recovers supplier bounce and delivered CC as distinct recipient events using GET only", async () => {
    vi.useFakeTimers();
    const fetcher = mockFetch([webhookList, providerEvent(), providerEvent(delivered, "info@epochjourneys.com")]);
    const result = await complete(fetchVerifiedRecipientEvents({ ...input, events: [bounce, delivered] }, fetcher));
    expect(result.map(e => [e.type, e.recipient])).toEqual([
      ["email.bounced", "groups@humahotel.me"], ["email.delivered", "info@epochjourneys.com"],
    ]);
    expect(result[0]).toMatchObject({ bounceType: "Permanent", bounceSubType: "NoEmail", bounceMessage: "Recipient not found" });
    expect(result[0].payloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(fetcher).toHaveBeenCalledTimes(3);
    for (const [url, options] of fetcher.mock.calls as unknown as Array<[string, RequestInit]>) {
      expect(url.startsWith("https://api.resend.com/")).toBe(true);
      expect(options).toMatchObject({ method: "GET", cache: "no-store", redirect: "error" });
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("deduplicates identical signed ledger and pending-inbox event IDs", async () => {
    vi.useFakeTimers();
    const fetcher = mockFetch([webhookList, providerEvent()]);
    const result = await complete(fetchVerifiedRecipientEvents({ ...input, events: [bounce, { ...bounce, occurredAt: new Date(occurredAt) }] }, fetcher));
    expect(result).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("matches the signed payload occurrence time when the API record was created later", async () => {
    vi.useFakeTimers();
    const value = providerEvent();
    value.created_at = "2026-11-24T12:59:00.250Z";
    const fetcher = mockFetch([webhookList, value]);
    const result = await complete(fetchVerifiedRecipientEvents(input, fetcher));
    expect(result[0].occurredAt).toBe(occurredAt);
  });

  it("rejects conflicting copies of a saved event before contacting the provider", async () => {
    const fetcher = mockFetch([]);
    await expect(fetchVerifiedRecipientEvents({ ...input, events: [bounce, { ...bounce, type: "email.delivered" }] }, fetcher))
      .rejects.toMatchObject({ code: "EVIDENCE_MISMATCH" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong provider message", (value: ReturnType<typeof providerEvent>) => { value.payload.data.email_id = "another-message"; }],
    ["wrong event ID", (value: ReturnType<typeof providerEvent>) => { value.id = "msg_another"; }],
    ["wrong event type", (value: ReturnType<typeof providerEvent>) => { value.payload.type = "email.delivered"; }],
    ["wrong occurrence time", (value: ReturnType<typeof providerEvent>) => { value.payload.created_at = "2026-11-23T12:59:00.000Z"; }],
    ["invalid API creation time", (value: ReturnType<typeof providerEvent>) => { value.created_at = "invalid-date"; }],
    ["ambiguous recipients", (value: ReturnType<typeof providerEvent>) => { value.payload.data.to.push("info@epochjourneys.com"); }],
    ["missing recipient", (value: ReturnType<typeof providerEvent>) => { value.payload.data.to = []; }],
    ["invalid recipient", (value: ReturnType<typeof providerEvent>) => { value.payload.data.to = ["groups@humahotel.me;other@example.com"]; }],
  ] as const)("rejects %s without deriving replacement eligibility", async (_label, mutate) => {
    vi.useFakeTimers();
    const value = providerEvent();
    mutate(value);
    const fetcher = mockFetch([webhookList, value]);
    await expect(complete(fetchVerifiedRecipientEvents(input, fetcher))).rejects.toMatchObject({ code: "EVIDENCE_MISMATCH" });
  });

  it.each([401, 403, 429, 500])("fails closed on provider status %s without exposing its body or retrying", async (status) => {
    const fetcher = mockFetch([new Response("SENSITIVE PROVIDER ERROR test-key-not-a-secret", { status })]);
    const error = await fetchVerifiedRecipientEvents(input, fetcher).catch(error => error);
    expect(error).toBeInstanceOf(EvidenceReadError);
    expect(error.message).not.toContain("SENSITIVE");
    expect(error.message).not.toContain(input.apiKey);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not authorize evidence from a different endpoint or disabled webhook", async () => {
    const fetcher = mockFetch([{ ...webhookList, data: [
      { ...webhook, status: "disabled" }, { ...webhook, id: "webhook-2", endpoint: "https://other.example/webhook" },
    ] }]);
    await expect(fetchVerifiedRecipientEvents(input, fetcher)).rejects.toMatchObject({ code: "WEBHOOK_NOT_FOUND" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects ambiguous enabled supplier webhooks", async () => {
    const fetcher = mockFetch([{ ...webhookList, data: [webhook, { ...webhook, id: "webhook-2" }] }]);
    await expect(fetchVerifiedRecipientEvents(input, fetcher)).rejects.toMatchObject({ code: "AMBIGUOUS_WEBHOOK" });
  });

  it("checks later webhook pages before selecting the unique enabled endpoint", async () => {
    vi.useFakeTimers();
    const fetcher = mockFetch([
      { ...webhookList, has_more: true, data: [{ ...webhook, id: "webhook-other", endpoint: "https://other.example/hook" }] },
      webhookList, providerEvent(),
    ]);
    expect(await complete(fetchVerifiedRecipientEvents(input, fetcher))).toHaveLength(1);
    expect(fetcher.mock.calls[1]).toEqual([
      "https://api.resend.com/webhooks?limit=100&after=webhook-other", expect.any(Object),
    ]);
  });

  it("rejects a truncated provider pagination result even when an earlier page matched", async () => {
    vi.useFakeTimers();
    const fetcher = mockFetch(Array.from({ length: 6 }, (_, index) => ({
      ...webhookList, has_more: true,
      data: [{ ...webhook, id: `webhook-${index}`, endpoint: index === 0 ? endpoint : `https://other.example/${index}` }],
    })));
    await expect(complete(fetchVerifiedRecipientEvents(input, fetcher))).rejects.toMatchObject({ code: "WEBHOOK_LIST_INCOMPLETE" });
    expect(fetcher).toHaveBeenCalledTimes(6);
  });

  it("bounds unique evidence requests and rejects unavailable evidence before network access", async () => {
    const fetcher = mockFetch([]);
    await expect(fetchVerifiedRecipientEvents({ ...input, events: [] }, fetcher)).rejects.toMatchObject({ code: "NO_SAVED_EVENTS" });
    await expect(fetchVerifiedRecipientEvents({ ...input, events: Array.from({ length: 25 }, (_, index) => ({ ...bounce, id: `msg_${index}` })) }, fetcher))
      .rejects.toMatchObject({ code: "TOO_MANY_EVENTS" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails closed for malformed provider JSON and oversized declared responses", async () => {
    for (const response of [new Response("not-json"), new Response("{}", { headers: { "content-length": "999999" } })]) {
      await expect(fetchVerifiedRecipientEvents(input, mockFetch([response]))).rejects.toMatchObject({ code: "INVALID_PROVIDER_RESPONSE" });
    }
  });

  it("fails closed on fetch failure without including the thrown error", async () => {
    const fetcher = vi.fn(async () => { throw new Error("leaked credential text"); });
    const error = await fetchVerifiedRecipientEvents(input, fetcher).catch(error => error);
    expect(error).toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(error.message).not.toContain("credential");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
