import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  OperationStatus,
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function stringValue(value: unknown) {
  return typeof value === "string"
    ? value
    : "";
}

function jsonArray(
  value: unknown,
): Prisma.InputJsonValue {
  return Array.isArray(value)
    ? (value as Prisma.InputJsonArray)
    : [];
}

function jsonObject(
  value: unknown,
): Prisma.InputJsonValue {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as Prisma.InputJsonObject;
  }

  return {};
}

/*
 * ============================================================
 * SAVE / UPDATE OPERATIONS CONTROL
 * ============================================================
 */

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
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

    const {
      id: bookingId,
    } = await context.params;

    const booking =
      await db.booking.findUnique({
        where: {
          id: bookingId,
        },
        select: {
          id: true,
        },
      });

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Booking not found.",
        },
        {
          status: 404,
        },
      );
    }

    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    // ========================================================
    // EXISTING OPERATIONS
    // ========================================================

    const hotelItems =
      jsonArray(body.hotelItems);

    const transportItems =
      jsonArray(
        body.transportItems,
      );

    const guideItems =
      jsonArray(body.guideItems);

    const restaurantItems =
      jsonArray(
        body.restaurantItems,
      );

    const massItems =
      jsonArray(body.massItems);

    const ticketItems =
      jsonArray(body.ticketItems);

    const paymentItems =
      jsonArray(
        body.paymentItems,
      );

    const documentItems =
      jsonArray(
        body.documentItems,
      );

    const emergencyItems =
      jsonArray(
        body.emergencyItems,
      );

    // ========================================================
    // TOUR MANAGEMENT
    // ========================================================

    const groupInfo =
      jsonObject(body.groupInfo);

    const tourManagerInfo =
      jsonObject(
        body.tourManagerInfo,
      );

    const spiritualDirectorInfo =
      jsonObject(
        body.spiritualDirectorInfo,
      );

    const groupLeaderInfo =
      jsonObject(
        body.groupLeaderInfo,
      );

    const flightItems =
      jsonArray(body.flightItems);

    const trainItems =
      jsonArray(body.trainItems);

    const headsetInfo =
      jsonObject(body.headsetInfo);

    const dailyItinerary =
      jsonArray(
        body.dailyItinerary,
      );

    const paymentResponsibilities =
      jsonArray(
        body.paymentResponsibilities,
      );

    const lunchInstructions =
      stringValue(
        body.lunchInstructions,
      );

    const drivingInstructions =
      stringValue(
        body.drivingInstructions,
      );

    const generalInstructions =
      stringValue(
        body.generalInstructions,
      );

    const folderNotes =
      stringValue(
        body.folderNotes,
      );

    const finalNotes =
      stringValue(
        body.finalNotes,
      );

    // ========================================================
    // STATUS
    // ========================================================

    const hasOperationalData =
      [
        hotelItems,
        transportItems,
        guideItems,
        restaurantItems,
        massItems,
        ticketItems,
        paymentItems,
        documentItems,
        emergencyItems,
        flightItems,
        trainItems,
        dailyItinerary,
        paymentResponsibilities,
      ].some(
        (value) =>
          Array.isArray(value) &&
          value.length > 0,
      ) ||
      Boolean(
        lunchInstructions ||
          drivingInstructions ||
          generalInstructions ||
          folderNotes ||
          finalNotes,
      );

    const status =
      hasOperationalData
        ? OperationStatus.IN_PROGRESS
        : OperationStatus.PENDING;

    const data = {
      hotelItems,
      transportItems,
      guideItems,
      restaurantItems,
      massItems,
      ticketItems,
      paymentItems,
      documentItems,
      emergencyItems,

      groupInfo,
      tourManagerInfo,
      spiritualDirectorInfo,
      groupLeaderInfo,
      flightItems,
      trainItems,
      headsetInfo,
      dailyItinerary,
      paymentResponsibilities,

      lunchInstructions,
      drivingInstructions,
      generalInstructions,
      folderNotes,
      finalNotes,

      status,
    };

    const control =
      await db.bookingOperationControl.upsert(
        {
          where: {
            bookingId,
          },

          create: {
            bookingId,
            ...data,
          },

          update: data,
        },
      );

    return NextResponse.json({
      ok: true,
      control,
    });
  } catch (error) {
    console.error(
      "BOOKING_OPERATION_CONTROL_SAVE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save booking operations.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
 * ============================================================
 * DELETE
 * ============================================================
 */

export async function DELETE(
  _req: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
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

    const {
      id,
    } = await context.params;

    await db.bookingOperationControl.deleteMany({
      where: {
        bookingId: id,
      },
    });

    await db.booking.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "DELETE_BOOKING_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete booking.",
      },
      {
        status: 500,
      },
    );
  }
}