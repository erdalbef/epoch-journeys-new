import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { db } from "@/lib/db";

export async function GET() {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;

  try {
    const records = await db.$queryRaw<{
      id: string;
      eventKey: string;
      recipient: string;
      subject: string;
      status: string;
      attempts: number;
      lastError: string | null;
      createdAt: Date;
      lastAttemptAt: Date | null;
      acceptedAt: Date | null;
      leaseExpiresAt: Date | null;
    }[]>`
      SELECT
        "id", "eventKey", "recipient", "subject",
        "status", "attempts", "lastError",
        "createdAt", "lastAttemptAt",
        "acceptedAt", "leaseExpiresAt"
      FROM "EpochEmailOutbox"
      ORDER BY "createdAt" DESC
      LIMIT 100
    `;

    const counts = await db.$queryRaw<{
      status: string;
      count: bigint;
    }[]>`
      SELECT "status", COUNT(*)::bigint AS "count"
      FROM "EpochEmailOutbox"
      GROUP BY "status"
    `;

    return NextResponse.json(
      {
        records,
        counts: Object.fromEntries(
          counts.map(row => [row.status, Number(row.count)])
        )
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Email delivery monitor error", error);

    return NextResponse.json(
      { error: "Email delivery information unavailable" },
      { status: 503 }
    );
  }
}
