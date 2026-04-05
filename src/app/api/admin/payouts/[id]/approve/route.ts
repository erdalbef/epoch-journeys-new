import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_req: Request, context: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

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

    if (payout.status === "APPROVED") {
      return NextResponse.json(
        { success: false, message: "Payout is already approved." },
        { status: 400 }
      );
    }

    if (payout.status === "PAID") {
      return NextResponse.json(
        { success: false, message: "Paid payouts cannot be approved again." },
        { status: 400 }
      );
    }

    if (payout.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "Cancelled payouts cannot be approved." },
        { status: 400 }
      );
    }

    if (payout.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "Only pending payouts can be approved." },
        { status: 400 }
      );
    }

    const updated = await db.partnerPayout.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        processedById: payout.processedById ?? session.user.id,
      },
      select: {
        id: true,
        agentId: true,
        totalAmount: true,
        currency: true,
        status: true,
        approvedAt: true,
        processedById: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payout approved successfully.",
      payout: updated,
    });
  } catch (error) {
    console.error("APPROVE_PAYOUT_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to approve payout." },
      { status: 500 }
    );
  }
}