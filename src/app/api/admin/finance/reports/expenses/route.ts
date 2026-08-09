import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  ExpenseApprovalStatus,
  ExpenseCostCenter,
  ExpenseCostType,
  ExpenseItem,
  ExpensePaymentStatus,
  FinanceSourceType,
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

    const costType = validEnum(
      ExpenseCostType,
      url.searchParams.get("costType"),
    );

    const costCenter = validEnum(
      ExpenseCostCenter,
      url.searchParams.get("costCenter"),
    );

    const expenseItem = validEnum(
      ExpenseItem,
      url.searchParams.get("expenseItem"),
    );

    const approvalStatus = validEnum(
      ExpenseApprovalStatus,
      url.searchParams.get("approvalStatus"),
    );

    const paymentStatus = validEnum(
      ExpensePaymentStatus,
      url.searchParams.get("paymentStatus"),
    );

    const sourceType = validEnum(
      FinanceSourceType,
      url.searchParams.get("sourceType"),
    );

    const q = url.searchParams.get("q")?.trim() || "";

    const where: Prisma.ExpenseWhereInput = {
      ...(from || to
        ? {
            expenseDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),

      ...(costType ? { costType } : {}),
      ...(costCenter ? { costCenter } : {}),
      ...(expenseItem ? { expenseItem } : {}),
      ...(approvalStatus ? { approvalStatus } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(sourceType ? { sourceType } : {}),

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
                description: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                vendorName: {
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
                paymentReference: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                clientCompanyName: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                spenderName: {
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
              {
                supplier: {
                  name: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const expenses = await db.expense.findMany({
      where,
      orderBy: [
        {
          expenseDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        currency: true,
        category: true,
        costType: true,
        expenseItem: true,
        costCenter: true,
        approvalStatus: true,
        paymentStatus: true,
        vendorName: true,
        paymentMethod: true,
        paymentReference: true,
        supplierInvoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        expenseDate: true,
        paidAt: true,
        recurring: true,
        reimbursable: true,
        direction: true,
        sourceType: true,
        taxType: true,
        taxRate: true,
        taxAmount: true,
        grossAmount: true,
        netAmount: true,
        originalAmount: true,
        originalCurrency: true,
        exchangeRateToBase: true,
        baseCurrency: true,
        baseAmount: true,
        clientCompanyName: true,
        spenderName: true,
        partnerCompanyName: true,
        groupName: true,
        customPackageName: true,
        createdAt: true,

        supplier: {
          select: {
            name: true,
          },
        },

        bankAccount: {
          select: {
            name: true,
          },
        },

        tour: {
          select: {
            title: true,
          },
        },

        booking: {
          select: {
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },

        departureDate: {
          select: {
            date: true,
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
      },
    });

    const headers = [
      "Expense ID",
      "Expense Date",
      "Title",
      "Description",
      "Category",
      "Cost Type",
      "Cost Center",
      "Expense Item",
      "Approval Status",
      "Payment Status",
      "Vendor",
      "Supplier",
      "Original Amount",
      "Original Currency",
      "Exchange Rate To Base",
      "Base Amount",
      "Base Currency",
      "Gross Amount",
      "Net Amount",
      "Tax Type",
      "Tax Rate",
      "Tax Amount",
      "Payment Method",
      "Payment Reference",
      "Supplier Invoice",
      "Invoice Date",
      "Due Date",
      "Paid At",
      "Tour",
      "Departure Date",
      "Booking",
      "Client Company",
      "Partner Company",
      "Group",
      "Spender",
      "Custom Package",
      "Source Type",
      "Direction",
      "Recurring",
      "Reimbursable",
      "Bank Account",
      "Ledger Posted",
      "Created By",
      "Created Date",
    ];

    const rows = expenses.map((expense) => [
      expense.id,
      dateValue(expense.expenseDate),
      expense.title,
      expense.description || "",
      expense.category,
      expense.costType,
      expense.costCenter || "",
      expense.expenseItem || "",
      expense.approvalStatus,
      expense.paymentStatus,
      expense.vendorName || "",
      expense.supplier?.name || "",
      expense.originalAmount || expense.amount,
      expense.originalCurrency || expense.currency,
      expense.exchangeRateToBase,
      expense.baseAmount,
      expense.baseCurrency,
      expense.grossAmount ?? expense.amount,
      expense.netAmount ?? "",
      expense.taxType,
      expense.taxRate ?? "",
      expense.taxAmount ?? "",
      expense.paymentMethod || "",
      expense.paymentReference || "",
      expense.supplierInvoiceNumber || "",
      dateValue(expense.invoiceDate),
      dateValue(expense.dueDate),
      dateValue(expense.paidAt),
      expense.tour?.title || "",
      dateValue(expense.departureDate?.date),
      expense.booking
        ? expense.booking.bookingDisplayCode ||
          expense.booking.bookingReference
        : "",
      expense.clientCompanyName || "",
      expense.partnerCompanyName || "",
      expense.groupName || "",
      expense.spenderName || "",
      expense.customPackageName || "",
      expense.sourceType,
      expense.direction,
      expense.recurring ? "YES" : "NO",
      expense.reimbursable ? "YES" : "NO",
      expense.bankAccount?.name || "",
      expense.bankTransactions.length > 0 ? "YES" : "NO",
      expense.createdBy?.fullName ||
        expense.createdBy?.email ||
        "",
      dateValue(expense.createdAt),
    ]);

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\r\n");

    const fileName = `expense-report-${new Date()
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
    console.error("EXPORT_EXPENSE_REPORT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to export Expense Report.",
      },
      {
        status: 500,
      },
    );
  }
}
