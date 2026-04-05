import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function escapeCsv(value: unknown): string {
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

function buildCsvRow(values: unknown[]): string {
  return values.map(escapeCsv).join(",");
}

function formatDate(value: Date | null): string {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatMoney(value: number | null | undefined): string {
  return typeof value === "number" ? value.toFixed(2) : "";
}

type PayoutExportRow = {
  id: string;
  totalAmount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  createdAt: Date;
  approvedAt: Date | null;
  paidAt: Date | null;
  bookings: { id: string }[];
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);

  const payoutStatus = url.searchParams.get("payoutStatus") || "";
  const method = url.searchParams.get("method") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  const payouts: PayoutExportRow[] = await db.partnerPayout.findMany({
    where: {
      agentId: session.user.id,
      ...(payoutStatus ? { status: payoutStatus as never } : {}),
      ...(method ? { paymentMethod: method } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      totalAmount: true,
      currency: true,
      status: true,
      paymentMethod: true,
      paymentReference: true,
      createdAt: true,
      approvedAt: true,
      paidAt: true,
      bookings: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const header = buildCsvRow([
    "Payout ID",
    "Amount",
    "Currency",
    "Status",
    "Bookings Count",
    "Method",
    "Reference",
    "Created Date",
    "Approved Date",
    "Paid Date",
  ]);

  const rows = payouts.map((payout) =>
    buildCsvRow([
      payout.id,
      formatMoney(payout.totalAmount),
      payout.currency ?? "EUR",
      payout.status,
      payout.bookings.length,
      payout.paymentMethod ?? "",
      payout.paymentReference ?? "",
      formatDate(payout.createdAt),
      formatDate(payout.approvedAt),
      formatDate(payout.paidAt),
    ])
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="b2b-payout-history.csv"',
    },
  });
}