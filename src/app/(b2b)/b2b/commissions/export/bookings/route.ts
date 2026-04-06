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

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);

  const search = url.searchParams.get("search")?.trim() || "";
  const bookingStatus = url.searchParams.get("bookingStatus") || "";
  const paymentStatus = url.searchParams.get("paymentStatus") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  const bookings = await db.booking.findMany({
    where: {
      userId: session.user.id,
      ...(search
        ? {
            OR: [
              {
                bookingReference: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                tour: {
                  title: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
      ...(bookingStatus ? { status: bookingStatus as never } : {}),
      ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
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
      bookingReference: true,
      status: true,
      paymentStatus: true,
      grossAmount: true,
      commissionAmount: true,
      netAmount: true,
      currency: true,
      createdAt: true,
      tour: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const header = buildCsvRow([
    "Reference",
    "Tour",
    "Booking Status",
    "Payment Status",
    "Gross",
    "Commission / Payout",
    "Net",
    "Lock State",
    "Currency",
    "Created At",
  ]);

  const rows = bookings.map((booking) =>
    buildCsvRow([
      booking.bookingReference,
      booking.tour?.title ?? "",
      booking.status,
      booking.paymentStatus,
      formatMoney(booking.grossAmount),
      formatMoney(booking.commissionAmount),
      formatMoney(booking.netAmount),
      "N/A",
      booking.currency ?? "EUR",
      formatDate(booking.createdAt),
    ])
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="b2b-commission-bookings.csv"',
    },
  });
}