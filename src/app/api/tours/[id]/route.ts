import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user ||
      session.user.role !== Role.AGENT
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

    const { id } =
      await context.params;

    const user =
      await db.user.findUnique({
        where: {
          id: session.user.id,
        },

        select: {
          approved: true,
          status: true,
        },
      });

    if (
      !user ||
      !user.approved ||
      user.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          error:
            "Agent account is not active.",
        },
        {
          status: 403,
        },
      );
    }

    const tour =
      await db.tour.findFirst({
        where: {
          id,
          isPublished: true,
        },

        select: {
          id: true,
          title: true,
          subtitle: true,
          destinations: true,
          duration: true,

          startingPrice: true,
          currency: true,
          startingPriceBasis: true,
          referenceGroupSize: true,

          hotelStandard: true,
          massIncluded: true,
        },
      });

    if (!tour) {
      return NextResponse.json(
        {
          error:
            "Journey not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      tour,
    });
  } catch (error) {
    console.error(
      "GET_B2B_TOUR_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to load journey.",
      },
      {
        status: 500,
      },
    );
  }
}