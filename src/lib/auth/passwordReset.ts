import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const RESET_EXPIRY_MINUTES = 30;
export const genericResetMessage =
  "If an account matches this email, password reset instructions will be sent.";

export function hashResetToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newResetToken() {
  return randomBytes(32).toString("hex");
}

export function validPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 12 &&
    password.length <= 128;
}

export function resetEmailHtml(link: string): string {
  // Link is built from a trusted configured origin and a hex-only token.
  return `<div style="margin:0;background:#f8fafc;padding:28px;font-family:Arial,sans-serif;color:#1e293b">
    <div style="max-width:600px;margin:auto;background:white;border-radius:14px;overflow:hidden">
      <div style="background:#001F3F;padding:24px;color:white">
        <div style="font-size:23px;font-weight:bold">Epoch Journeys</div>
        <div style="margin-top:5px;font-size:13px">Thoughtfully Planned. Faithfully Delivered.</div>
      </div>
      <div style="padding:28px">
        <h2 style="color:#001F3F">Reset your password</h2>
        <p>We received a request to reset your Epoch Journeys account password.</p>
        <p><a href="${link}" style="display:inline-block;background:#001F3F;color:white;padding:12px 20px;text-decoration:none;border-radius:7px">Reset password</a></p>
        <p>This link expires in 30 minutes and can be used only once.</p>
        <p>If you did not request this change, you can ignore this email.</p>
      </div>
    </div>
  </div>`;
}
