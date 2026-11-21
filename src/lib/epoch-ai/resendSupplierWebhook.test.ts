import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyResendSupplierSignature, parseResendSupplierEvent, nextSupplierDeliveryStatus } from "./resendSupplierWebhook";
const secret = `whsec_${Buffer.from("test-key-for-epoch-resend-webhooks-1234").toString("base64")}`;
const now = 1774000000000;
function signed(body: string, epoch = Math.floor(now / 1000)) {
  const id = "evt_test_1";
  const sig = createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${id}.${epoch}.${body}`).digest("base64");
  return new Headers({ "svix-id": id, "svix-timestamp": String(epoch), "svix-signature": `v1,${sig}` });
}
const raw = JSON.stringify({ type: "email.delivered", created_at: "2026-03-20T00:00:00Z", data: { email_id: "email_123" } });
describe("Stage 3C signed Resend hotel delivery events", () => {
  it("accepts exact signed raw bytes", () => expect(verifyResendSupplierSignature(raw, signed(raw), secret, now)).toBe(true));
  it("rejects changed message bytes", () => expect(verifyResendSupplierSignature(raw + " ", signed(raw), secret, now)).toBe(false));
  it("rejects missing or incorrect secrets", () => { expect(verifyResendSupplierSignature(raw, signed(raw), undefined, now)).toBe(false); expect(verifyResendSupplierSignature(raw, signed(raw), "whsec_bad", now)).toBe(false); });
  it("rejects stale and future timestamps", () => { expect(verifyResendSupplierSignature(raw, signed(raw, Math.floor(now / 1000)-301), secret, now)).toBe(false); expect(verifyResendSupplierSignature(raw, signed(raw, Math.floor(now / 1000)+301), secret, now)).toBe(false); });
  it("parses recognized email delivery event", () => expect(parseResendSupplierEvent(raw, "evt_test_1")?.providerMessageId).toBe("email_123"));
  it("ignores unrelated Resend event", () => expect(parseResendSupplierEvent(JSON.stringify({type:"contact.created",data:{email_id:"email_123"},created_at:"2026-03-20T00:00:00Z"}),"id")).toBeNull());
  it("never downgrades delivery on delay", () => expect(nextSupplierDeliveryStatus("DELIVERED", "email.delivery_delayed")).toBeNull());
  it("retains negative outcomes against later delivered events", () => expect(nextSupplierDeliveryStatus("BOUNCED", "email.delivered")).toBeNull());
  it("allows bounce after delivered", () => expect(nextSupplierDeliveryStatus("DELIVERED", "email.bounced")).toBe("BOUNCED"));
});
