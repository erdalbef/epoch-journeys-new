import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseResendSupplierEvent, nextSupplierDeliveryStatus, verifyResendSupplierSignature } from "@/lib/epoch-ai/resendSupplierWebhook";

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
      if (!sent) return "unmatched";
      const inserted = await tx.epochSupplierDeliveryEvent.createMany({
        data: [{ id: event.eventId, outboxId: sent.id, providerMessageId: event.providerMessageId, type: event.type, occurredAt: event.occurredAt }],
        skipDuplicates: true,
      });
      if (!inserted.count) return "duplicate";
      const next = nextSupplierDeliveryStatus(sent.status, event.type);
      if (next) {
        // Compare-and-set protects against competing or out-of-order webhook updates.
        const allowed = next === "DELIVERED" ? ["ACCEPTED", "DELAYED", "UNCERTAIN", "SENDING"] :
          next === "DELAYED" ? ["ACCEPTED", "UNCERTAIN", "SENDING"] :
          ["ACCEPTED", "DELAYED", "UNCERTAIN", "SENDING", "DELIVERED"];
        await tx.epochEmailOutbox.updateMany({
          where: { id: sent.id, status: { in: allowed } },
          data: { status: next, updatedAt: new Date(), lastError: next === "DELIVERED" ? null : `${event.type}: review before any resend` },
        });
      }
      return "recorded";
    });
    return json({ ok: true, result });
  } catch (error) {
    console.error("HOTEL_SUPPLIER_WEBHOOK_RECORD_FAILED", error);
    // Returning 503 asks Resend to retry; the event ID makes the retry idempotent.
    return json({ error: "Webhook not recorded" }, 503);
  }
}
