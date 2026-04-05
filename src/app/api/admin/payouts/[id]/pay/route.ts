import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const paymentReference =
      typeof body.paymentReference === "string"
        ? body.paymentReference.trim()
        : "";

    const paymentMethod =
      typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : "";

    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    const payout = await db.partnerPayout.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        processedById: true,
      },
    });

    if (!payout) {
      return NextResponse.json(
        { success: false, message: "Payout not found." },
        { status: 404 }
      );
    }

    if (payout.status === "PAID") {
      return NextResponse.json(
        { success: false, message: "Payout is already marked as paid." },
        { status: 400 }
      );
    }

    if (payout.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "Cancelled payouts cannot be marked as paid." },
        { status: 400 }
      );
    }

    if (payout.status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Payout must be approved before payment.",
        },
        { status: 400 }
      );
    }

    const updated = await db.partnerPayout.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentReference: paymentReference || null,
        paymentMethod: paymentMethod || null,
        notes: notes || undefined,
        processedById: payout.processedById ?? session.user.id,
      },
      select: {
        id: true,
        agentId: true,
        totalAmount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        paymentReference: true,
        notes: true,
        paidAt: true,
        processedById: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payout marked as paid successfully.",
      payout: updated,
    });
  } catch (error) {
    console.error("MARK_PAYOUT_PAID_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to mark payout as paid." },
      { status: 500 }
    );
  }
}