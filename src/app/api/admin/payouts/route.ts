import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const MINIMUM_PAYOUT_AMOUNT = 100;

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const agentId = typeof body?.agentId === "string" ? body.agentId : "";

    if (!agentId) {
      return NextResponse.json(
        { success: false, message: "agentId is required." },
        { status: 400 }
      );
    }

    const agent = await db.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        email: true,
        fullName: true,
        travelAgency: true,
        role: true,
        partnerType: true,
        approved: true,
        status: true,
      },
    });

    if (!agent || agent.role !== "AGENT") {
      return NextResponse.json(
        { success: false, message: "Partner not found." },
        { status: 404 }
      );
    }

    if (!agent.approved) {
      return NextResponse.json(
        { success: false, message: "Partner is not approved." },
        { status: 400 }
      );
    }

    if (agent.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Partner is not active." },
        { status: 400 }
      );
    }

    const payableBookings = await db.booking.findMany({
      where: {
        userId: agentId,
        payoutId: null,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        commissionAmount: {
          gt: 0,
        },
      },
      select: {
        id: true,
        bookingReference: true,
        commissionAmount: true,
        currency: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (payableBookings.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No eligible paid bookings available for payout.",
        },
        { status: 400 }
      );
    }

    const currency = payableBookings[0]?.currency || "EUR";

    const mixedCurrency = payableBookings.some(
      (booking) => booking.currency !== currency
    );

    if (mixedCurrency) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot create one payout from mixed-currency bookings.",
        },
        { status: 400 }
      );
    }

    const totalAmount = roundCurrency(
      payableBookings.reduce((sum, booking) => {
        return sum + (booking.commissionAmount ?? 0);
      }, 0)
    );

    if (totalAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Total payout amount must be greater than 0.",
        },
        { status: 400 }
      );
    }

    if (totalAmount < MINIMUM_PAYOUT_AMOUNT) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum payout threshold is ${MINIMUM_PAYOUT_AMOUNT} ${currency}. Current eligible amount is ${totalAmount} ${currency}.`,
        },
        { status: 400 }
      );
    }

    const bookingIds = payableBookings.map((booking) => booking.id);

    const result = await db.$transaction(async (tx) => {
      const createdPayout = await tx.partnerPayout.create({
        data: {
          agentId,
          processedById: session.user.id,
          totalAmount,
          currency,
          status: "PENDING",
        },
        select: {
          id: true,
          agentId: true,
          totalAmount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      });

      const updateResult = await tx.booking.updateMany({
        where: {
          id: {
            in: bookingIds,
          },
          payoutId: null,
          status: "CONFIRMED",
          paymentStatus: "PAID",
        },
        data: {
          payoutId: createdPayout.id,
        },
      });

      if (updateResult.count !== bookingIds.length) {
        throw new Error(
          "Some bookings could not be locked for payout. Please try again."
        );
      }

      return {
        payout: createdPayout,
        lockedBookings: updateResult.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Payout created successfully.",
      payoutId: result.payout.id,
      payout: result.payout,
      lockedBookings: result.lockedBookings,
    });
  } catch (error) {
    console.error("ADMIN_CREATE_PAYOUT_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create payout.",
      },
      { status: 500 }
    );
  }
}