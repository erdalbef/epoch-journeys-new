import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{ id: string }>;
};

function escapeCsv(value: unknown) {
  const stringValue = value == null ? "" : String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function buildCsv(rows: Array<Array<unknown>>) {
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export async function GET(_req: Request, context: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const payout = await db.partnerPayout.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            fullName: true,
            email: true,
            travelAgency: true,
            partnerType: true,
            phone: true,
            membership: true,
          },
        },
        processedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
        bookings: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
            bookingType: true,
            status: true,
            paymentStatus: true,
            numberOfGuests: true,
            totalPrice: true,
            grossAmount: true,
            commissionAmount: true,
            netAmount: true,
            currency: true,
            createdAt: true,
            departureDateSnapshot: true,
            tourTitleSnapshot: true,
            customerName: true,
            customerEmail: true,
            groupName: true,
            groupLeaderName: true,
          },
        },
      },
    });

    if (!payout) {
      return NextResponse.json(
        { success: false, message: "Payout not found." },
        { status: 404 }
      );
    }

    const totalGuests = payout.bookings.reduce(
      (sum, booking) => sum + (booking.numberOfGuests ?? 0),
      0
    );

    const totalGross = payout.bookings.reduce(
      (sum, booking) => sum + (booking.grossAmount ?? 0),
      0
    );

    const totalNet = payout.bookings.reduce(
      (sum, booking) => sum + (booking.netAmount ?? 0),
      0
    );

    const rows: Array<Array<unknown>> = [
      ["PAYOUT SUMMARY"],
      ["Payout ID", payout.id],
      ["Partner Name", payout.agent.fullName || ""],
      ["Partner Email", payout.agent.email || ""],
      ["Travel Agency", payout.agent.travelAgency || ""],
      ["Partner Type", payout.agent.partnerType || ""],
      ["Phone", payout.agent.phone || ""],
      ["Membership", payout.agent.membership || ""],
      ["Status", payout.status],
      ["Currency", payout.currency],
      ["Total Amount", payout.totalAmount],
      ["Bookings Count", payout.bookings.length],
      ["Guests Count", totalGuests],
      ["Gross Sales", totalGross],
      ["Net Revenue", totalNet],
      ["Payment Method", payout.paymentMethod || ""],
      ["Payment Reference", payout.paymentReference || ""],
      ["Notes", payout.notes || ""],
      ["Created At", payout.createdAt.toISOString()],
      ["Approved At", payout.approvedAt ? payout.approvedAt.toISOString() : ""],
      ["Paid At", payout.paidAt ? payout.paidAt.toISOString() : ""],
      ["Locked At", payout.lockedAt ? payout.lockedAt.toISOString() : ""],
      [
        "Processed By",
        payout.processedBy
          ? payout.processedBy.fullName || payout.processedBy.email
          : "",
      ],
      [],
      ["BOOKING BREAKDOWN"],
      [
        "Booking ID",
        "Booking Ref",
        "Display Code",
        "Booking Type",
        "Booking Status",
        "Payment Status",
        "Tour",
        "Departure Date",
        "Customer / Group",
        "Customer Email",
        "Guests",
        "Gross Amount",
        "Payout Amount",
        "Net Amount",
        "Currency",
        "Created At",
      ],
      ...payout.bookings.map((booking) => [
        booking.id,
        booking.bookingReference,
        booking.bookingDisplayCode || "",
        booking.bookingType,
        booking.status,
        booking.paymentStatus,
        booking.tourTitleSnapshot,
        booking.departureDateSnapshot
          ? booking.departureDateSnapshot.toISOString()
          : "",
        booking.customerName ||
          booking.groupName ||
          booking.groupLeaderName ||
          "",
        booking.customerEmail || "",
        booking.numberOfGuests,
        booking.grossAmount,
        booking.commissionAmount,
        booking.netAmount,
        booking.currency,
        booking.createdAt.toISOString(),
      ]),
    ];

    const csv = buildCsv(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payout-${payout.id}.csv"`,
      },
    });
  } catch (error) {
    console.error("EXPORT_PAYOUT_DETAIL_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to export payout detail." },
      { status: 500 }
    );
  }
}