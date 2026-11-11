import "server-only";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { supportEmailHtml } from "@/lib/support/notifications";

type OutboxEmail = {
  id: string;
  eventKey: string;
  recipient: string;
  subject: string;
  body: string;
  targetUrl: string;
};

export type DeliveryResult =
  | "NOT_CONFIGURED"
  | "NOT_PENDING"
  | "ACCEPTED"
  | "FAILED"
  | "UNCERTAIN";

export async function deliverNotificationEmail(
  eventKey: string
): Promise<DeliveryResult> {
  // Delivery is disabled unless explicitly activated
  // in the production environment.
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.EPOCH_ENV !== "production" ||
    process.env.EMAIL_OUTBOX_DELIVERY_ENABLED !== "true" ||
    !process.env.RESEND_API_KEY?.trim()
  ) {
    return "NOT_CONFIGURED";
  }

  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL;

  if (!configuredUrl) {
    return "NOT_CONFIGURED";
  }

  let approvedOrigin: string;

  try {
    const url = new URL(configuredUrl);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    ) {
      return "NOT_CONFIGURED";
    }

    approvedOrigin = url.origin;
  } catch {
    return "NOT_CONFIGURED";
  }

  const approvedPrefix = `${approvedOrigin}/`;

  // Atomic claim: only one concurrent process can
  // change this notification from PENDING to SENDING.
  const claimed = await db.$queryRaw<OutboxEmail[]>`
    UPDATE "EpochEmailOutbox"
    SET
      "status" = 'SENDING',
      "attempts" = "attempts" + 1,
      "lastAttemptAt" = NOW(),
      "leaseExpiresAt" = NOW() + INTERVAL '10 minutes',
      "updatedAt" = NOW()
    WHERE "eventKey" = ${eventKey}
      AND "status" = 'PENDING'
      AND LEFT("targetUrl", LENGTH(${approvedPrefix})) = ${approvedPrefix}
      AND "eventKey" NOT LIKE 'test:%'
    RETURNING
      "id",
      "eventKey",
      "recipient",
      "subject",
      "body",
      "targetUrl"
  `;

  if (claimed.length === 0) {
    return "NOT_PENDING";
  }

  const email = claimed[0];

  // Independently validate the actual notification URL
  // before contacting the email provider.
  let validTarget = false;

  try {
    const target = new URL(email.targetUrl);

    validTarget =
      target.protocol === "https:" &&
      target.origin === approvedOrigin &&
      !target.username &&
      !target.password &&
      !target.hash;
  } catch {
    validTarget = false;
  }

  if (!validTarget) {
    await db.$executeRaw`
      UPDATE "EpochEmailOutbox"
      SET
        "status" = 'FAILED',
        "lastError" = 'Notification URL failed security validation',
        "leaseExpiresAt" = NULL,
        "updatedAt" = NOW()
      WHERE "id" = ${email.id}
        AND "status" = 'SENDING'
    `;

    return "FAILED";
  }

  try {
    const response = await sendEmail({
      to: email.recipient,
      subject: email.subject,
      html: supportEmailHtml(
        email.body,
        email.targetUrl
      ),
    });

    if (
      response &&
      "data" in response &&
      response.data?.id &&
      !response.error
    ) {
      await db.$executeRaw`
        UPDATE "EpochEmailOutbox"
        SET
          "status" = 'ACCEPTED',
          "providerMessageId" = ${response.data.id},
          "acceptedAt" = NOW(),
          "leaseExpiresAt" = NULL,
          "lastError" = NULL,
          "updatedAt" = NOW()
        WHERE "id" = ${email.id}
          AND "status" = 'SENDING'
      `;

      return "ACCEPTED";
    }

    // A provider response containing an explicit
    // error is treated as a rejected attempt.
    if (
      response &&
      "error" in response &&
      response.error
    ) {
      await db.$executeRaw`
        UPDATE "EpochEmailOutbox"
        SET
          "status" = 'FAILED',
          "lastError" = 'Email provider rejected request',
          "leaseExpiresAt" = NULL,
          "updatedAt" = NOW()
        WHERE "id" = ${email.id}
          AND "status" = 'SENDING'
      `;

      return "FAILED";
    }

    // Null or an unexpected response is uncertain:
    // the provider might have accepted the email.
    await db.$executeRaw`
      UPDATE "EpochEmailOutbox"
      SET
        "status" = 'UNCERTAIN',
        "lastError" = 'Provider acceptance not confirmed',
        "leaseExpiresAt" = NULL,
        "updatedAt" = NOW()
      WHERE "id" = ${email.id}
        AND "status" = 'SENDING'
    `;

    return "UNCERTAIN";
  } catch (error) {
    console.error(
      "Notification delivery outcome uncertain",
      {
        eventKey: email.eventKey,
        error,
      }
    );

    // Network errors and unknown exceptions may
    // occur after the provider accepts a message.
    // Never retry them automatically.
    try {
      await db.$executeRaw`
        UPDATE "EpochEmailOutbox"
        SET
          "status" = 'UNCERTAIN',
          "lastError" = 'Delivery outcome unknown',
          "leaseExpiresAt" = NULL,
          "updatedAt" = NOW()
        WHERE "id" = ${email.id}
          AND "status" = 'SENDING'
      `;
    } catch (updateError) {
      console.error(
        "Could not record uncertain email delivery",
        updateError
      );
    }

    return "UNCERTAIN";
  }
}
