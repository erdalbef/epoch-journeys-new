import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id?: string;
  }>;
};

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      session.user.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * First try the normal Next.js dynamic route parameter.
     */
    const params = await context.params;

    let agentId = params?.id?.trim();

    /*
     * Defensive fallback:
     *
     * Expected URL:
     * /api/admin/agents/AGENT_ID/delete
     */
    if (!agentId) {
      const url = new URL(request.url);

      const parts = url.pathname
        .split("/")
        .filter(Boolean);

      const agentsIndex = parts.indexOf("agents");

      if (
        agentsIndex >= 0 &&
        parts.length > agentsIndex + 1
      ) {
        agentId = parts[agentsIndex + 1];
      }
    }

    /*
     * Never allow Prisma to receive:
     *
     * id: undefined
     */
    if (
      !agentId ||
      agentId === "undefined" ||
      agentId === "null"
    ) {
      console.error(
        "DELETE_AGENT_MISSING_ID",
        {
          url: request.url,
          params,
        },
      );

      return NextResponse.json(
        {
          error:
            "Partner ID is missing. The delete request could not identify which partner to remove.",
        },
        {
          status: 400,
        },
      );
    }

    console.log(
      "DELETE_AGENT_REQUEST",
      {
        agentId,
        url: request.url,
      },
    );

    const agent = await db.user.findUnique({
      where: {
        id: agentId,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        {
          error: "Partner not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (agent.role !== Role.AGENT) {
      return NextResponse.json(
        {
          error:
            "Only partner accounts can be deleted from this page.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Protect historical bookings.
     */
    const bookingCount = await db.booking.count({
      where: {
        userId: agentId,
      },
    });

    if (bookingCount > 0) {
      return NextResponse.json(
        {
          error:
            `This partner has ${bookingCount} booking${
              bookingCount === 1 ? "" : "s"
            } and cannot be deleted. ` +
            "Delete the test bookings first, or use Unapprove for a real partner.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Delete only when no protected booking history exists.
     */
    await db.user.delete({
      where: {
        id: agentId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${agent.email} was permanently deleted.`,
    });
  } catch (error) {
    console.error(
      "DELETE_AGENT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete partner.",
      },
      {
        status: 500,
      },
    );
  }
}