import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  PaymentMethod,
  Prisma,
  RefundReason,
  RefundStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function parseDateStart(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validEnum<T extends Record<string, string>>(
  source: T,
  value: string | null,
): T[keyof T] | undefined {
  if (!value) return undefined;

  return Object.values(source).includes(value)
    ? (value as T[keyof T])
    : undefined;
}

function csvCell(value: unknown) {
  const text =
    value === null || value === undefined ? "" : String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function dateValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);

    const from = parseDateStart(url.searchParams.get("from"));
    const to = parseDateEnd(url.searchParams.get("to"));

    const status = validEnum(
      RefundStatus,
      url.searchParams.get("status"),
    );

    const reason = validEnum(
      RefundReason,
      url.searchParams.get("reason"),
    );

    const method = validEnum(
      PaymentMethod,
      url.searchParams.get("method"),
    );

    const bankAccountId =
      url.searchParams.get("bankAccountId")?.trim() || undefined;

    const q = url.searchParams.get("q")?.trim() || "";

    const where: Prisma.RefundWhereInput = {
      ...(from || to
        ? {
            refundDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),

      ...(status ? { status } : {}),
      ...(reason ? { reason } : {}),
      ...(method ? { method } : {}),
      ...(bankAccountId ? { bankAccountId } : {}),

      ...(q
        ? {
            OR: [
              {
                reference: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                reasonDetails: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                notes: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                booking: {
                  bookingReference: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
              {
                booking: {
                  bookingDisplayCode: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
              {
                booking: {
                  customerName: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
              {
                booking: {
                  agencyNameSnapshot: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
              {
                booking: {
                  tourTitleSnapshot: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const refunds = await db.refund.findMany({
      where,
      orderBy: [{ refundDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        method: true,
        reason: true,
        reasonDetails: true,
        refundDate: true,
        reference: true,
        notes: true,
        createdAt: true,

        booking: {
          select: {
            bookingReference: true,
            bookingDisplayCode: true,
            customerName: true,
            leadFirstName: true,
            leadLastName: true,
            agencyNameSnapshot: true,
            agentNameSnapshot: true,
            tourTitleSnapshot: true,
            departureDateSnapshot: true,
            totalPrice: true,
            amountPaid: true,
            currency: true,
          },
        },

        payment: {
          select: {
            amount: true,
            currency: true,
            method: true,
            status: true,
            reference: true,
            paidAt: true,
          },
        },

        bankAccount: {
          select: {
            name: true,
          },
        },

        createdBy: {
          select: {
            fullName: true,
            email: true,
          },
        },

        bankTransactions: {
          select: {
            id: true,
          },
        },

        documents: {
          select: {
            id: true,
          },
        },
      },
    });

    const headers = [
      "Refund ID",
      "Refund Date",
      "Booking",
      "Customer",
      "Agency",
      "Agent",
      "Tour",
      "Departure Date",
      "Booking Total",
      "Booking Amount Paid",
      "Booking Currency",
      "Refund Amount",
      "Refund Currency",
      "Status",
      "Reason",
      "Reason Details",
      "Method",
      "Reference",
      "Bank Account",
      "Original Payment Amount",
      "Original Payment Currency",
      "Original Payment Method",
      "Original Payment Status",
      "Original Payment Reference",
      "Original Payment Date",
      "Ledger Posted",
      "Document Count",
      "Notes",
      "Created By",
      "Created Date",
    ];

    const rows = refunds.map((refund) => {
      const leadName = [
        refund.booking.leadFirstName,
        refund.booking.leadLastName,
      ]
        .filter(Boolean)
        .join(" ");

      return [
        refund.id,
        dateValue(refund.refundDate),
        refund.booking.bookingDisplayCode ||
          refund.booking.bookingReference,
        refund.booking.customerName || leadName,
        refund.booking.agencyNameSnapshot || "",
        refund.booking.agentNameSnapshot || "",
        refund.booking.tourTitleSnapshot,
        dateValue(refund.booking.departureDateSnapshot),
        refund.booking.totalPrice,
        refund.booking.amountPaid,
        refund.booking.currency,
        Number(refund.amount).toFixed(2),
        refund.currency,
        refund.status,
        refund.reason,
        refund.reasonDetails || "",
        refund.method || "",
        refund.reference || "",
        refund.bankAccount?.name || "",
        refund.payment?.amount ?? "",
        refund.payment?.currency || "",
        refund.payment?.method || "",
        refund.payment?.status || "",
        refund.payment?.reference || "",
        dateValue(refund.payment?.paidAt),
        refund.bankTransactions.length > 0 ? "YES" : "NO",
        refund.documents.length,
        refund.notes || "",
        refund.createdBy?.fullName ||
          refund.createdBy?.email ||
          "",
        dateValue(refund.createdAt),
      ];
    });

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\r\n");

    const fileName = `refund-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("EXPORT_REFUND_REPORT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to export Refund Report.",
      },
      { status: 500 },
    );
  }
}
