import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BOUNCE_REPLACEMENT_CC, ReplacementBlocked, bounceReplacementEventKey,
  bounceReplacementSnapshot, replacementContextVersion,
} from "./hotelBounceReplacementCore";
import type { ReplacementContext, ReplacementInquiry, ReplacementOutbox } from "./hotelBounceReplacementCore";
import type { DeliveryLedgerEvent } from "./hotelBounceReplacementEvidence";
import { supplierStayEventKey } from "./hotelSupplierSendSafety";

const mocked = vi.hoisted(() => ({
  client: {
    hotelInquiry: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    epochEmailOutbox: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    epochSupplierDeliveryEvent: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    epochSupplierWebhookInbox: { findMany: vi.fn(), deleteMany: vi.fn() },
  },
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { ...mocked.client, $transaction: mocked.transaction } }));
vi.mock("./hotelInquiryEmailFormat", () => ({
  formatHotelInquiryEmail: (subject: string, body: string) => ({ html: `<p>${body}</p>`, text: `${subject}\n${body}` }),
}));
vi.mock("./hotelSendReadiness", () => ({
  evaluateHotelSendReadiness: () => ({ ready: true, checks: [], blocks: [] }),
}));

import {
  claimBounceReplacement, finalizeBounceReplacement, loadBounceReplacementContext,
} from "./hotelBounceReplacementStore";

type SavedOutbox = ReplacementOutbox & {
  attempts?: number; nextAttemptAt?: Date | null; leaseExpiresAt?: Date | null; updatedAt?: Date;
};
type CreatedOutboxData = Omit<SavedOutbox, "createdAt" | "acceptedAt" | "providerMessageId" | "lastError">;
type RecordedEvent = DeliveryLedgerEvent & { outboxId: string };
let state: {
  inquiries: ReplacementInquiry[];
  outboxes: SavedOutbox[];
  events: RecordedEvent[];
  pending: DeliveryLedgerEvent[];
};

function initialState(): typeof state {
  const originalInquiry: ReplacementInquiry = {
    id: "original", tourId: "tour", supplierId: "hotel", destination: "Kotor Bay",
    checkIn: "2027-05-08", checkOut: "2027-05-10", rooms: 20,
    recipient: "groups@humahotel.me", subject: "Group accommodation", body: "Approved inquiry",
    status: "APPROVED", approvedAt: new Date("2026-11-24T10:00:00Z"), approvedBy: "admin",
    createdAt: new Date("2026-11-24T09:00:00Z"),
    supplier: { id: "hotel", name: "HUMA", type: "HOTEL", status: "ACTIVE",
      email: "reservations@humahotel.me", contacts: [] },
  };
  const entry: ReplacementInquiry = {
    ...structuredClone(originalInquiry), id: "revised", recipient: "reservations@humahotel.me",
    createdAt: new Date("2026-11-24T13:30:00Z"), approvedAt: new Date("2026-11-24T14:00:00Z"),
  };
  const original: ReplacementOutbox = {
    id: "original-outbox", eventKey: supplierStayEventKey(originalInquiry),
    recipient: originalInquiry.recipient, subject: originalInquiry.subject,
    body: JSON.stringify({ schema: "epoch-hotel-supplier-email-v1", test: false,
      supplierSentAttempted: true, inquiryId: originalInquiry.id, supplierId: "hotel",
      to: originalInquiry.recipient, subject: originalInquiry.subject, cc: BOUNCE_REPLACEMENT_CC }),
    targetUrl: "supplier:hotel-inquiry:original", status: "ACCEPTED", providerMessageId: "provider-original",
    createdAt: new Date("2026-11-24T12:59:00Z"), acceptedAt: new Date("2026-11-24T12:59:00Z"),
    lastAttemptAt: new Date("2026-11-24T12:59:00Z"), lastError: null,
  };
  return { inquiries: [entry, originalInquiry], outboxes: [original], pending: [],
    events: [{ id: "msg_bounce", outboxId: original.id, providerMessageId: "provider-original",
      type: "email.bounced", occurredAt: new Date("2026-11-24T13:00:00Z") }] };
}

function claimInput(context: ReplacementContext) {
  return {
    inquiryId: context.entry.id, expectedContextVersion: replacementContextVersion(context),
    eventKey: bounceReplacementEventKey(context.stayKey), recipient: context.entry.recipient,
    subject: context.entry.subject,
    snapshot: bounceReplacementSnapshot(context, [], "admin", "confirmed-fingerprint", new Date("2026-11-24T15:00:00Z")),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  state = initialState();
  mocked.transaction.mockImplementation(async (callback: (client: typeof mocked.client) => Promise<unknown>) => callback(mocked.client));
  mocked.client.hotelInquiry.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    structuredClone(state.inquiries.find(row => row.id === where.id) ?? null));
  mocked.client.hotelInquiry.findMany.mockImplementation(async () => state.inquiries
    .slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
    .map(row => ({ id: row.id, destination: row.destination })));
  mocked.client.epochEmailOutbox.findMany.mockImplementation(async ({ where }: { where: { eventKey: { in: string[] } } }) =>
    structuredClone(state.outboxes.filter(row => where.eventKey.in.includes(row.eventKey))));
  mocked.client.epochEmailOutbox.findUnique.mockImplementation(async ({ where }: { where: { eventKey: string } }) =>
    structuredClone(state.outboxes.find(row => row.eventKey === where.eventKey) ?? null));
  mocked.client.epochSupplierDeliveryEvent.findMany.mockImplementation(async ({ where }: { where: { outboxId: string } }) =>
    state.events.filter(row => row.outboxId === where.outboxId).map(({ outboxId: _outbox, ...event }) => structuredClone(event)));
  mocked.client.epochSupplierWebhookInbox.findMany.mockImplementation(async ({ where }: { where: { providerMessageId: string } }) =>
    structuredClone(state.pending.filter(row => row.providerMessageId === where.providerMessageId)));
  mocked.client.epochEmailOutbox.create.mockImplementation(async ({ data }: { data: CreatedOutboxData }) => {
    if (state.outboxes.some(row => row.eventKey === data.eventKey)) throw Object.assign(new Error("unique conflict"), { code: "P2002" });
    const row = { createdAt: new Date(), acceptedAt: null, providerMessageId: null, lastError: null, ...data };
    state.outboxes.push(structuredClone(row));
    return structuredClone(row);
  });
  mocked.client.epochEmailOutbox.update.mockImplementation(async ({ where, data }: {
    where: { eventKey: string }; data: Partial<SavedOutbox>;
  }) => {
    const row = state.outboxes.find(item => item.eventKey === where.eventKey);
    if (!row) throw new Error("not found");
    Object.assign(row, structuredClone(data));
    return structuredClone(row);
  });
  mocked.client.epochSupplierDeliveryEvent.createMany.mockImplementation(async ({ data }: { data: RecordedEvent[] }) => {
    const fresh = data.filter(event => !state.events.some(existing => existing.id === event.id));
    state.events.push(...structuredClone(fresh));
    return { count: fresh.length };
  });
  mocked.client.epochSupplierWebhookInbox.deleteMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => {
    const previous = state.pending.length;
    state.pending = state.pending.filter(event => !where.id.in.includes(event.id));
    return { count: previous - state.pending.length };
  });
});

describe("Bounced replacement persistence boundaries", () => {
  it("re-reads CRM inside the claim transaction and prevents a stale recipient claim", async () => {
    const preview = await loadBounceReplacementContext("revised");
    const input = claimInput(preview);
    state.inquiries[0].supplier.email = "different@hotel.example";
    await expect(claimBounceReplacement(input)).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(mocked.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(mocked.client.epochEmailOutbox.create).not.toHaveBeenCalled();
    expect(state.outboxes).toHaveLength(1);
  });

  it("rejects signed events arriving after preview before creating a replacement", async () => {
    const input = claimInput(await loadBounceReplacementContext("revised"));
    state.pending.push({ id: "msg_later", providerMessageId: "provider-original", type: "email.delivered",
      occurredAt: new Date("2026-11-24T14:30:00Z") });
    await expect(claimBounceReplacement(input)).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(mocked.client.epochEmailOutbox.create).not.toHaveBeenCalled();
  });

  it("rejects a revised approval superseded after preview", async () => {
    const input = claimInput(await loadBounceReplacementContext("revised"));
    state.inquiries.push({ ...structuredClone(state.inquiries[0]), id: "newest",
      createdAt: new Date("2026-11-24T16:00:00Z"), status: "DRAFT", approvedAt: null, approvedBy: null });
    await expect(claimBounceReplacement(input)).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(mocked.client.epochEmailOutbox.create).not.toHaveBeenCalled();
  });

  it("creates one distinct permanent claim while preserving the original inquiry, send and bounce", async () => {
    const input = claimInput(await loadBounceReplacementContext("revised"));
    const before = structuredClone(state);
    await claimBounceReplacement(input);
    expect(state.outboxes).toHaveLength(2);
    expect(state.outboxes[0]).toEqual(before.outboxes[0]);
    expect(state.inquiries).toEqual(before.inquiries);
    expect(state.events).toEqual(before.events);
    expect(state.outboxes[1]).toMatchObject({ eventKey: input.eventKey, status: "SENDING", attempts: 1,
      recipient: "reservations@humahotel.me", targetUrl: "supplier:hotel-inquiry:revised", nextAttemptAt: null });
    expect(mocked.client.epochEmailOutbox.update).not.toHaveBeenCalled();
    expect(mocked.client.epochEmailOutbox.delete).not.toHaveBeenCalled();
    expect(mocked.client.hotelInquiry.update).not.toHaveBeenCalled();
    expect(mocked.client.hotelInquiry.delete).not.toHaveBeenCalled();
    expect(mocked.client.epochSupplierDeliveryEvent.deleteMany).not.toHaveBeenCalled();
    await expect(claimBounceReplacement(input)).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(mocked.client.epochEmailOutbox.create).toHaveBeenCalledTimes(1);
  });

  it("surfaces a database unique-key collision without retrying the transaction or reservation", async () => {
    const input = claimInput(await loadBounceReplacementContext("revised"));
    mocked.client.epochEmailOutbox.create.mockRejectedValueOnce(Object.assign(new Error("unique conflict"), { code: "P2002" }));
    await expect(claimBounceReplacement(input)).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(mocked.transaction).toHaveBeenCalledTimes(1);
    expect(mocked.client.epochEmailOutbox.create).toHaveBeenCalledTimes(1);
    expect(state.outboxes).toHaveLength(1);
  });

  it("reconciles only this replacement's early webhook and retains unrelated pending events", async () => {
    const input = claimInput(await loadBounceReplacementContext("revised"));
    await claimBounceReplacement(input);
    const originalBefore = structuredClone(state.outboxes[0]);
    const early = { id: "msg_replacement_delivery", providerMessageId: "provider-replacement",
      type: "email.delivered", occurredAt: new Date("2026-11-24T15:01:00Z") };
    const unrelated = { ...early, id: "msg_unrelated", providerMessageId: "provider-unrelated" };
    state.pending.push(early, unrelated);
    await finalizeBounceReplacement(input.eventKey, { status: "ACCEPTED", providerMessageId: "provider-replacement" });
    expect(state.outboxes[0]).toEqual(originalBefore);
    expect(state.outboxes[1]).toMatchObject({ status: "ACCEPTED", providerMessageId: "provider-replacement",
      leaseExpiresAt: null, nextAttemptAt: null, lastError: null });
    expect(mocked.client.epochEmailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({ where: { eventKey: input.eventKey } }));
    expect(mocked.client.epochSupplierDeliveryEvent.createMany).toHaveBeenCalledWith({
      data: [{ ...early, outboxId: state.outboxes[1].id }], skipDuplicates: true,
    });
    expect(state.events).toContainEqual({ ...early, outboxId: state.outboxes[1].id });
    expect(state.pending).toEqual([unrelated]);
  });

  it.each(["FAILED", "UNCERTAIN"] as const)("records %s without scheduling a retry or altering the original", async status => {
    const input = claimInput(await loadBounceReplacementContext("revised"));
    await claimBounceReplacement(input);
    const originalBefore = structuredClone(state.outboxes[0]);
    await finalizeBounceReplacement(input.eventKey, { status, providerMessageId: null });
    expect(state.outboxes[0]).toEqual(originalBefore);
    expect(state.outboxes[1]).toMatchObject({ status, providerMessageId: null,
      nextAttemptAt: null, leaseExpiresAt: null, acceptedAt: null });
    expect(mocked.client.epochSupplierDeliveryEvent.createMany).not.toHaveBeenCalled();
    await expect(claimBounceReplacement(input)).rejects.toBeInstanceOf(ReplacementBlocked);
    expect(mocked.client.epochEmailOutbox.create).toHaveBeenCalledTimes(1);
  });
});
