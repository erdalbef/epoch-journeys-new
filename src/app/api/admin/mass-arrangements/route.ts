import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { MassArrangementStatus, MassPaymentStatus, Role } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = (await request.json()) as Record<string, unknown>;
  const churchName = text(body.churchName);
  if (!churchName) return NextResponse.json({ error: "Church name is required." }, { status: 400 });

  const rawStatus = text(body.status);
  const status = rawStatus && Object.values(MassArrangementStatus).includes(rawStatus as MassArrangementStatus) ? rawStatus as MassArrangementStatus : MassArrangementStatus.REQUESTED;
  const rawPayment = text(body.paymentStatus);
  const paymentStatus = rawPayment && Object.values(MassPaymentStatus).includes(rawPayment as MassPaymentStatus) ? rawPayment as MassPaymentStatus : MassPaymentStatus.NOT_REQUIRED;

  const massDate = text(body.massDate) ? new Date(String(body.massDate)) : null;
  const donation = body.donationAmount === null || body.donationAmount === undefined ? null : Number(body.donationAmount);

  const arrangement = await db.massArrangement.create({ data: {
    supplierId: text(body.supplierId), tourId: text(body.tourId), bookingId: text(body.bookingId),
    churchName, shrineName: text(body.shrineName), country: text(body.country), city: text(body.city), address: text(body.address),
    massDate, massTime: text(body.massTime), language: text(body.language), celebrantName: text(body.celebrantName),
    sacristyContactName: text(body.sacristyContactName), sacristyContactEmail: text(body.sacristyContactEmail), sacristyContactPhone: text(body.sacristyContactPhone),
    groupSize: Number.isFinite(Number(body.groupSize)) && body.groupSize !== null ? Number(body.groupSize) : null,
    status, confirmationReference: text(body.confirmationReference),
    donationAmount: donation !== null && Number.isFinite(donation) ? donation : null, currency: text(body.currency) || "EUR", paymentStatus,
    busAccessNotes: text(body.busAccessNotes), accessibilityNotes: text(body.accessibilityNotes), liturgicalNotes: text(body.liturgicalNotes),
    vestmentNotes: text(body.vestmentNotes), specialRequirements: text(body.specialRequirements), internalNotes: text(body.internalNotes),
  }});

  return NextResponse.json({ success: true, arrangement: { ...arrangement, donationAmount: arrangement.donationAmount ? Number(arrangement.donationAmount) : null } }, { status: 201 });
}
