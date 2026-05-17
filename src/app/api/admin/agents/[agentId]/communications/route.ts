import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const communications =
      await db.agentCommunication.findMany({
        where: {
          agentId: id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      ok: true,
      communications,
    });
  } catch (error) {
    console.error(
      "GET_AGENT_COMMUNICATIONS_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load communications.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const body = await req.json();

    const communication =
      await db.agentCommunication.create({
        data: {
          agentId: id,

          type: body.type ?? "NOTE",

          subject: body.subject ?? null,

          message: body.message,

          relatedQuoteId:
            body.relatedQuoteId ?? null,

          relatedBookingId:
            body.relatedBookingId ?? null,

          createdById: session.user.id,
        },
      });

    return NextResponse.json({
      ok: true,
      communication,
    });
  } catch (error) {
    console.error(
      "CREATE_AGENT_COMMUNICATION_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create communication.",
      },
      { status: 500 }
    );
  }
}