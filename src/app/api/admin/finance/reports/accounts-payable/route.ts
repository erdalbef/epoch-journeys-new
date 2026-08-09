import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  Prisma,
  Role,
  SupplierPayableApprovalStatus,
  SupplierPayablePaymentStatus,
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

function validApprovalStatus(value: string | null) {
  if (!value) return undefined;

  return Object.values(SupplierPayableApprovalStatus).includes(
    value as SupplierPayableApprovalStatus,
  )
    ? (value as SupplierPayableApprovalStatus)
    : undefined;
}

function validPaymentStatus(value: string | null) {
  if (!value) return undefined;

  return Object.values(SupplierPayablePaymentStatus).includes(
    value as SupplierPayablePaymentStatus,
  )
    ? (value as SupplierPayablePaymentStatus)
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

    const approvalStatus = validApprovalStatus(
      url.searchParams.get("approvalStatus"),
    );

    const paymentStatus = validPaymentStatus(
      url.searchParams.get("paymentStatus"),
    );

    const aging = validAging(url.searchParams.get("aging"));
    const q = url.searchParams.get("q")?.trim() || "";

    const where: Prisma.SupplierPayableWhereInput = {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),

      ...(approvalStatus ? { approvalStatus } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),

      ...(q
        ? {
            OR: [
              {
                title: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                supplierNameSnapshot: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                supplierInvoiceNumber: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                supplierReference: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                tour: {
                  title: {
                    contains: q,
                    mode: "insensitive",
                  },
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
            ],
          }
        : {}),
    };

    const payables = await db.supplierPayable.findMany({
      where,
      orderBy: [
        {
          dueDate: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        title: true,
        supplierInvoiceNumber: true,
        supplierReference: true,
        invoiceDate: true,
        dueDate: true,
        currency: true,
        approvedAmount: true,
        creditAmount: true,
        amountPaid: true,
        approvalStatus: true,
        paymentStatus: true,
        supplierNameSnapshot: true,
        serviceNameSnapshot: true,
        createdAt: true,

        supplier: {
          select: {
            name: true,
          },
        },

        tour: {
          select: {
            title: true,
          },
        },

        departureDate: {
          select: {
            date: true,
          },
        },

        booking: {
          select: {
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },

        approvedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },

        payments: {
          orderBy: {
            paymentDate: "asc",
          },
          select: {
            amount: true,
            currency: true,
            paymentDate: true,
            method: true,
            reference: true,
            bankAccount: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const now = new Date();

    const rows = payables
      .map((payable) => {
        const paymentTotal = payable.payments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0,
        );

        const amountPaid =
          Number(payable.amountPaid) > 0
            ? Number(payable.amountPaid)
            : paymentTotal;

        const approvedAmount = Number(payable.approvedAmount);
        const creditAmount = Number(payable.creditAmount);

        const liability = Math.max(
          approvedAmount - creditAmount,
          0,
        );

        const outstanding = Math.max(
          liability - amountPaid,
          0,
        );

        const daysOverdue =
          outstanding > 0
            ? getDaysOverdue(payable.dueDate, now)
            : 0;

        const agingBucket = getAgingBucket(daysOverdue);

        const overdueAmount =
          payable.dueDate &&
          payable.dueDate < now &&
          outstanding > 0
            ? outstanding
            : 0;

        return {
          ...payable,
          approvedAmountNumber: approvedAmount,
          creditAmountNumber: creditAmount,
          liability,
          amountPaidNumber: amountPaid,
          outstanding,
          daysOverdue,
          agingBucket,
          overdueAmount,
        };
      })
      .filter((row) => {
        if (aging === "ALL") return true;
        return row.agingBucket === aging;
      });

    const headers = [
      "Payable ID",
      "Supplier",
      "Title",
      "Service",
      "Supplier Invoice",
      "Supplier Reference",
      "Invoice Date",
      "Due Date",
      "Approval Status",
      "Payment Status",
      "Currency",
      "Approved Amount",
      "Credit Amount",
      "Effective Liability",
      "Amount Paid",
      "Outstanding",
      "Days Overdue",
      "Aging Bucket",
      "Overdue Amount",
      "Tour",
      "Departure Date",
      "Booking",
      "Last Payment Date",
      "Last Payment Method",
      "Last Payment Reference",
      "Last Payment Bank Account",
      "Approved By",
      "Created Date",
    ];

    const csvRows = rows.map((row) => {
      const lastPayment =
        row.payments.length > 0
          ? row.payments[row.payments.length - 1]
          : null;

      return [
        row.id,
        row.supplierNameSnapshot || row.supplier.name,
        row.title,
        row.serviceNameSnapshot || "",
        row.supplierInvoiceNumber || "",
        row.supplierReference || "",
        dateValue(row.invoiceDate),
        dateValue(row.dueDate),
        row.approvalStatus,
        row.paymentStatus,
        row.currency,
        row.approvedAmountNumber.toFixed(2),
        row.creditAmountNumber.toFixed(2),
        row.liability.toFixed(2),
        row.amountPaidNumber.toFixed(2),
        row.outstanding.toFixed(2),
        row.daysOverdue,
        row.agingBucket,
        row.overdueAmount.toFixed(2),
        row.tour?.title || "",
        dateValue(row.departureDate?.date),
        row.booking
          ? row.booking.bookingDisplayCode ||
            row.booking.bookingReference
          : "",
        dateValue(lastPayment?.paymentDate),
        lastPayment?.method || "",
        lastPayment?.reference || "",
        lastPayment?.bankAccount?.name || "",
        row.approvedBy?.fullName ||
          row.approvedBy?.email ||
          "",
        dateValue(row.createdAt),
      ];
    });

    const csv = [
      headers.map(csvCell).join(","),
      ...csvRows.map((row) =>
        row.map(csvCell).join(","),
      ),
    ].join("\r\n");

    const fileName = `accounts-payable-${new Date()
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
    console.error("EXPORT_ACCOUNTS_PAYABLE_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to export Accounts Payable.",
      },
      {
        status: 500,
      },
    );
  }
}
