import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function parseDateStart(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function validEnum<T extends Record<string, string>>(
  source: T,
  value: string | null,
): T[keyof T] | undefined {
  if (!value) {
    return undefined;
  }

  return Object.values(source).includes(value)
    ? (value as T[keyof T])
    : undefined;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);

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

function dateValue(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function sourceLabel(transaction: {
  booking: {
    bookingReference: string;
    bookingDisplayCode: string | null;
  } | null;
  supplierPayablePayment: {
    payable: {
      title: string;
      supplierNameSnapshot: string;
    };
  } | null;
  expense: {
    title: string;
    vendorName: string | null;
  } | null;
  refund: {
    booking: {
      bookingReference: string;
      bookingDisplayCode: string | null;
    };
  } | null;
  tour: {
    title: string;
  } | null;
  paymentId: string | null;
}) {
  if (transaction.booking) {
    return (
      transaction.booking.bookingDisplayCode ||
      transaction.booking.bookingReference
    );
  }

  if (transaction.supplierPayablePayment) {
    return `${transaction.supplierPayablePayment.payable.supplierNameSnapshot} - ${transaction.supplierPayablePayment.payable.title}`;
  }

  if (transaction.expense) {
    return transaction.expense.vendorName
      ? `${transaction.expense.title} - ${transaction.expense.vendorName}`
      : transaction.expense.title;
  }

  if (transaction.refund) {
    return (
      transaction.refund.booking.bookingDisplayCode ||
      transaction.refund.booking.bookingReference
    );
  }

  if (transaction.tour) {
    return transaction.tour.title;
  }

  if (transaction.paymentId) {
    return "Customer payment";
  }

  return "";
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

    const bankAccountId =
      url.searchParams.get("bankAccountId")?.trim() || undefined;

    const type = validEnum(
      BankTransactionType,
      url.searchParams.get("type"),
    );

    const direction = validEnum(
      BankTransactionDirection,
      url.searchParams.get("direction"),
    );

    const status = validEnum(
      BankTransactionStatus,
      url.searchParams.get("status"),
    );

    const q = url.searchParams.get("q")?.trim() || "";

    const where: Prisma.BankTransactionWhereInput = {
      ...(bankAccountId
        ? {
            bankAccountId,
          }
        : {}),
      ...(from || to
        ? {
            transactionDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(type ? { type } : {}),
      ...(direction ? { direction } : {}),
      ...(status ? { status } : {}),
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
                description: {
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
            ],
          }
        : {}),
    };

    const transactions = await db.bankTransaction.findMany({
      where,
      orderBy: [
        {
          bankAccountId: "asc",
        },
        {
          transactionDate: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
      select: {
        id: true,
        paymentId: true,
        type: true,
        direction: true,
        status: true,
        amount: true,
        currency: true,
        transactionDate: true,
        valueDate: true,
        reference: true,
        description: true,
        notes: true,
        reconciliationId: true,
        reconciledAt: true,
        transferGroupId: true,

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

        booking: {
          select: {
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },

        supplierPayablePayment: {
          select: {
            payable: {
              select: {
                title: true,
                supplierNameSnapshot: true,
              },
            },
          },
        },

        expense: {
          select: {
            title: true,
            vendorName: true,
          },
        },

        refund: {
          select: {
            booking: {
              select: {
                bookingReference: true,
                bookingDisplayCode: true,
              },
            },
          },
        },

        tour: {
          select: {
            title: true,
          },
        },

        statementLine: {
          select: {
            id: true,
          },
        },
      },
    });

    const headers = [
      "Transaction ID",
      "Transaction Date",
      "Value Date",
      "Bank Account",
      "Type",
      "Direction",
      "Status",
      "Currency",
      "Amount",
      "Debit Out",
      "Credit In",
      "Reference",
      "Description",
      "Source",
      "Statement Matched",
      "Reconciliation ID",
      "Reconciled At",
      "Transfer Group ID",
      "Created By",
      "Notes",
    ];

    const csvRows = transactions.map((transaction) => {
      const amount = Number(transaction.amount);
      const incoming =
        transaction.direction === BankTransactionDirection.IN;

      return [
        transaction.id,
        dateValue(transaction.transactionDate),
        dateValue(transaction.valueDate),
        transaction.bankAccount.name,
        transaction.type,
        transaction.direction,
        transaction.status,
        transaction.currency,
        amount.toFixed(2),
        incoming ? "" : amount.toFixed(2),
        incoming ? amount.toFixed(2) : "",
        transaction.reference || "",
        transaction.description || "",
        sourceLabel(transaction),
        transaction.statementLine ? "YES" : "NO",
        transaction.reconciliationId || "",
        transaction.reconciledAt?.toISOString() || "",
        transaction.transferGroupId || "",
        transaction.createdBy?.fullName ||
          transaction.createdBy?.email ||
          "",
        transaction.notes || "",
      ];
    });

    const csv = [
      headers.map(csvCell).join(","),
      ...csvRows.map((row) => row.map(csvCell).join(",")),
    ].join("\r\n");

    const fileName = `general-ledger-${new Date()
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
    console.error("EXPORT_GENERAL_LEDGER_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to export General Ledger.",
      },
      {
        status: 500,
      },
    );
  }
}
