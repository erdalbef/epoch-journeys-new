import "server-only";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";

type OutboxRecord = {
  id: string;
  eventKey: string;
  status: string;
};

type QueueEmailInput = {
  eventKey: string;
  recipient: string;
  subject: string;
  body: string;
  targetUrl: string;
};

export async function queueNotificationEmail({
  eventKey,
  recipient,
  subject,
  body,
  targetUrl,
}: QueueEmailInput): Promise<{
  queued: boolean;
  alreadyExists: boolean;
  id: string | null;
}> {

  const key = eventKey.trim();
  const to = recipient.trim();
  const title = subject.trim();

  if (!key || key.length > 200) {
    throw new Error("Invalid notification event key");
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
    to.length > 320
  ) {
    throw new Error("Invalid notification recipient");
  }

  if (!title || title.length > 500) {
    throw new Error("Invalid notification subject");
  }

  if (!body.trim() || body.length > 20000) {
    throw new Error("Invalid notification body");
  }

  const url = new URL(targetUrl);

  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid notification URL");
  }

  const id = randomUUID();

  const inserted = await db.$queryRaw<OutboxRecord[]>`
    INSERT INTO "EpochEmailOutbox"
    (
      "id",
      "eventKey",
      "recipient",
      "subject",
      "body",
      "targetUrl",
      "status",
      "createdAt",
      "updatedAt"
    )
    VALUES
    (
      ${id},
      ${key},
      ${to},
      ${title},
      ${body},
      ${url.toString()},
      'PENDING',
      NOW(),
      NOW()
    )
    ON CONFLICT ("eventKey") DO NOTHING
    RETURNING "id", "eventKey", "status"
  `;

  if (inserted.length > 0) {
    return {
      queued: true,
      alreadyExists: false,
      id: inserted[0].id,
    };
  }

  const existing = await db.$queryRaw<OutboxRecord[]>`
    SELECT "id", "eventKey", "status"
    FROM "EpochEmailOutbox"
    WHERE "eventKey" = ${key}
    LIMIT 1
  `;

  return {
    queued: false,
    alreadyExists: existing.length > 0,
    id: existing[0]?.id ?? null,
  };
}
