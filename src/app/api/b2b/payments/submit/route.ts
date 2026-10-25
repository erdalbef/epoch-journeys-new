import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentApiActor } from "@/lib/security/getCurrentApiActor";
import {
  deletePrivatePaymentProof,
  InvalidProofError,
  savePrivatePaymentProof,
} from "@/lib/storage/privatePaymentProof";

export const runtime = "nodejs";

function parseAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/** Payment details and receipt are validated and submitted in one request. */
export async function POST(request: Request) {
  const access = await getCurrentApiActor();
  if (access.response) return access.response;
  if (access.actor.role !== Role.AGENT) {
    return NextResponse.json({ error: "Agency access required." }, { status: 403 });
  }

  let savedPath: string | null = null;
  try {
    const formData = await request.formData();
    const bookingId = formData.get("bookingId");
    const amount = parseAmount(formData.get("amount"));
    const currency = formData.get("currency");
    const method = formData.get("method");
    const note = formData.get("note");
    const file = formData.get("file");

    if (typeof bookingId !== "string" || !bookingId.trim()) {
      return NextResponse.json({ error: "Booking is required." }, { status: 400 });
    }
    if (!amount) {
      return NextResponse.json({ error: "Valid payment amount is required." }, { status: 400 });
    }
    if (typeof currency !== "string" || !currency.trim()) {
      return NextResponse.json({ error: "Currency is required." }, { status: 400 });
    }
    if (typeof method !== "string" || !method.trim()) {
      return NextResponse.json({ error: "Payment method is required." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Payment proof file is required." }, { status: 400 });
    }

    // Never use a booking ID without checking ownership against the logged-in user.
    const booking = await db.booking.findFirst({
      where: { id: bookingId, userId: access.actor.id },
      select: { id: true, amountDue: true, currency: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (currency.trim().toUpperCase() !== booking.currency.toUpperCase()) {
      return NextResponse.json({ error: "Currency does not match this booking." }, { status: 400 });
    }
    if (amount > booking.amountDue + 0.000001) {
      return NextResponse.json({ error: "Amount cannot be greater than amount due." }, { status: 400 });
    }

    savedPath = await savePrivatePaymentProof(file);

    const submission = await db.paymentSubmission.create({
      data: {
        bookingId: booking.id,
        userId: access.actor.id,
        amount,
        currency: booking.currency,
        method: method.trim().slice(0, 80),
        note: typeof note === "string" ? note.trim() || null : null,
        proofUrl: savedPath,
      },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error) {
    if (savedPath) {
      await deletePrivatePaymentProof(savedPath).catch(() => undefined);
    }
    if (error instanceof InvalidProofError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("B2B_PAYMENT_SUBMIT_ERROR", error);
    return NextResponse.json({ error: "Failed to submit payment proof." }, { status: 500 });
  }
}
