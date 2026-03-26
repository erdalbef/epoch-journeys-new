import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function parseAmount(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const bookingId = formData.get("bookingId");
    const amount = parseAmount(formData.get("amount"));
    const currency = formData.get("currency");
    const method = formData.get("method");
    const note = formData.get("note");
    const proofUrl = formData.get("proofUrl");

    if (typeof bookingId !== "string" || !bookingId.trim()) {
      return NextResponse.json(
        { error: "Booking is required." },
        { status: 400 }
      );
    }

    if (!amount) {
      return NextResponse.json(
        { error: "Valid payment amount is required." },
        { status: 400 }
      );
    }

    if (typeof currency !== "string" || !currency.trim()) {
      return NextResponse.json(
        { error: "Currency is required." },
        { status: 400 }
      );
    }

    if (typeof method !== "string" || !method.trim()) {
      return NextResponse.json(
        { error: "Payment method is required." },
        { status: 400 }
      );
    }

    if (typeof proofUrl !== "string" || !proofUrl.trim()) {
      return NextResponse.json(
        { error: "Payment proof is required." },
        { status: 400 }
      );
    }

    const booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        userId: session.user.id,
      },
      select: {
        id: true,
        amountDue: true,
        currency: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    if (amount > booking.amountDue) {
      return NextResponse.json(
        { error: "Amount cannot be greater than amount due." },
        { status: 400 }
      );
    }

    const submission = await db.paymentSubmission.create({
      data: {
        bookingId: booking.id,
        userId: session.user.id,
        amount,
        currency,
        method,
        note: typeof note === "string" ? note.trim() || null : null,
        proofUrl: proofUrl.trim(),
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error("B2B payment submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit payment proof." },
      { status: 500 }
    );
  }
}