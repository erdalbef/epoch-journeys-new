import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { deadlineReminderToday, findReminderOffer, HOTEL_REMINDER_EVENT, reminderDeadlines } from "@/lib/epoch-ai/hotelDeadlineReminders";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({error: "Same-origin request required."}, {status: 403});
  const actorId = (await getServerSession(authOptions))?.user?.id;
  if (!actorId) return NextResponse.json({error: "Admin identity required."}, {status: 403});
  const input: unknown = await request.json().catch(() => null);
  if (!input || typeof input !== "object" || !("enabled" in input) || typeof input.enabled !== "boolean") {
    return NextResponse.json({error: "Choose whether to enable reminders."}, {status: 400});
  }
  const offer = await findReminderOffer((await params).id);
  if (!offer) return NextResponse.json({error: "This reviewed offer is no longer current."}, {status: 404});
  if (input.enabled && !reminderDeadlines(offer).some(deadline => deadline.date >= deadlineReminderToday())) {
    return NextResponse.json({error: "This offer has no upcoming calculated deadlines."}, {status: 409});
  }
  const status = input.enabled ? "ENABLED" : "DISABLED";
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "SupplierCommercialEvidence" WHERE "id" = ${offer.id} FOR UPDATE`;
    const previous = await tx.supplierCommercialEvidenceEvent.findFirst({
      where: {evidenceId: offer.id, eventType: HOTEL_REMINDER_EVENT},
      orderBy: [{createdAt: "desc"}, {id: "desc"}], select: {newStatus: true},
    });
    if (previous?.newStatus !== status) await tx.supplierCommercialEvidenceEvent.create({
      data: {evidenceId: offer.id, actorId, eventType: HOTEL_REMINDER_EVENT, previousStatus: previous?.newStatus, newStatus: status},
    });
  });
  return NextResponse.json({enabled: input.enabled});
}
