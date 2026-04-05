import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

type Body = {
  tourId?: string;
  commissionRate?: number | null;
  payoutPerPax?: number | null;
};

function normalizeOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    return NaN;
  }

  return value;
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { agentId } = await context.params;
    const body = (await req.json()) as Body;

    const tourId = typeof body.tourId === "string" ? body.tourId : "";

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required." },
        { status: 400 }
      );
    }

    if (!tourId) {
      return NextResponse.json(
        { error: "Tour ID is required." },
        { status: 400 }
      );
    }

    const agent = await db.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!agent || agent.role !== "AGENT") {
      return NextResponse.json(
        { error: "Agent not found." },
        { status: 404 }
      );
    }

    const tour = await db.tour.findUnique({
      where: { id: tourId },
      select: {
        id: true,
      },
    });

    if (!tour) {
      return NextResponse.json(
        { error: "Tour not found." },
        { status: 404 }
      );
    }

    const commissionRate = normalizeOptionalNumber(body.commissionRate);
    const payoutPerPax = normalizeOptionalNumber(body.payoutPerPax);

    if (Number.isNaN(commissionRate)) {
      return NextResponse.json(
        { error: "Commission rate must be a valid number." },
        { status: 400 }
      );
    }

    if (Number.isNaN(payoutPerPax)) {
      return NextResponse.json(
        { error: "Payout per pax must be a valid number." },
        { status: 400 }
      );
    }

    if (commissionRate !== null && (commissionRate < 0 || commissionRate > 1)) {
      return NextResponse.json(
        { error: "Commission rate must be between 0 and 1." },
        { status: 400 }
      );
    }

    if (payoutPerPax !== null && payoutPerPax < 0) {
      return NextResponse.json(
        { error: "Payout per pax cannot be negative." },
        { status: 400 }
      );
    }

    if (commissionRate === null && payoutPerPax === null) {
      return NextResponse.json(
        { error: "At least one override value is required." },
        { status: 400 }
      );
    }

    const override = await db.agentTourCommission.upsert({
      where: {
        agentId_tourId: {
          agentId,
          tourId,
        },
      },
      update: {
        commissionRate,
        payoutPerPax,
      },
      create: {
        agentId,
        tourId,
        commissionRate,
        payoutPerPax,
      },
    });

    return NextResponse.json({
      success: true,
      override,
    });
  } catch (error) {
    console.error("AGENT_TOUR_COMMISSION_POST_ERROR", error);

    return NextResponse.json(
      { error: "Failed to save tour commission override." },
      { status: 500 }
    );
  }
}