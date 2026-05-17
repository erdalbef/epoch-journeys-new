import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { agentId } = await context.params;

    if (!agentId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Agent ID is required.",
        },
        { status: 400 }
      );
    }

    const tourId =
      req.nextUrl.searchParams.get("tourId");

    const agent = await db.user.findUnique({
      where: {
        id: agentId,
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        travelAgency: true,
        commissionRate: true,
        role: true,
        approved: true,
        status: true,
      },
    });

    if (!agent || agent.role !== "AGENT") {
      return NextResponse.json(
        {
          ok: false,
          error: "Agent not found.",
        },
        { status: 404 }
      );
    }

    if (!agent.approved) {
      return NextResponse.json(
        {
          ok: false,
          error: "Agent is not approved.",
        },
        { status: 400 }
      );
    }

    if (agent.status !== "ACTIVE") {
      return NextResponse.json(
        {
          ok: false,
          error: "Agent is not active.",
        },
        { status: 400 }
      );
    }

    let commissionRate =
      agent.commissionRate ?? 0;

    let payoutPerPax: number | null = null;

    let source = "default";

    if (tourId) {
      const override =
        await db.agentTourCommission.findUnique({
          where: {
            agentId_tourId: {
              agentId,
              tourId,
            },
          },

          select: {
            commissionRate: true,
            payoutPerPax: true,
          },
        });

      if (override) {
        if (
          override.commissionRate !== null
        ) {
          commissionRate =
            override.commissionRate;
        }

        payoutPerPax =
          override.payoutPerPax ?? null;

        source = "tour_override";
      }
    }

    return NextResponse.json({
      ok: true,

      agent: {
        id: agent.id,
        fullName: agent.fullName,
        email: agent.email,
        travelAgency:
          agent.travelAgency,
      },

      commissionRate,
      payoutPerPax,
      source,
    });
  } catch (error) {
    console.error(
      "GET_AGENT_COMMISSION_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to load agent commission.",
      },
      { status: 500 }
    );
  }
}