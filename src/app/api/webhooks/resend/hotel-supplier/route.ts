import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseResendSupplierEvent, verifyResendSupplierSignature } from "@/lib/epoch-ai/resendSupplierWebhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (value: Record<string, unknown>, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return json({ error: "Webhook not configured" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 65536) return json({ error: "Payload too large" }, 413);
  const raw = await request.text();
  if (!verifyResendSupplierSignature(raw, request.headers, secret)) return json({ error: "Invalid webhook signature" }, 401);
  const event = parseResendSupplierEvent(raw, request.headers.get("svix-id") || "");
  // Other Resend events are irrelevant to hotel supplier delivery and are acknowledged without writes.
  if (!event) return json({ ok: true, ignored: true });
  try {
    const result = await db.$transaction(async (tx) => {
      const sent = await tx.epochEmailOutbox.findFirst({ where: { providerMessageId: event.providerMessageId, eventKey: { startsWith: "supplier:hotel-inquiry:" } } });
      // The provider may emit a signed delivery event before the send API has
      // persisted its providerMessageId. Preserve that event only while there is
      // a recently started supplier send; unrelated Resend traffic is ignored.
      if (!sent) {
        const pendingSend = await tx.epochEmailOutbox.findFirst({
          where: {
            eventKey: { startsWith: "supplier:hotel-inquiry:" },
            status: "SENDING",
            lastAttemptAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
          },
          select: { id: true },
        });
        if (!pendingSend) return "unmatched";
      }
      const inserted = await tx.epochSupplierDeliveryEvent.createMany({
        data: [{ id: event.eventId, outboxId: sent?.id ?? "PENDING_PROVIDER_MATCH", providerMessageId: event.providerMessageId, type: event.type, occurredAt: event.occurredAt }],
        skipDuplicates: true,
      });
      if (!inserted.count) return "duplicate";
      // The sender's GET review can resolve early events by providerMessageId.
      // Keep the shared EpochEmailOutbox status unchanged.
      return sent ? "recorded" : "pending_provider_match";
    });
    return json({ ok: true, result });
  } catch (error) {
    console.error("HOTEL_SUPPLIER_WEBHOOK_RECORD_FAILED", error);
    // Returning 503 asks Resend to retry; the event ID makes the retry idempotent.
    return json({ error: "Webhook not recorded" }, 503);
  }
}
