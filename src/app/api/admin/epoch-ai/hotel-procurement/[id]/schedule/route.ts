import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { hotelProcurementScheduleStays } from "@/lib/epoch-ai/hotelProcurementSchedule";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { isRequestWithinLimit } from "@/lib/security/requestBodyLimit";

const scheduleUpdate = z.object({
  revision: z.uuid().nullable(),
  stays: hotelProcurementScheduleStays,
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Same-origin request required." }, { status: 403 });
  }
  if (!(await isRequestWithinLimit(request, 64 * 1024))) {
    return NextResponse.json({ error: "Schedule is too large." }, { status: 413 });
  }

  const parsed = scheduleUpdate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      error: "Enter dates for every hotel and ferry stay. Check that each stay has an arrival before departure and that no dates overlap.",
    }, { status: 400 });
  }

  const adminId = (await getServerSession(authOptions))?.user?.id;
  if (!adminId) return NextResponse.json({ error: "Admin identity required." }, { status: 403 });

  const { id } = await params;
  const { revision, stays } = parsed.data;
  const schedule = { revision: randomUUID(), updatedBy: adminId, updatedAt: new Date().toISOString(), stays };
  try {
    const result = await db.tour.updateMany({
      where: {
        id,
        hotelProcurementSchedule: revision
          ? { path: ["revision"], equals: revision }
          : { equals: Prisma.DbNull },
      },
      data: { hotelProcurementSchedule: schedule },
    });

    if (!result.count) {
      return NextResponse.json({
        error: "The schedule was updated elsewhere or the tour is unavailable. Reload the tour before saving.",
      }, { status: 409 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("HOTEL_PROCUREMENT_SCHEDULE_SAVE_FAILED", error instanceof Error ? error.name : "Unknown");
    return NextResponse.json({ error: "Could not save the stay schedule. Try again." }, { status: 503 });
  }
}
