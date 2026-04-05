import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payouts = await db.partnerPayout.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        agent: {
          select: {
            fullName: true,
            email: true,
            travelAgency: true,
            partnerType: true,
          },
        },
        processedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
        bookings: {
          select: {
            id: true,
          },
        },
      },
    });

    const headers = [
      "Payout ID",
      "Partner Name",
      "Partner Email",
      "Travel Agency",
      "Partner Type",
      "Bookings Count",
      "Amount",
      "Currency",
      "Status",
      "Payment Method",
      "Payment Reference",
      "Created At",
      "Approved At",
      "Paid At",
      "Processed By",
    ];

    const rows = payouts.map((payout) => [
      payout.id,
      payout.agent.fullName || "",
      payout.agent.email || "",
      payout.agent.travelAgency || "",
      payout.agent.partnerType || "",
      payout.bookings.length,
      payout.totalAmount,
      payout.currency,
      payout.status,
      payout.paymentMethod || "",
      payout.paymentReference || "",
      payout.createdAt.toISOString(),
      payout.approvedAt ? payout.approvedAt.toISOString() : "",
      payout.paidAt ? payout.paidAt.toISOString() : "",
      payout.processedBy
        ? payout.processedBy.fullName || payout.processedBy.email
        : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payouts-export.csv"`,
      },
    });
  } catch (error) {
    console.error("EXPORT_PAYOUTS_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to export payouts." },
      { status: 500 }
    );
  }
}