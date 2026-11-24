import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatHotelInquiryEmail } from "./hotelInquiryEmailFormat";
import { evaluateHotelSendReadiness } from "./hotelSendReadiness";
import { supplierEventKey, supplierStayEventKey } from "./hotelSupplierSendSafety";
import {
  ReplacementBlocked, bounceReplacementEventKey, originalSnapshotInquiryId, replacementContextVersion,
} from "./hotelBounceReplacementCore";
import type { ReplacementContext, ReplacementOutbox } from "./hotelBounceReplacementCore";
import type { ReplacementDependencies, ReplacementOutcome } from "./hotelBounceReplacementService";

type Reader = Pick<Prisma.TransactionClient,
  "hotelInquiry" | "epochEmailOutbox" | "epochSupplierDeliveryEvent" | "epochSupplierWebhookInbox">;

const inquiryInclude = {
  supplier: { select: { id: true, name: true, type: true, status: true,
    email: true, contacts: { select: { email: true } } } },
} as const;

async function eventsFor(client: Reader, outbox: ReplacementOutbox | null) {
  if (!outbox?.providerMessageId) return [];
  const [recorded, pending] = await Promise.all([
    client.epochSupplierDeliveryEvent.findMany({
      where: { outboxId: outbox.id },
      select: { id: true, providerMessageId: true, type: true, occurredAt: true },
      orderBy: { occurredAt: "asc" }, take: 25,
    }),
    client.epochSupplierWebhookInbox.findMany({
      where: { providerMessageId: outbox.providerMessageId },
      select: { id: true, providerMessageId: true, type: true, occurredAt: true },
      orderBy: { occurredAt: "asc" }, take: 25,
    }),
  ]);
  const unique = new Map<string, typeof recorded[number]>();
  for (const event of [...recorded, ...pending]) {
    const prior = unique.get(event.id);
    if (prior && (prior.type !== event.type || prior.providerMessageId !== event.providerMessageId ||
        prior.occurredAt.getTime() !== event.occurredAt.getTime())) {
      throw new ReplacementBlocked("Conflicting signed delivery events require investigation.");
    }
    unique.set(event.id, event);
  }
  if (unique.size > 24) throw new ReplacementBlocked("The delivery event history requires manual review before replacement.");
  return [...unique.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadBounceReplacementContext(id: string, client: Reader = db): Promise<ReplacementContext> {
  const entry = await client.hotelInquiry.findUnique({ where: { id }, include: inquiryInclude });
  if (!entry) throw new ReplacementBlocked("Inquiry not found.", 404);
  const candidates = await client.hotelInquiry.findMany({
    where: { tourId: entry.tourId, supplierId: entry.supplierId,
      checkIn: entry.checkIn, checkOut: entry.checkOut, rooms: entry.rooms },
    select: { id: true, destination: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 201,
  });
  if (candidates.length > 200) throw new ReplacementBlocked("This stay has too many revisions for automatic replacement review.");
  const versions = candidates.filter(v => v.destination.trim().toLowerCase() === entry.destination.trim().toLowerCase());
  const stayKey = supplierStayEventKey(entry);
  const [attempts, replacement] = await Promise.all([
    client.epochEmailOutbox.findMany({
      where: { eventKey: { in: [stayKey, ...versions.map(v => supplierEventKey(v.id))] } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 3,
    }),
    client.epochEmailOutbox.findUnique({ where: { eventKey: bounceReplacementEventKey(stayKey) } }),
  ]);
  const original = attempts[0];
  if (!original) throw new ReplacementBlocked("No original supplier attempt exists for this stay. Use the ordinary approved-inquiry sending workflow.", 404);
  if (!original.providerMessageId) throw new ReplacementBlocked("The original send has no confirmed provider ID. Investigate that attempt before considering a replacement.");
  const originalInquiryId = originalSnapshotInquiryId(original);
  if (!originalInquiryId || !versions.some(v => v.id === originalInquiryId)) {
    throw new ReplacementBlocked("The original send could not be linked to its approved hotel inquiry.");
  }
  const originalInquiry = await client.hotelInquiry.findUnique({
    where: { id: originalInquiryId }, include: inquiryInclude,
  });
  if (!originalInquiry) throw new ReplacementBlocked("The original approved inquiry is unavailable.");
  const [originalEvents, replacementEvents] = await Promise.all([
    eventsFor(client, original), eventsFor(client, replacement),
  ]);
  const content = evaluateHotelSendReadiness(entry);
  const formatted = formatHotelInquiryEmail(entry.subject, entry.body, false);
  return {
    entry, newestInquiryId: versions[0]?.id || null, stayKey, original, originalInquiry,
    originalAttemptCount: attempts.length, originalEvents, replacement, replacementEvents,
    contentBlocks: content.blocks, previewHtml: formatted.html, previewText: formatted.text,
  };
}

export const claimBounceReplacement: ReplacementDependencies["claim"] = async input => {
  try {
    await db.$transaction(async tx => {
      const current = await loadBounceReplacementContext(input.inquiryId, tx);
      if (current.replacement || replacementContextVersion(current) !== input.expectedContextVersion ||
          input.eventKey !== bounceReplacementEventKey(current.stayKey) ||
          input.recipient !== current.entry.recipient || input.subject !== current.entry.subject) {
        throw new ReplacementBlocked("The inquiry, contact or delivery evidence changed. Reload REVIEW; no replacement was sent.");
      }
      await tx.epochEmailOutbox.create({ data: {
        id: randomUUID(), eventKey: input.eventKey, recipient: input.recipient,
        subject: input.subject, body: input.snapshot, targetUrl: `supplier:hotel-inquiry:${input.inquiryId}`,
        status: "SENDING", attempts: 1, lastAttemptAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + 10 * 60 * 1000), nextAttemptAt: null,
      } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof ReplacementBlocked) throw error;
    // No transaction or email retry. A unique-key conflict means another Admin already claimed it.
    throw new ReplacementBlocked("A replacement already exists or could not be reserved. Review the recorded attempt before taking further action.");
  }
};

export async function finalizeBounceReplacement(eventKey: string, outcome: ReplacementOutcome): Promise<void> {
  await db.$transaction(async tx => {
    const updated = await tx.epochEmailOutbox.update({ where: { eventKey }, data: {
      status: outcome.status, providerMessageId: outcome.providerMessageId,
      acceptedAt: outcome.status === "ACCEPTED" ? new Date() : null,
      lastError: outcome.status === "FAILED" ? "Provider explicitly rejected the replacement email" :
        outcome.status === "UNCERTAIN" ? "Replacement outcome unknown; investigate without automatic retry" : null,
      nextAttemptAt: null, leaseExpiresAt: null, updatedAt: new Date(),
    } });
    if (outcome.providerMessageId) {
      const providerMessageId = outcome.providerMessageId;
      const pending = await tx.epochSupplierWebhookInbox.findMany({ where: { providerMessageId },
        select: { id: true, type: true, occurredAt: true } });
      if (pending.length) {
        await tx.epochSupplierDeliveryEvent.createMany({ data: pending.map(e => ({
          ...e, outboxId: updated.id, providerMessageId,
        })), skipDuplicates: true });
        await tx.epochSupplierWebhookInbox.deleteMany({ where: { id: { in: pending.map(e => e.id) } } });
      }
    }
  });
}
