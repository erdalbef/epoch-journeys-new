import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  ExpenseApprovalStatus,
  ExpenseCategory,
  ExpenseCostCenter,
  ExpenseCostType,
  ExpenseItem,
  ExpensePaymentStatus,
  FinanceDirection,
  FinanceDocumentType,
  FinanceSourceType,
  FinanceTaxType,
  PaymentMethod,
  Role,
} from "@prisma/client";
import { del, put } from "@vercel/blob";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const MAX_RECEIPT_SIZE =
  10 * 1024 * 1024;

const ALLOWED_RECEIPT_TYPES =
  new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);

function cleanString(
  value: FormDataEntryValue | null,
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
}

function optionalString(
  value: FormDataEntryValue | null,
) {
  const cleaned =
    cleanString(value);

  return cleaned || null;
}

function parseOptionalNumber(
  value: FormDataEntryValue | null,
) {
  const cleaned =
    cleanString(value);

  if (!cleaned) {
    return null;
  }

  const parsed =
    Number(cleaned);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}

function parseRequiredDate(
  value: FormDataEntryValue | null,
) {
  const cleaned =
    cleanString(value);

  if (!cleaned) {
    return null;
  }

  const parsed =
    new Date(
      `${cleaned}T12:00:00.000Z`,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return null;
  }

  return parsed;
}

function parseOptionalDate(
  value: FormDataEntryValue | null,
) {
  const cleaned =
    cleanString(value);

  if (!cleaned) {
    return null;
  }

  const parsed =
    new Date(
      `${cleaned}T12:00:00.000Z`,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return null;
  }

  return parsed;
}

function parseBoolean(
  value: FormDataEntryValue | null,
) {
  return (
    cleanString(value) ===
    "true"
  );
}

function sanitizeFileName(
  fileName: string,
) {
  return fileName
    .normalize("NFKD")
    .replace(/\s+/g, "-")
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "",
    )
    .replace(/-+/g, "-")
    .slice(0, 150);
}

export async function POST(
  request: Request,
) {
  let uploadedBlobUrl:
    | string
    | null = null;

  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
      session.user.role !==
        Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
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
      optionalString(
        formData.get(
          "description",
        ),
      );

    const amount =
      Number(
        formData.get(
          "amount",
        ) || 0,
      );

    const currency =
      cleanString(
        formData.get(
          "currency",
        ),
      ).toUpperCase() ||
      "EUR";

    const categoryRaw =
      cleanString(
        formData.get(
          "category",
        ),
      );

    const costTypeRaw =
      cleanString(
        formData.get(
          "costType",
        ),
      ) || "OVERHEAD";

    const expenseItemRaw =
      cleanString(
        formData.get(
          "expenseItem",
        ),
      );

    const costCenterRaw =
      cleanString(
        formData.get(
          "costCenter",
        ),
      );

    const approvalStatusRaw =
      cleanString(
        formData.get(
          "approvalStatus",
        ),
      ) || "DRAFT";

    const paymentStatusRaw =
      cleanString(
        formData.get(
          "paymentStatus",
        ),
      ) || "PENDING";

    const directionRaw =
      cleanString(
        formData.get(
          "direction",
        ),
      ) || "EXPENSE";

    const sourceTypeRaw =
      cleanString(
        formData.get(
          "sourceType",
        ),
      ) || "INTERNAL";

    const taxTypeRaw =
      cleanString(
        formData.get(
          "taxType",
        ),
      ) || "NONE";

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
      !Number.isFinite(
        amount,
      ) ||
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
      !Object.values(
        ExpenseCategory,
      ).includes(
        categoryRaw as ExpenseCategory,
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
      !Object.values(
        ExpenseCostType,
      ).includes(
        costTypeRaw as ExpenseCostType,
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
      expenseItemRaw &&
      !Object.values(
        ExpenseItem,
      ).includes(
        expenseItemRaw as ExpenseItem,
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
      costCenterRaw &&
      !Object.values(
        ExpenseCostCenter,
      ).includes(
        costCenterRaw as ExpenseCostCenter,
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
      !Object.values(
        ExpenseApprovalStatus,
      ).includes(
        approvalStatusRaw as ExpenseApprovalStatus,
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
      !Object.values(
        ExpensePaymentStatus,
      ).includes(
        paymentStatusRaw as ExpensePaymentStatus,
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
      !Object.values(
        FinanceDirection,
      ).includes(
        directionRaw as FinanceDirection,
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
      !Object.values(
        FinanceSourceType,
      ).includes(
        sourceTypeRaw as FinanceSourceType,
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
      !Object.values(
        FinanceTaxType,
      ).includes(
        taxTypeRaw as FinanceTaxType,
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
    // DATES
    // ========================================================

    const expenseDate =
      parseRequiredDate(
        formData.get(
          "expenseDate",
        ),
      );

    if (!expenseDate) {
      return NextResponse.json(
        {
          error:
            "A valid expense date is required.",
        },
        {
          status: 400,
        },
      );
    }

    const invoiceDate =
      parseOptionalDate(
        formData.get(
          "invoiceDate",
        ),
      );

    const dueDate =
      parseOptionalDate(
        formData.get(
          "dueDate",
        ),
      );

    const paidAt =
      parseOptionalDate(
        formData.get(
          "paidAt",
        ),
      );

    // ========================================================
    // PAYMENT INFORMATION
    // ========================================================

    const paymentMethodRaw =
      cleanString(
        formData.get(
          "paymentMethod",
        ),
      );

    const bankAccountId =
      optionalString(
        formData.get(
          "bankAccountId",
        ),
      );

    const paymentReference =
      optionalString(
        formData.get(
          "paymentReference",
        ),
      );

    if (
      paymentMethodRaw &&
      !Object.values(
        PaymentMethod,
      ).includes(
        paymentMethodRaw as PaymentMethod,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment method.",
        },
        {
          status: 400,
        },
      );
    }

    const approvalStatus =
      approvalStatusRaw as ExpenseApprovalStatus;

    const paymentStatus =
      paymentStatusRaw as ExpensePaymentStatus;

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
              "Please select the bank or cash account used to pay this expense.",
          },
          {
            status: 400,
          },
        );
      }

      if (!paymentMethodRaw) {
        return NextResponse.json(
          {
            error:
              "Please select the payment method.",
          },
          {
            status: 400,
          },
        );
      }
    }

    // ========================================================
    // LINKS / ALLOCATION
    // ========================================================

    const supplierId =
      optionalString(
        formData.get(
          "supplierId",
        ),
      );

    const bookingId =
      optionalString(
        formData.get(
          "bookingId",
        ),
      );

    const tourId =
      optionalString(
        formData.get(
          "tourId",
        ),
      );

    const departureDateId =
      optionalString(
        formData.get(
          "departureDateId",
        ),
      );

    const partnerCompanyId =
      optionalString(
        formData.get(
          "partnerCompanyId",
        ),
      );

    // ========================================================
    // SUPPLIER / VENDOR
    // ========================================================

    const vendorName =
      optionalString(
        formData.get(
          "vendorName",
        ),
      );

    const supplierInvoiceNumber =
      optionalString(
        formData.get(
          "supplierInvoiceNumber",
        ),
      );

    // ========================================================
    // FINANCE AMOUNTS
    // ========================================================

    const originalAmountInput =
      parseOptionalNumber(
        formData.get(
          "originalAmount",
        ),
      );

    const originalCurrency =
      cleanString(
        formData.get(
          "originalCurrency",
        ),
      ).toUpperCase() ||
      currency;

    const exchangeRateInput =
      parseOptionalNumber(
        formData.get(
          "exchangeRateToBase",
        ),
      );

    const baseCurrency =
      cleanString(
        formData.get(
          "baseCurrency",
        ),
      ).toUpperCase() ||
      "EUR";

    const baseAmountInput =
      parseOptionalNumber(
        formData.get(
          "baseAmount",
        ),
      );

    const originalAmount =
      originalAmountInput ??
      amount;

    const exchangeRateToBase =
      exchangeRateInput &&
      exchangeRateInput > 0
        ? exchangeRateInput
        : 1;

    const baseAmount =
      baseAmountInput ??
      originalAmount *
        exchangeRateToBase;

    // ========================================================
    // TAX
    // ========================================================

    const taxRate =
      parseOptionalNumber(
        formData.get(
          "taxRate",
        ),
      );

    const taxAmount =
      parseOptionalNumber(
        formData.get(
          "taxAmount",
        ),
      ) ?? 0;

    const netAmount =
      parseOptionalNumber(
        formData.get(
          "netAmount",
        ),
      );

    const grossAmount =
      parseOptionalNumber(
        formData.get(
          "grossAmount",
        ),
      );

    // ========================================================
    // SNAPSHOT / OPERATION FIELDS
    // ========================================================

    const agentNameSnapshot =
      optionalString(
        formData.get(
          "agentNameSnapshot",
        ),
      );

    const partnerCompanyName =
      optionalString(
        formData.get(
          "partnerCompanyName",
        ),
      );

    const tourLeaderName =
      optionalString(
        formData.get(
          "tourLeaderName",
        ),
      );

    const customPackageName =
      optionalString(
        formData.get(
          "customPackageName",
        ),
      );

    const groupName =
      optionalString(
        formData.get(
          "groupName",
        ),
      );

    const clientCompanyName =
      optionalString(
        formData.get(
          "clientCompanyName",
        ),
      );

    const spenderName =
      optionalString(
        formData.get(
          "spenderName",
        ),
      );

    const tourCategoryName =
      optionalString(
        formData.get(
          "tourCategoryName",
        ),
      );

    // ========================================================
    // FLAGS / LEGACY URL FIELDS
    // ========================================================

    const recurring =
      parseBoolean(
        formData.get(
          "recurring",
        ),
      );

    const reimbursable =
      parseBoolean(
        formData.get(
          "reimbursable",
        ),
      );

    const manualReceiptUrl =
      optionalString(
        formData.get(
          "receiptUrl",
        ),
      );

    const manualDocumentUrl =
      optionalString(
        formData.get(
          "documentUrl",
        ),
      );

    const notes =
      optionalString(
        formData.get(
          "notes",
        ),
      );

    // ========================================================
    // RECEIPT / INVOICE FILE
    // ========================================================

    const receiptFile =
      formData.get(
        "receipt",
      );

    let blob:
      | Awaited<
          ReturnType<
            typeof put
          >
        >
      | null = null;

    let originalFileName:
      | string
      | null = null;

    let storedFileName:
      | string
      | null = null;

    if (
      receiptFile &&
      typeof receiptFile !==
        "string" &&
      receiptFile.size > 0
    ) {
      if (
        !ALLOWED_RECEIPT_TYPES.has(
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

      if (
        receiptFile.size >
        MAX_RECEIPT_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              "Receipt or invoice file must be smaller than 10 MB.",
          },
          {
            status: 400,
          },
        );
      }

      originalFileName =
        receiptFile.name ||
        "expense-document";

      const safeFileName =
        sanitizeFileName(
          originalFileName,
        ) ||
        "expense-document";

      /*
       * Finance documents are now stored in
       * Vercel Private Blob rather than
       * /public/uploads.
       */
      blob = await put(
        `finance/expenses/${Date.now()}-${safeFileName}`,
        receiptFile,
        {
          access: "private",

          addRandomSuffix:
            true,

          contentType:
            receiptFile.type ||
            "application/octet-stream",
        },
      );

      uploadedBlobUrl =
        blob.url;

      storedFileName =
        blob.pathname
          .split("/")
          .pop() ||
        safeFileName;
    }

    // ========================================================
    // CREATE EXPENSE + FINANCE DOCUMENT + BANK LEDGER
    // ========================================================

    const result =
      await db.$transaction(
        async (tx) => {
          const expense =
            await tx.expense.create({
              data: {
                title,
                description,

                amount,
                currency,

                category:
                  categoryRaw as ExpenseCategory,

                costType:
                  costTypeRaw as ExpenseCostType,

                expenseItem:
                  expenseItemRaw
                    ? (expenseItemRaw as ExpenseItem)
                    : null,

                costCenter:
                  costCenterRaw
                    ? (costCenterRaw as ExpenseCostCenter)
                    : null,

                approvalStatus,

                paymentStatus,

                vendorName,

                supplierId,

                bankAccountId,

                paymentMethod:
                  paymentMethodRaw
                    ? (paymentMethodRaw as PaymentMethod)
                    : null,

                paymentReference,

                supplierInvoiceNumber,

                invoiceDate,
                dueDate,

                expenseDate,
                paidAt,

                /*
                 * Legacy URL fields remain available
                 * for older records/manual links.
                 *
                 * New uploaded documents are stored in
                 * FinanceDocument instead.
                 */
                receiptUrl:
                  manualReceiptUrl,

                documentUrl:
                  manualDocumentUrl,

                notes,

                recurring,
                reimbursable,

                bookingId,
                tourId,
                departureDateId,

                createdById:
                  session.user.id,

                direction:
                  directionRaw as FinanceDirection,

                sourceType:
                  sourceTypeRaw as FinanceSourceType,

                taxType:
                  taxTypeRaw as FinanceTaxType,

                taxRate,
                taxAmount,
                grossAmount,
                netAmount,

                originalAmount,
                originalCurrency,
                exchangeRateToBase,
                baseCurrency,
                baseAmount,

                agentNameSnapshot,
                partnerCompanyName,
                tourLeaderName,
                customPackageName,
                groupName,

                clientCompanyName,
                spenderName,
                tourCategoryName,

                partnerCompanyId,
              },
            });

          // ==================================================
          // CENTRAL FINANCE DOCUMENT RECORD
          // ==================================================

          let financeDocument:
            | {
                id: string;
              }
            | null = null;

          if (
            blob &&
            originalFileName &&
            storedFileName
          ) {
            /*
             * If an invoice number exists, classify the
             * file as an Expense Invoice.
             *
             * Otherwise treat it as an Expense Receipt.
             */
            const documentType =
              supplierInvoiceNumber
                ? FinanceDocumentType.EXPENSE_INVOICE
                : FinanceDocumentType.EXPENSE_RECEIPT;

            financeDocument =
              await tx.financeDocument.create({
                data: {
                  type:
                    documentType,

                  title:
                    supplierInvoiceNumber
                      ? `Expense Invoice – ${title}`
                      : `Expense Receipt – ${title}`,

                  description,

                  originalFileName,

                  storedFileName,

                  storagePath:
                    blob.pathname,

                  mimeType:
                    receiptFile &&
                    typeof receiptFile !==
                      "string"
                      ? receiptFile.type ||
                        "application/octet-stream"
                      : "application/octet-stream",

                  fileSize:
                    receiptFile &&
                    typeof receiptFile !==
                      "string"
                      ? receiptFile.size
                      : 0,

                  documentDate:
                    invoiceDate ??
                    expenseDate,

                  referenceNumber:
                    supplierInvoiceNumber ??
                    paymentReference,

                  expenseId:
                    expense.id,

                  bookingId,

                  tourId,

                  departureDateId,

                  supplierId,

                  uploadedById:
                    session.user.id,
                },
              });
          }

          // ==================================================
          // BANK LEDGER ENTRY
          // ==================================================

          let ledgerTransaction:
            | {
                id: string;
              }
            | null = null;

          if (
            paymentStatus ===
              ExpensePaymentStatus.PAID &&
            approvalStatus ===
              ExpenseApprovalStatus.APPROVED &&
            bankAccountId
          ) {
            ledgerTransaction =
              await tx.bankTransaction.create({
                data: {
                  bankAccountId,

                  createdById:
                    session.user.id,

                  type:
                    BankTransactionType.EXPENSE_PAYMENT,

                  direction:
                    BankTransactionDirection.OUT,

                  status:
                    BankTransactionStatus.POSTED,

                  amount,

                  currency,

                  transactionDate:
                    paidAt ??
                    expenseDate,

                  reference:
                    paymentReference,

                  description:
                    `Expense payment: ${title}`,

                  bookingId,

                  expenseId:
                    expense.id,

                  tourId,

                  departureDateId,
                },
              });
          }

          return {
            expense,
            financeDocument,
            ledgerTransaction,
          };
        },
      );

    return NextResponse.json(
      {
        success: true,

        expense: {
          id:
            result.expense.id,

          title:
            result.expense.title,
        },

        financeDocument:
          result.financeDocument,

        ledgerTransaction:
          result.ledgerTransaction,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    /*
     * If Blob upload succeeded but the database
     * transaction failed, remove the orphaned
     * private Blob.
     */
    if (uploadedBlobUrl) {
      try {
        await del(
          uploadedBlobUrl,
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "EXPENSE_DOCUMENT_BLOB_CLEANUP_ERROR",
          cleanupError,
        );
      }
    }

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