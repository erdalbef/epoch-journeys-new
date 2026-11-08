import "server-only";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";

// Persistent PostgreSQL-backed throttle; shared across all Vercel instances.
// Requires PASSWORD_RESET_THROTTLE_SECRET, an independent high-entropy secret.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function keyFor(kind: "ip" | "email", value: string): string {
  const secret = process.env.PASSWORD_RESET_THROTTLE_SECRET;
  if (!secret || secret.length < 32) throw new Error("Missing secure PASSWORD_RESET_THROTTLE_SECRET");
  return createHmac("sha256", secret).update(kind + ":" + value).digest("hex");
}

async function attempt(key: string): Promise<boolean> {
  const now = new Date();
  const newWindow = new Date(now.getTime() + WINDOW_MS);
  // Atomic update for an existing window. If no existing window, try to create.
  const updated = await db.passwordResetThrottle.updateMany({
    where: { key, expiresAt: { gt: now }, count: { lt: MAX_ATTEMPTS } },
    data: { count: { increment: 1 } },
  });
  if (updated.count === 1) return true;
  const record = await db.passwordResetThrottle.findUnique({ where: { key }, select: { expiresAt: true } });
  if (record && record.expiresAt > now) return false;
  if (record) {
    const renewed = await db.passwordResetThrottle.updateMany({
      where: { key, expiresAt: { lte: now } },
      data: { expiresAt: newWindow, count: 1 },
    });
    return renewed.count === 1;
  }
  try {
    await db.passwordResetThrottle.create({ data: { key, count: 1, expiresAt: newWindow } });
    return true;
  } catch {
    // Concurrent create: fail closed; later request can retry.
    return false;
  }
}

export async function allowPasswordResetRequest(email: string, clientIp: string): Promise<boolean> {
  // Count both dimensions even for unknown emails to avoid enumeration.
  const [ipAllowed, emailAllowed] = await Promise.all([
    attempt(keyFor("ip", clientIp)), attempt(keyFor("email", email)),
  ]);
  return ipAllowed && emailAllowed;
}
