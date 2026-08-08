import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  ExpenseApprovalStatus,
  ExpenseCategory,
  ExpenseCostCenter,
  ExpenseCostType,
  ExpenseItem,
  ExpensePaymentStatus,
  FinanceDirection,
  FinanceSourceType,
  FinanceTaxType,
  PaymentMethod,
  Role,
} from "@prisma/client";

import fs from "fs/promises";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function cleanString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = cleanString(value);

  if (!text) {
    return null;
  }

  const number = Number(text);

  return Number.isFinite(number)
    ? number
    : null;
}

function parseBoolean(value: FormDataEntryValue | null) {
  return (
    value === "true" ||
    value === "on" ||
    value === "1"
  );
}

function parseDate(
  value: FormDataEntryValue | null,
) {
  const text = cleanString(value);

  if (!text) {
    return null;
  }

  const date = new Date(
    `${text}T12:00:00.000Z`,
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function enumIncludes<T extends string>(
  enumObject: Record<string, string>,
  value: string,
): value is T {
  return Object.values(enumObject).includes(
    value,
  );
}

export async function POST(
  request: Request,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

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

    const formData =
      await request.formData();

    // ========================================================
    // BASIC EXPENSE INFORMATION
    // ========================================================

    const title =
      cleanString(
        formData.get("title"),
      );

    const description =
      cleanString(
        formData.get("description"),
      );

    const amount =
      Number(
        cleanString(
          formData.get("amount"),
        ) || 0,
      );

    const currency =
      cleanString(
        formData.get("currency"),
      ).toUpperCase() || "EUR";

    const category =
      cleanString(
        formData.get("category"),
      );

    const costType =
      cleanString(
        formData.get("costType"),
      ) || "OVERHEAD";

    const expenseItem =
      cleanString(
        formData.get("expenseItem"),
      );

    const costCenter =
      cleanString(
        formData.get("costCenter"),
      );

    const approvalStatus =
      cleanString(
        formData.get(
          "approvalStatus",
        ),
      ) || "DRAFT";

    const paymentStatus =
      cleanString(
        formData.get(
          "paymentStatus",
        ),
      ) || "PENDING";

    // ========================================================
    // FINANCE CLASSIFICATION
    // ========================================================

    const direction =
      cleanString(
        formData.get("direction"),
      ) || "EXPENSE";

    const sourceType =
      cleanString(
        formData.get("sourceType"),
      ) || "INTERNAL";

    const taxType =
      cleanString(
        formData.get("taxType"),
      ) || "NONE";

    // ========================================================
    // SUPPLIER / VENDOR
    // ========================================================

    const vendorName =
      cleanString(
        formData.get("vendorName"),
      );

    const supplierId =
      cleanString(
        formData.get("supplierId"),
      );

    // ========================================================
    // PAYMENT INFORMATION
    // ========================================================

    const bankAccountId =
      cleanString(
        formData.get(
          "bankAccountId",
        ),
      );

    const paymentMethod =
      cleanString(
        formData.get(
          "paymentMethod",
        ),
      );

    const paymentReference =
      cleanString(
        formData.get(
          "paymentReference",
        ),
      );

    // ========================================================
    // SUPPLIER INVOICE
    // ========================================================

    const supplierInvoiceNumber =
      cleanString(
        formData.get(
          "supplierInvoiceNumber",
        ),
      );

    const invoiceDate =
      parseDate(
        formData.get("invoiceDate"),
      );

    const dueDate =
      parseDate(
        formData.get("dueDate"),
      );

    // ========================================================
    // DATES
    // ========================================================

    const expenseDate =
      parseDate(
        formData.get("expenseDate"),
      ) ?? new Date();

    const paidAt =
      parseDate(
        formData.get("paidAt"),
      );

    // ========================================================
    // FLAGS
    // ========================================================

    const recurring =
      parseBoolean(
        formData.get("recurring"),
      );

    const reimbursable =
      parseBoolean(
        formData.get(
          "reimbursable",
        ),
      );

    // ========================================================
    // NOTES / DOCUMENT
    // ========================================================

    const notes =
      cleanString(
        formData.get("notes"),
      );

    const documentUrl =
      cleanString(
        formData.get("documentUrl"),
      );

    let receiptUrl =
      cleanString(
        formData.get("receiptUrl"),
      );

    // ========================================================
    // RECEIPT UPLOAD
    // ========================================================

    const receiptFile =
      formData.get("receipt");

    if (
      receiptFile &&
      typeof receiptFile !==
        "string" &&
      receiptFile.size > 0
    ) {
      const allowedTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          receiptFile.type,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Only PDF, JPG, PNG and WEBP files are allowed.",
          },
          {
            status: 400,
          },
        );
      }

      const maxSize =
        10 * 1024 * 1024;

      if (
        receiptFile.size >
        maxSize
      ) {
        return NextResponse.json(
          {
            error:
              "Receipt file must be smaller than 10MB.",
          },
          {
            status: 400,
          },
        );
      }

      const bytes =
        await receiptFile.arrayBuffer();

      const buffer =
        Buffer.from(bytes);

      const uploadDir =
        path.join(
          process.cwd(),
          "public",
          "uploads",
          "expenses",
        );

      await fs.mkdir(
        uploadDir,
        {
          recursive: true,
        },
      );

      const safeFileName =
        `${Date.now()}-${receiptFile.name}`
          .replace(
            /\s+/g,
            "-",
          )
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "",
          );

      await fs.writeFile(
        path.join(
          uploadDir,
          safeFileName,
        ),
        buffer,
      );

      receiptUrl =
        `/uploads/expenses/${safeFileName}`;
    }

    // ========================================================
    // OPERATIONAL LINKS
    // ========================================================

    const bookingId =
      cleanString(
        formData.get("bookingId"),
      );

    const tourId =
      cleanString(
        formData.get("tourId"),
      );

    const departureDateId =
      cleanString(
        formData.get(
          "departureDateId",
        ),
      );

    // ========================================================
    // EXISTING SNAPSHOT FIELDS
    // ========================================================

    const agentNameSnapshot =
      cleanString(
        formData.get(
          "agentNameSnapshot",
        ),
      );

    const partnerCompanyName =
      cleanString(
        formData.get(
          "partnerCompanyName",
        ),
      );

    const tourLeaderName =
      cleanString(
        formData.get(
          "tourLeaderName",
        ),
      );

    const customPackageName =
      cleanString(
        formData.get(
          "customPackageName",
        ),
      );

    const groupName =
      cleanString(
        formData.get("groupName"),
      );

    const clientCompanyName =
      cleanString(
        formData.get(
          "clientCompanyName",
        ),
      );

    const spenderName =
      cleanString(
        formData.get("spenderName"),
      );

    const tourCategoryName =
      cleanString(
        formData.get(
          "tourCategoryName",
        ),
      );

    const partnerCompanyId =
      cleanString(
        formData.get(
          "partnerCompanyId",
        ),
      );

    // ========================================================
    // TAX / CURRENCY
    // ========================================================

    const taxRate =
      optionalNumber(
        formData.get("taxRate"),
      );

    const taxAmount =
      optionalNumber(
        formData.get("taxAmount"),
      ) ?? 0;

    const grossAmount =
      optionalNumber(
        formData.get("grossAmount"),
      );

    const netAmount =
      optionalNumber(
        formData.get("netAmount"),
      );

    const originalAmount =
      optionalNumber(
        formData.get(
          "originalAmount",
        ),
      ) ?? amount;

    const originalCurrency =
      cleanString(
        formData.get(
          "originalCurrency",
        ),
      ).toUpperCase() ||
      currency;

    const exchangeRateToBase =
      optionalNumber(
        formData.get(
          "exchangeRateToBase",
        ),
      ) ?? 1;

    const baseCurrency =
      cleanString(
        formData.get(
          "baseCurrency",
        ),
      ).toUpperCase() ||
      "EUR";

    const baseAmount =
      optionalNumber(
        formData.get(
          "baseAmount",
        ),
      ) ??
      amount *
        exchangeRateToBase;

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Title is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Amount must be greater than zero.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !enumIncludes<ExpenseCategory>(
        ExpenseCategory,
        category,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid expense category.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !enumIncludes<ExpenseCostType>(
        ExpenseCostType,
        costType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid expense cost type.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      expenseItem &&
      !enumIncludes<ExpenseItem>(
        ExpenseItem,
        expenseItem,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid detailed expense item.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      costCenter &&
      !enumIncludes<ExpenseCostCenter>(
        ExpenseCostCenter,
        costCenter,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid cost center.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !enumIncludes<ExpenseApprovalStatus>(
        ExpenseApprovalStatus,
        approvalStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid approval status.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !enumIncludes<ExpensePaymentStatus>(
        ExpensePaymentStatus,
        paymentStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment status.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !enumIncludes<FinanceDirection>(
        FinanceDirection,
        direction,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid finance direction.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !enumIncludes<FinanceSourceType>(
        FinanceSourceType,
        sourceType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid finance source type.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !enumIncludes<FinanceTaxType>(
        FinanceTaxType,
        taxType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid tax type.",
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // SUPPLIER VALIDATION
    // ========================================================

    if (supplierId) {
      const supplier =
        await db.supplier.findUnique(
          {
            where: {
              id: supplierId,
            },

            select: {
              id: true,
            },
          },
        );

      if (!supplier) {
        return NextResponse.json(
          {
            error:
              "Selected supplier was not found.",
          },
          {
            status: 404,
          },
        );
      }
    }

    // ========================================================
    // TOUR / DEPARTURE VALIDATION
    // ========================================================

    if (departureDateId) {
      const departure =
        await db.departureDate.findUnique(
          {
            where: {
              id:
                departureDateId,
            },

            select: {
              id: true,
              tourId: true,
            },
          },
        );

      if (!departure) {
        return NextResponse.json(
          {
            error:
              "Selected departure was not found.",
          },
          {
            status: 404,
          },
        );
      }

      if (
        tourId &&
        departure.tourId !==
          tourId
      ) {
        return NextResponse.json(
          {
            error:
              "Selected departure does not belong to the selected tour.",
          },
          {
            status: 400,
          },
        );
      }
    }

    if (bookingId) {
      const booking =
        await db.booking.findUnique(
          {
            where: {
              id: bookingId,
            },

            select: {
              id: true,
            },
          },
        );

      if (!booking) {
        return NextResponse.json(
          {
            error:
              "Selected booking was not found.",
          },
          {
            status: 404,
          },
        );
      }
    }

    // ========================================================
    // PAID EXPENSE VALIDATION
    // ========================================================

    let validatedBankAccountId:
      | string
      | null = null;

    let validatedPaymentMethod:
      | PaymentMethod
      | null = null;

    if (
      paymentStatus ===
      ExpensePaymentStatus.PAID
    ) {
      if (
        approvalStatus !==
        ExpenseApprovalStatus.APPROVED
      ) {
        return NextResponse.json(
          {
            error:
              "A paid expense must be approved first.",
          },
          {
            status: 400,
          },
        );
      }

      if (!bankAccountId) {
        return NextResponse.json(
          {
            error:
              "Select the bank or cash account used to pay this expense.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !paymentMethod ||
        !enumIncludes<PaymentMethod>(
          PaymentMethod,
          paymentMethod,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Select a valid payment method.",
          },
          {
            status: 400,
          },
        );
      }

      const bankAccount =
        await db.bankAccount.findUnique(
          {
            where: {
              id:
                bankAccountId,
            },

            select: {
              id: true,
              currency: true,
              isActive: true,
            },
          },
        );

      if (
        !bankAccount ||
        !bankAccount.isActive
      ) {
        return NextResponse.json(
          {
            error:
              "Selected bank account is not available.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        bankAccount.currency !==
        currency
      ) {
        return NextResponse.json(
          {
            error:
              "Bank account currency must match the expense currency in this version.",
          },
          {
            status: 400,
          },
        );
      }

      validatedBankAccountId =
        bankAccount.id;

      validatedPaymentMethod =
        paymentMethod as PaymentMethod;
    }

    // ========================================================
    // CREATE EXPENSE + LEDGER ATOMICALLY
    // ========================================================

    const result =
      await db.$transaction(
        async (tx) => {
          const expense =
            await tx.expense.create({
              data: {
                title,

                description:
                  description ||
                  null,

                amount,
                currency,

                category:
                  category as ExpenseCategory,

                costType:
                  costType as ExpenseCostType,

                expenseItem:
                  expenseItem
                    ? (expenseItem as ExpenseItem)
                    : null,

                costCenter:
                  costCenter
                    ? (costCenter as ExpenseCostCenter)
                    : null,

                approvalStatus:
                  approvalStatus as ExpenseApprovalStatus,

                paymentStatus:
                  paymentStatus as ExpensePaymentStatus,

                direction:
                  direction as FinanceDirection,

                sourceType:
                  sourceType as FinanceSourceType,

                vendorName:
                  vendorName ||
                  null,

                supplierId:
                  supplierId ||
                  null,

                bankAccountId:
                  validatedBankAccountId,

                paymentMethod:
                  validatedPaymentMethod,

                paymentReference:
                  paymentReference ||
                  null,

                supplierInvoiceNumber:
                  supplierInvoiceNumber ||
                  null,

                invoiceDate,
                dueDate,

                expenseDate,

                paidAt:
                  paymentStatus ===
                  ExpensePaymentStatus.PAID
                    ? paidAt ??
                      new Date()
                    : null,

                receiptUrl:
                  receiptUrl ||
                  null,

                documentUrl:
                  documentUrl ||
                  null,

                notes:
                  notes || null,

                recurring,
                reimbursable,

                bookingId:
                  bookingId ||
                  null,

                tourId:
                  tourId || null,

                departureDateId:
                  departureDateId ||
                  null,

                createdById:
                  session.user.id,

                taxType:
                  taxType as FinanceTaxType,

                taxRate,

                taxAmount,

                grossAmount,

                netAmount,

                originalAmount,

                originalCurrency,

                exchangeRateToBase,

                baseCurrency,

                baseAmount,

                agentNameSnapshot:
                  agentNameSnapshot ||
                  null,

                partnerCompanyName:
                  partnerCompanyName ||
                  null,

                tourLeaderName:
                  tourLeaderName ||
                  null,

                customPackageName:
                  customPackageName ||
                  null,

                groupName:
                  groupName || null,

                clientCompanyName:
                  clientCompanyName ||
                  null,

                spenderName:
                  spenderName ||
                  null,

                tourCategoryName:
                  tourCategoryName ||
                  null,

                partnerCompanyId:
                  partnerCompanyId ||
                  null,
              },
            });

          let ledgerTransaction =
            null;

          // ==================================================
          // CASH MOVEMENT ONLY WHEN ACTUALLY PAID
          // ==================================================

          if (
            paymentStatus ===
              ExpensePaymentStatus.PAID &&
            validatedBankAccountId
          ) {
            ledgerTransaction =
              await tx.bankTransaction.create(
                {
                  data: {
                    bankAccountId:
                      validatedBankAccountId,

                    createdById:
                      session.user.id,

                    type:
                      "EXPENSE_PAYMENT",

                    direction:
                      "OUT",

                    status:
                      "POSTED",

                    amount,

                    currency,

                    transactionDate:
                      paidAt ??
                      new Date(),

                    reference:
                      paymentReference ||
                      supplierInvoiceNumber ||
                      null,

                    description:
                      vendorName
                        ? `${title} — ${vendorName}`
                        : title,

                    notes:
                      notes ||
                      null,

                    expenseId:
                      expense.id,

                    bookingId:
                      bookingId ||
                      null,

                    tourId:
                      tourId ||
                      null,

                    departureDateId:
                      departureDateId ||
                      null,
                  },
                },
              );
          }

          return {
            expense,
            ledgerTransaction,
          };
        },
      );

    return NextResponse.json(
      {
        success: true,

        expense:
          result.expense,

        ledgerTransaction:
          result.ledgerTransaction,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "CREATE_EXPENSE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save expense.",
      },
      {
        status: 500,
      },
    );
  }
}