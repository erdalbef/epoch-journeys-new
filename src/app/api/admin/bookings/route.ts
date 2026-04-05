import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const paymentStatus = searchParams.get("payment")?.trim() ?? "";
    const bookingType = searchParams.get("type")?.trim() ?? "";

    const bookings = await db.booking.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
        ...(bookingType ? { bookingType: bookingType as never } : {}),
        ...(q
          ? {
              OR: [
                {
                  bookingReference: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  bookingDisplayCode: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  tourTitleSnapshot: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  agencyNameSnapshot: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  customerName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  groupName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  agentNameSnapshot: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        bookingNumber: true,
        bookingReference: true,
        bookingDisplayCode: true,
        bookingType: true,
        status: true,
        paymentStatus: true,
        numberOfGuests: true,
        totalPrice: true,
        commissionAmount: true,
        netAmount: true,
        currency: true,
        tourTitleSnapshot: true,
        agencyNameSnapshot: true,
        agentNameSnapshot: true,
        customerName: true,
        groupName: true,
        departureDateSnapshot: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            travelAgency: true,
            agentCode: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("ADMIN_BOOKINGS_GET_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch bookings." },
      { status: 500 }
    );
  }
}