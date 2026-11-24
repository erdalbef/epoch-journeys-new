import "server-only";

import { createHash } from "node:crypto";
import { db } from "@/lib/db";

const LIMIT = 8;
const WINDOW_MS = 10 * 60 * 1000;

export async function checkEpochAiRateLimit(
  userId: string
): Promise<{ allowed: boolean; retryAfter: number }> {
  if (!userId) {
    return { allowed: false, retryAfter: 60 };
  }

  // Password-reset throttle keys are unprefixed HMAC digests.
  // This namespace cannot collide with them.
  const key = "epoch-ai:" +
    createHash("sha256").update(userId).digest("hex");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + WINDOW_MS);

  // Atomic conditional increment across all Vercel instances.
  const updated = await db.passwordResetThrottle.updateMany({
    where: {
      key,
      expiresAt: { gt: now },
      count: { lt: LIMIT },
    },
    data: {
      count: { increment: 1 },
    },
  });

  if (updated.count === 1) {
    return { allowed: true, retryAfter: 0 };
  }

  const existing = await db.passwordResetThrottle.findUnique({
    where: { key },
    select: { count: true, expiresAt: true },
  });

  if (existing && existing.expiresAt > now) {
    return {
      allowed: false,
      retryAfter: Math.max(
        1,
        Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000)
      ),
    };
  }

  if (existing) {
    const renewed = await db.passwordResetThrottle.updateMany({
      where: {
        key,
        expiresAt: { lte: now },
      },
      data: {
        count: 1,
        expiresAt,
      },
    });

    return {
      allowed: renewed.count === 1,
      retryAfter: renewed.count === 1 ? 0 : 60,
    };
  }

  try {
    await db.passwordResetThrottle.create({
      data: { key, count: 1, expiresAt },
    });

    return { allowed: true, retryAfter: 0 };
  } catch {
    // Another request may have created the counter first.
    // Retry only an atomic conditional increment.
    // Never grant access without a successful database write.
    const retry = await db.passwordResetThrottle.updateMany({
      where: {
        key,
        expiresAt: { gt: new Date() },
        count: { lt: LIMIT },
      },
      data: {
        count: { increment: 1 },
      },
    });

    if (retry.count === 1) {
      return { allowed: true, retryAfter: 0 };
    }

    // Any unsuccessful retry fails closed.
    return { allowed: false, retryAfter: 60 };
  }
}