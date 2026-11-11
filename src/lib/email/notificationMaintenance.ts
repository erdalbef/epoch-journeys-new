import "server-only";

import { db } from "@/lib/db";

/**
 * Mark expired sending attempts as uncertain.
 *
 * An expired lease does not prove that delivery failed.
 * These notifications must not be automatically resent.
 */
export async function markExpiredNotificationLeases(): Promise<number> {
  const expired = await db.$queryRaw<{ id: string }[]>`
    UPDATE "EpochEmailOutbox"
    SET
      "status" = 'UNCERTAIN',
      "lastError" = 'Sending lease expired; delivery outcome requires review',
      "leaseExpiresAt" = NULL,
      "updatedAt" = NOW()
    WHERE "status" = 'SENDING'
      AND "leaseExpiresAt" IS NOT NULL
      AND "leaseExpiresAt" < NOW()
    RETURNING "id"
  `;

  return expired.length;
}
