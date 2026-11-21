import { createHmac, timingSafeEqual } from "node:crypto";

export type SupplierDeliveryEventType = "email.delivered" | "email.bounced" | "email.complained" | "email.failed" | "email.suppressed" | "email.delivery_delayed";
const tracked = new Set<SupplierDeliveryEventType>(["email.delivered", "email.bounced", "email.complained", "email.failed", "email.suppressed", "email.delivery_delayed"]);
export function verifyResendSupplierSignature(raw: string, headers: Headers, secret: string | undefined, nowMs = Date.now()): boolean {
  if (!secret?.startsWith("whsec_") || !raw || Buffer.byteLength(raw, "utf8") > 65536) return false;
  const id = headers.get("svix-id"), timestamp = headers.get("svix-timestamp"), signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature || !/^\d{10}$/.test(timestamp)) return false;
  const ts = Number(timestamp);
  if (!Number.isSafeInteger(ts) || Math.abs(Math.floor(nowMs / 1000) - ts) > 300) return false;
  const encodedKey = secret.slice(6);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodedKey)) return false;
  const key = Buffer.from(encodedKey, "base64");
  if (key.length < 16) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${raw}`, "utf8").digest();
  return signature.split(/\s+/).some((part) => {
    if (!part.startsWith("v1,")) return false;
    const candidate = Buffer.from(part.slice(3), "base64");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

export type ParsedSupplierEvent = { eventId: string; providerMessageId: string; type: SupplierDeliveryEventType; occurredAt: Date };
export function parseResendSupplierEvent(raw: string, eventId: string): ParsedSupplierEvent | null {
  if (!eventId || eventId.length > 160) return null;
  let p: unknown;
  try { p = JSON.parse(raw); } catch { return null; }
  if (!p || typeof p !== "object") return null;
  const e = p as { type?: unknown; created_at?: unknown; data?: { email_id?: unknown } };
  if (typeof e.type !== "string" || !tracked.has(e.type as SupplierDeliveryEventType)) return null;
  if (typeof e.data?.email_id !== "string" || !e.data.email_id || e.data.email_id.length > 160) return null;
  if (typeof e.created_at !== "string") return null;
  const time = new Date(e.created_at);
  if (Number.isNaN(time.getTime())) return null;
  return { eventId, providerMessageId: e.data.email_id, type: e.type as SupplierDeliveryEventType, occurredAt: time };
}

export function nextSupplierDeliveryStatus(current: string, event: SupplierDeliveryEventType): string | null {
  // Do not let an out-of-order 'delivered' event erase a later negative outcome.
  if (current === "BOUNCED" || current === "COMPLAINED" || current === "SUPPRESSED" || current === "DELIVERY_FAILED") return null;
  if (event === "email.complained") return "COMPLAINED";
  if (event === "email.bounced") return "BOUNCED";
  if (event === "email.suppressed") return "SUPPRESSED";
  if (event === "email.failed") return "DELIVERY_FAILED";
  if (event === "email.delivered") return "DELIVERED";
  if (event === "email.delivery_delayed" && (current === "ACCEPTED" || current === "SENDING" || current === "UNCERTAIN")) return "DELAYED";
  return null;
}
