import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  BookingInstallmentStatus,
  BookingStatus,
  PaymentRecordStatus,
  PaymentStatus,
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type AgingBucket =
  | "CURRENT"
  | "1_30"
  | "31_60"
  | "61_90"
  | "90_PLUS"
  | "ALL";

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

function validBookingStatus(value: string | null) {
  if (!value) return undefined;

  return Object.values(BookingStatus).includes(
    value as BookingStatus,
  )
    ? (value as BookingStatus)
    : undefined;
}

function validPaymentStatus(value: string | null) {
  if (!value) return undefined;

  return Object.values(PaymentStatus).includes(
    value as PaymentStatus,
  )
    ? (value as PaymentStatus)
    : undefined;
}

function validAging(value: string | null): AgingBucket {
  const allowed: AgingBucket[] = [
    "ALL",
    "CURRENT",
    "1_30",
    "31_60",
    "61_90",
    "90_PLUS",
  ];

  return allowed.includes(value as AgingBucket)
    ? (value as AgingBucket)
    : "ALL";
}

function getDaysOverdue(dueDate: Date | null, now: Date) {
  if (!dueDate) return 0;

  const due = new Date(dueDate);
  due.setUTCHours(23, 59, 59, 999);

  if (due >= now) return 0;

  return Math.floor(
    (now.getTime() - due.getTime()) / 86_400_000,
  );
}

function getAgingBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return "CURRENT";
  if (daysOverdue <= 30) return "1_30";
  if (daysOverdue <= 60) return "31_60";
  if (daysOverdue <= 90) return "61_90";
  return "90_PLUS";
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

    const url = new URL(request.url);

    const from = parseDateStart(url.searchParams.get("from"));
    const to = parseDateEnd(url.searchParams.get("to"));

    const status = validBookingStatus(
      url.searchParams.get("status"),
    );

    const paymentStatus = validPaymentStatus(
      url.searchParams.get("paymentStatus"),
    );

    const aging = validAging(url.searchParams.get("aging"));
    const q = url.searchParams.get("q")?.trim() || "";

    const where: Prisma.BookingWhereInput = {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),

      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),

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
                customerName: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                customerEmail: {
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
                agentNameSnapshot: {
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
            ],
          }
        : {}),
    };

    const bookings = await db.booking.findMany({
      where,
      orderBy: [
        {
          paymentDueDate: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        bookingType: true,
        status: true,
        paymentStatus: true,
        currency: true,
        totalPrice: true,
        amountPaid: true,
        amountDue: true,
        paymentDueDate: true,
        depositDeadline: true,
        createdAt: true,

        customerName: true,
        customerEmail: true,

        agentNameSnapshot: true,
        agentEmailSnapshot: true,
        agencyNameSnapshot: true,

        groupName: true,
        tourTitleSnapshot: true,
        departureDateSnapshot: true,

        partnerCompany: {
          select: {
            name: true,
          },
        },

        user: {
          select: {
            fullName: true,
            email: true,
            travelAgency: true,
          },
        },

        payments: {
          where: {
            status: PaymentRecordStatus.RECEIVED,
          },
          select: {
            amount: true,
          },
        },

        paymentSchedules: {
          orderBy: {
            dueDate: "asc",
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            amount: true,
            amountPaid: true,
            status: true,

            allocations: {
              select: {
                amount: true,
              },
            },
          },
        },
      },
    });

    const now = new Date();

    const rows = bookings
      .map((booking) => {
        const receivedTotal = booking.payments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        );

        const amountPaid =
          booking.amountPaid > 0
            ? booking.amountPaid
            : receivedTotal;

        const outstanding = Math.max(
          booking.totalPrice - amountPaid,
          0,
        );

        const openSchedules = booking.paymentSchedules.filter(
          (schedule) =>
            schedule.status !== BookingInstallmentStatus.PAID &&
            schedule.status !== BookingInstallmentStatus.CANCELLED &&
            Math.max(schedule.amount - schedule.amountPaid, 0) > 0,
        );

        const nextSchedule = openSchedules[0] ?? null;

        const dueDate =
          nextSchedule?.dueDate ??
          booking.paymentDueDate ??
          booking.depositDeadline ??
          null;

        const daysOverdue =
          outstanding > 0 ? getDaysOverdue(dueDate, now) : 0;

        const agingBucket = getAgingBucket(daysOverdue);

        const overdueAmount = openSchedules
          .filter((schedule) => schedule.dueDate < now)
          .reduce(
            (sum, schedule) =>
              sum +
              Math.max(schedule.amount - schedule.amountPaid, 0),
            0,
          );

        const allocatedAmount = booking.paymentSchedules.reduce(
          (sum, schedule) =>
            sum +
            schedule.allocations.reduce(
              (allocationSum, allocation) =>
                allocationSum + allocation.amount,
              0,
            ),
          0,
        );

        const payer =
          booking.agencyNameSnapshot ||
          booking.partnerCompany?.name ||
          booking.user.travelAgency ||
          booking.customerName ||
          booking.groupName ||
          booking.agentNameSnapshot ||
          booking.user.fullName ||
          booking.user.email;

        return {
          ...booking,
          amountPaid,
          outstanding,
          dueDate,
          daysOverdue,
          agingBucket,
          overdueAmount,
          allocatedAmount,
          payer,
        };
      })
      .filter((row) => {
        if (aging === "ALL") return true;
        return row.agingBucket === aging;
      });

    const headers = [
      "Booking ID",
      "Booking Code",
      "Booking Reference",
      "Booking Type",
      "Booking Status",
      "Payment Status",
      "Payer / Client",
      "Customer Email",
      "Agency",
      "Agent",
      "Tour",
      "Departure Date",
      "Currency",
      "Booking Value",
      "Collected",
      "Outstanding",
      "Next Due Date",
      "Days Overdue",
      "Aging Bucket",
      "Overdue Amount",
      "Allocated Amount",
      "Created Date",
    ];

    const csvRows = rows.map((row) => [
      row.id,
      row.bookingDisplayCode || "",
      row.bookingReference,
      row.bookingType,
      row.status,
      row.paymentStatus,
      row.payer,
      row.customerEmail || "",
      row.agencyNameSnapshot ||
        row.partnerCompany?.name ||
        row.user.travelAgency ||
        "",
      row.agentNameSnapshot || row.user.fullName || "",
      row.tourTitleSnapshot,
      dateValue(row.departureDateSnapshot),
      row.currency,
      row.totalPrice.toFixed(2),
      row.amountPaid.toFixed(2),
      row.outstanding.toFixed(2),
      dateValue(row.dueDate),
      row.daysOverdue,
      row.agingBucket,
      row.overdueAmount.toFixed(2),
      row.allocatedAmount.toFixed(2),
      dateValue(row.createdAt),
    ]);

    const csv = [
      headers.map(csvCell).join(","),
      ...csvRows.map((row) =>
        row.map(csvCell).join(","),
      ),
    ].join("\r\n");

    const fileName = `accounts-receivable-${new Date()
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
    console.error("EXPORT_ACCOUNTS_RECEIVABLE_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to export Accounts Receivable.",
      },
      {
        status: 500,
      },
    );
  }
}
