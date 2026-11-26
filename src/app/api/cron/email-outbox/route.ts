import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { deliverNotificationEmail } from "@/lib/email/notificationDelivery";
import { markExpiredNotificationLeases } from "@/lib/email/notificationMaintenance";
import { publishHotelDeadlineReminders } from "@/lib/epoch-ai/hotelDeadlineReminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret || secret.length < 32) return false;

  const supplied = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;

  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);

  return left.length === right.length &&
    timingSafeEqual(left, right);
}

function approvedDeliveryOrigin(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL;

  if (!raw) return null;

  try {
    const url = new URL(raw);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!validSecret(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const hotelDeadlineAlerts = await publishHotelDeadlineReminders().catch(error => {
      console.error("Hotel deadline reminders could not be processed", error);
      return null;
    });
    const expired = await markExpiredNotificationLeases();

    const origin = approvedDeliveryOrigin();

    const sendingEnabled =
      process.env.NODE_ENV === "production" &&
      process.env.EPOCH_ENV === "production" &&
      process.env.EMAIL_OUTBOX_DELIVERY_ENABLED === "true" &&
      Boolean(process.env.RESEND_API_KEY?.trim()) &&
      Boolean(origin);

    if (!sendingEnabled || !origin) {
      return NextResponse.json({
        success: true,
        sendingEnabled: false,
        expiredMarkedUncertain: expired,
        hotelDeadlineAlerts,
        processed: 0,
        message: "Email delivery is disabled.",
      }, {
        headers: { "Cache-Control": "no-store" }
      });
    }

    // Only process records associated with the
    // configured HTTPS application origin.
    // Localhost and explicitly labeled test events
    // are not eligible for scheduled delivery.
    const prefix = `${origin}/`;

    const pending = await db.$queryRaw<{
      eventKey: string;
    }[]>`
      SELECT "eventKey"
      FROM "EpochEmailOutbox"
      WHERE "status" = 'PENDING'
        AND LEFT("targetUrl", LENGTH(${prefix})) = ${prefix}
        AND "eventKey" NOT LIKE 'test:%'
      ORDER BY "createdAt" ASC
      LIMIT 20
    `;

    const results = {
      accepted: 0,
      failed: 0,
      uncertain: 0,
      skipped: 0,
    };

    for (const item of pending) {
      const result = await deliverNotificationEmail(
        item.eventKey
      );

      if (result === "ACCEPTED") results.accepted++;
      else if (result === "FAILED") results.failed++;
      else if (result === "UNCERTAIN") results.uncertain++;
      else results.skipped++;
    }

    return NextResponse.json({
      success: true,
      sendingEnabled: true,
      expiredMarkedUncertain: expired,
      hotelDeadlineAlerts,
      processed: pending.length,
      ...results,
    }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Email outbox processor failed", error);

    return NextResponse.json(
      { error: "Email processing failed" },
      { status: 500 }
    );
  }
}
