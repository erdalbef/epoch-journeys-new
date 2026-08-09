import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  BankTransactionDirection,
  BankTransactionType,
  Prisma,
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

    const q = url.searchParams.get("q")?.trim() || "";

    const where: Prisma.BankTransactionWhereInput = {
      ...(bankAccountId ? { bankAccountId } : {}),

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
          transactionDate: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
      select: {
        id: true,
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
        transferGroupId: true,
        reconciliationId: true,
        reconciledAt: true,

        bankAccount: {
          select: {
            name: true,
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

        payment: {
          select: {
            id: true,
          },
        },

        statementLine: {
          select: {
            id: true,
            bankStatementId: true,
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
      "Reference",
      "Description",
      "Source",
      "Statement Matched",
      "Statement ID",
      "Reconciliation ID",
      "Reconciled At",
      "Transfer Group ID",
      "Notes",
    ];

    const rows = transactions.map((transaction) => {
      const source =
        transaction.booking
          ? transaction.booking.bookingDisplayCode ||
            transaction.booking.bookingReference
          : transaction.supplierPayablePayment
            ? `${transaction.supplierPayablePayment.payable.supplierNameSnapshot} - ${transaction.supplierPayablePayment.payable.title}`
            : transaction.expense
              ? transaction.expense.vendorName
                ? `${transaction.expense.title} - ${transaction.expense.vendorName}`
                : transaction.expense.title
              : transaction.refund
                ? transaction.refund.booking.bookingDisplayCode ||
                  transaction.refund.booking.bookingReference
                : transaction.payment
                  ? "Customer payment"
                  : "";

      return [
        transaction.id,
        dateValue(transaction.transactionDate),
        dateValue(transaction.valueDate),
        transaction.bankAccount.name,
        transaction.type,
        transaction.direction,
        transaction.status,
        transaction.currency,
        Number(transaction.amount).toFixed(2),
        transaction.reference || "",
        transaction.description || "",
        source,
        transaction.statementLine ? "YES" : "NO",
        transaction.statementLine?.bankStatementId || "",
        transaction.reconciliationId || "",
        transaction.reconciledAt?.toISOString() || "",
        transaction.transferGroupId || "",
        transaction.notes || "",
      ];
    });

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\r\n");

    const fileName = `cash-bank-report-${new Date()
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
    console.error("EXPORT_CASH_BANK_REPORT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to export Cash & Bank Report.",
      },
      {
        status: 500,
      },
    );
  }
}
