import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
    paymentId: string;
  }>;
};

type RequestBody = {
  action?: "lock" | "unlock";
  reason?: string;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId, paymentId } = await context.params;
    const body = (await request.json()) as RequestBody;

    if (!body.action || !["lock", "unlock"].includes(body.action)) {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
    }

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        bookingId: true,
        allocationLockedAt: true,
      },
    });

    if (!payment || payment.bookingId !== bookingId) {
      return NextResponse.json(
        { error: "Payment not found for this booking." },
        { status: 404 }
      );
    }

    if (body.action === "lock") {
      await db.payment.update({
        where: { id: paymentId },
        data: {
          allocationLockedAt: new Date(),
          allocationLockReason: body.reason?.trim() || "Locked by admin",
        },
      });

      return NextResponse.json({ success: true, locked: true });
    }

    await db.payment.update({
      where: { id: paymentId },
      data: {
        allocationLockedAt: null,
        allocationLockReason: null,
      },
    });

    return NextResponse.json({ success: true, locked: false });
  } catch (error) {
    console.error("Allocation lock route error:", error);

    return NextResponse.json(
      { error: "Failed to update allocation lock." },
      { status: 500 }
    );
  }
}