import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role, Prisma } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = value == null ? "" : String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from")?.trim() ?? "";
    const to = searchParams.get("to")?.trim() ?? "";
    const agent = searchParams.get("agent")?.trim() ?? "";
    const tour = searchParams.get("tour")?.trim() ?? "";

    const where: Prisma.BookingWhereInput = {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(agent
        ? {
            OR: [
              {
                agentNameSnapshot: {
                  contains: agent,
                  mode: "insensitive",
                },
              },
              {
                agencyNameSnapshot: {
                  contains: agent,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(tour
        ? {
            tourTitleSnapshot: {
              contains: tour,
              mode: "insensitive",
            },
          }
        : {}),
    };

    const bookings = await db.booking.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        bookingReference: true,
        bookingDisplayCode: true,
        agentNameSnapshot: true,
        agencyNameSnapshot: true,
        tourTitleSnapshot: true,
        departureDateSnapshot: true,
        totalPrice: true,
        amountPaid: true,
        amountDue: true,
        paymentStatus: true,
        commissionAmount: true,
        netAmount: true,
        currency: true,
        createdAt: true,
      },
    });

    const header = [
      "Display Reference",
      "Booking Reference",
      "Agent",
      "Agency",
      "Tour",
      "Created At",
      "Departure Date",
      "Total Price",
      "Amount Paid",
      "Amount Due",
      "Payment Status",
      "Commission",
      "Net Amount",
      "Currency",
    ];

    const rows = bookings.map((booking) => [
      booking.bookingDisplayCode || "",
      booking.bookingReference,
      booking.agentNameSnapshot || "",
      booking.agencyNameSnapshot || "",
      booking.tourTitleSnapshot,
      formatDate(booking.createdAt),
      formatDate(booking.departureDateSnapshot),
      booking.totalPrice,
      booking.amountPaid,
      booking.amountDue,
      booking.paymentStatus,
      booking.commissionAmount,
      booking.netAmount,
      booking.currency,
    ]);

    const csv = [
      header.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-finance-export.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ADMIN_FINANCE_EXPORT_ERROR", error);

    return NextResponse.json(
      { error: "Failed to export finance CSV." },
      { status: 500 }
    );
  }
}