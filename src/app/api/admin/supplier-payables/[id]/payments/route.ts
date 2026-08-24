import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import {
  AccountingCategory,
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  FinanceDocumentType,
  PaymentMethod,
  Prisma,
  SupplierServiceType,
} from "@prisma/client";

import {
  mkdir,
  unlink,
  writeFile,
} from "node:fs/promises";

import path from "node:path";
import crypto from "node:crypto";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

const ALLOWED_EXTENSIONS =
  new Set([
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ]);

function stringValue(
  value: FormDataEntryValue | null,
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed || null;
}

function isMethod(
  value: string,
): value is PaymentMethod {
  return Object.values(
    PaymentMethod,
  ).includes(
    value as PaymentMethod,
  );
}

function sanitizeFileName(
  fileName: string,
) {
  const extension =
    path.extname(
      fileName,
    );

  const baseName =
    path.basename(
      fileName,
      extension,
    );

  const safeBase =
    baseName
      .normalize("NFKD")
      .replace(/\s+/g, "-")
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "",
      )
      .replace(
        /-+/g,
        "-",
      )
      .slice(
        0,
        120,
      );

  const safeExtension =
    extension
      .toLowerCase()
      .replace(
        /[^a-z0-9.]/g,
        "",
      );

  return `${
    safeBase ||
    "supplier-payment-proof"
  }${safeExtension}`;
}

function parsePaymentDate(
  value: string | null,
) {
  if (!value) {
    return null;
  }

  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (!match) {
    return null;
  }

  const year =
    Number(
      match[1],
    );

  const month =
    Number(
      match[2],
    );

  const day =
    Number(
      match[3],
    );

  const result =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12,
        0,
        0,
      ),
    );

  if (
    result.getUTCFullYear() !==
      year ||
    result.getUTCMonth() !==
      month - 1 ||
    result.getUTCDate() !==
      day
  ) {
    return null;
  }

  return result;
}

function getDueDate(
  year: number,
  month: number,
) {
  const nextMonth =
    month === 12
      ? 1
      : month + 1;

  const nextYear =
    month === 12
      ? year + 1
      : year;

  return new Date(
    Date.UTC(
      nextYear,
      nextMonth - 1,
      5,
      12,
      0,
      0,
    ),
  );
}

function accountingSubcategoryForService(
  type:
    | SupplierServiceType
    | null,
) {
  switch (type) {
    case SupplierServiceType.ACCOMMODATION:
      return "Hotels / Accommodation";

    case SupplierServiceType.TRANSPORT:
      return "Transport / Transfers";

    case SupplierServiceType.MEAL:
      return "Restaurants / Meals";

    case SupplierServiceType.GUIDE:
      return "Guides / Excursions";

    case SupplierServiceType.TOUR_MANAGER:
      return "Tour Management";

    case SupplierServiceType.ENTRANCE:
      return "Entrance Fees";

    case SupplierServiceType.TICKET:
      return "Tickets";

    case SupplierServiceType.MASS_ARRANGEMENT:
      return "Mass Arrangements";

    case SupplierServiceType.CHURCH_RESERVATION:
      return "Church / Shrine Reservations";

    case SupplierServiceType.FLIGHT:
      return "Flights";

    case SupplierServiceType.CRUISE:
      return "Cruises";

    case SupplierServiceType.FERRY:
      return "Ferries";

    case SupplierServiceType.RAIL:
      return "Rail";

    case SupplierServiceType.INSURANCE:
      return "Insurance";

    case SupplierServiceType.DMC_SERVICE:
      return "DMC / Ground Services";

    case SupplierServiceType.OTHER:
    default:
      return "Other Supplier Costs";
  }
}

export async function POST(
  request: Request,
  { params }: Context,
) {
  let absoluteUploadedFilePath:
    | string
    | null = null;

  try {
    // ======================================================
    // AUTHORIZATION
    // ======================================================

    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
      session.user.role !==
        "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } =
      await params;

    // ======================================================
    // FORM DATA
    // ======================================================

    const formData =
      await request.formData();

    const amountRaw =
      stringValue(
        formData.get(
          "amount",
        ),
      );

    const paymentDateRaw =
      stringValue(
        formData.get(
          "paymentDate",
        ),
      );

    const bankAccountId =
      stringValue(
        formData.get(
          "bankAccountId",
        ),
      );

    const methodRaw =
      stringValue(
        formData.get(
          "method",
        ),
      );

    const reference =
      stringValue(
        formData.get(
          "reference",
        ),
      );

    const notes =
      stringValue(
        formData.get(
          "notes",
        ),
      );

    const paymentProofValue =
      formData.get(
        "paymentProof",
      );

    // ======================================================
    // PAYMENT DATE
    // ======================================================

    if (!paymentDateRaw) {
      return NextResponse.json(
        {
          error:
            "Payment date is required.",
        },
        {
          status: 400,
        },
      );
    }

    const paymentDate =
      parsePaymentDate(
        paymentDateRaw,
      );

    if (!paymentDate) {
      return NextResponse.json(
        {
          error:
            "Invalid payment date.",
        },
        {
          status: 400,
        },
      );
    }

    // ======================================================
    // PAYABLE
    // ======================================================

    const payable =
      await db.supplierPayable.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          title: true,

          supplierId: true,

          supplierNameSnapshot:
            true,

          approvalStatus:
            true,

          paymentStatus:
            true,

          currency: true,

          amountPaid: true,
          balance: true,
          approvedAmount:
            true,
          creditAmount:
            true,

          bookingId: true,
          tourId: true,
          departureDateId:
            true,

          supplierInvoiceNumber:
            true,

          service: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

    if (!payable) {
      return NextResponse.json(
        {
          error:
            "Payable not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ======================================================
    // PAYABLE STATUS VALIDATION
    // ======================================================

    if (
      payable.approvalStatus !==
      "APPROVED"
    ) {
      return NextResponse.json(
        {
          error:
            "The payable must be approved before payment.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      [
        "PAID",
        "CANCELLED",
      ].includes(
        payable.paymentStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This payable is not open for payment.",
        },
        {
          status: 409,
        },
      );
    }

    // ======================================================
    // PAYMENT METHOD
    // ======================================================

    if (
      !methodRaw ||
      !isMethod(
        methodRaw,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A valid payment method is required.",
        },
        {
          status: 400,
        },
      );
    }

    // ======================================================
    // PAYMENT AMOUNT
    // ======================================================

    if (!amountRaw) {
      return NextResponse.json(
        {
          error:
            "Payment amount is required.",
        },
        {
          status: 400,
        },
      );
    }

    let amount:
      Prisma.Decimal;

    try {
      amount =
        new Prisma.Decimal(
          amountRaw,
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid payment amount.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      amount.lte(
        0,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Payment amount must be greater than zero.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      amount.gt(
        payable.balance,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Payment cannot exceed the outstanding balance.",
        },
        {
          status: 400,
        },
      );
    }

    // ======================================================
    // BANK ACCOUNT
    // ======================================================

    if (!bankAccountId) {
      return NextResponse.json(
        {
          error:
            "Select the bank or cash account used for this supplier payment.",
        },
        {
          status: 400,
        },
      );
    }

    const bank =
      await db.bankAccount.findUnique({
        where: {
          id:
            bankAccountId,
        },

        select: {
          id: true,
          name: true,
          currency: true,
          isActive: true,
        },
      });

    if (
      !bank ||
      !bank.isActive
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
      bank.currency !==
      payable.currency
    ) {
      return NextResponse.json(
        {
          error:
            "Bank account currency must match the payable currency in this version.",
        },
        {
          status: 400,
        },
      );
    }

    // ======================================================
    // PAYMENT PROOF
    // ======================================================

    let paymentProof:
      | File
      | null = null;

    if (
      paymentProofValue instanceof
        File &&
      paymentProofValue.size >
        0
    ) {
      paymentProof =
        paymentProofValue;
    }

    if (paymentProof) {
      const extension =
        path
          .extname(
            paymentProof.name,
          )
          .toLowerCase();

      if (
        !ALLOWED_EXTENSIONS.has(
          extension,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Only PDF, JPG, PNG and WEBP payment proofs are allowed.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        paymentProof.type &&
        !ALLOWED_FILE_TYPES.has(
          paymentProof.type,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Only PDF, JPG, PNG and WEBP payment proofs are allowed.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        paymentProof.size >
        MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              "Payment proof must be smaller than 10 MB.",
          },
          {
            status: 400,
          },
        );
      }
    }

    // ======================================================
    // ACCOUNTING PERIOD
    // ======================================================

    /*
     * Payment proof belongs to the month
     * in which the supplier payment was
     * actually made.
     */
    const accountingYear =
      paymentDate.getUTCFullYear();

    const accountingMonth =
      paymentDate.getUTCMonth() +
      1;

    const accountingSubcategory =
      accountingSubcategoryForService(
        payable.service?.type ??
          null,
      );

    // ======================================================
    // STORE PAYMENT PROOF LOCALLY
    // ======================================================

    let originalFileName:
      | string
      | null = null;

    let storedFileName:
      | string
      | null = null;

    let storagePath:
      | string
      | null = null;

    if (paymentProof) {
      originalFileName =
        paymentProof.name ||
        "supplier-payment-proof";

      const safeOriginalName =
        sanitizeFileName(
          originalFileName,
        );

      storedFileName =
        `${Date.now()}-${crypto.randomUUID()}-${safeOriginalName}`;

      const monthFolder =
        String(
          accountingMonth,
        ).padStart(
          2,
          "0",
        );

      const relativeFolder =
        path.join(
          "uploads",
          "accounting",
          String(
            accountingYear,
          ),
          monthFolder,
        );

      const absoluteFolder =
        path.join(
          process.cwd(),
          "public",
          relativeFolder,
        );

      await mkdir(
        absoluteFolder,
        {
          recursive:
            true,
        },
      );

      absoluteUploadedFilePath =
        path.join(
          absoluteFolder,
          storedFileName,
        );

      const bytes =
        await paymentProof.arrayBuffer();

      await writeFile(
        absoluteUploadedFilePath,
        Buffer.from(
          bytes,
        ),
      );

      storagePath =
        `/${relativeFolder
          .split(
            path.sep,
          )
          .join(
            "/",
          )}/${storedFileName}`;
    }

    // ======================================================
    // DATABASE TRANSACTION
    // ======================================================

    const result =
      await db.$transaction(
        async (tx) => {
          // --------------------------------------------------
          // SUPPLIER PAYMENT
          // --------------------------------------------------

          const payment =
            await tx.supplierPayablePayment.create({
              data: {
                payableId:
                  payable.id,

                bankAccountId:
                  bank.id,

                recordedById:
                  session.user.id,

                amount,

                currency:
                  payable.currency,

                paymentDate,

                method:
                  methodRaw,

                reference,

                notes,
              },
            });

          // --------------------------------------------------
          // BANK LEDGER
          // --------------------------------------------------

          const ledgerTransaction =
            await tx.bankTransaction.create({
              data: {
                bankAccountId:
                  bank.id,

                createdById:
                  session.user.id,

                type:
                  BankTransactionType.SUPPLIER_PAYMENT,

                direction:
                  BankTransactionDirection.OUT,

                status:
                  BankTransactionStatus.POSTED,

                amount,

                currency:
                  payable.currency,

                transactionDate:
                  paymentDate,

                reference,

                description:
                  `${payable.supplierNameSnapshot} - ${payable.title}`,

                notes,

                supplierPayablePaymentId:
                  payment.id,

                bookingId:
                  payable.bookingId,

                tourId:
                  payable.tourId,

                departureDateId:
                  payable.departureDateId,
              },
            });

          // --------------------------------------------------
          // ACCOUNTING PERIOD
          // --------------------------------------------------

          let accountingPeriodId:
            | string
            | null = null;

          if (
            paymentProof
          ) {
            const accountingPeriod =
              await tx.accountingPeriod.upsert({
                where: {
                  year_month: {
                    year:
                      accountingYear,

                    month:
                      accountingMonth,
                  },
                },

                update: {},

                create: {
                  year:
                    accountingYear,

                  month:
                    accountingMonth,

                  dueDate:
                    getDueDate(
                      accountingYear,
                      accountingMonth,
                    ),
                },

                select: {
                  id: true,
                },
              });

            accountingPeriodId =
              accountingPeriod.id;
          }

          // --------------------------------------------------
          // PAYMENT PROOF DOCUMENT
          // --------------------------------------------------

          let financeDocument:
            | {
                id: string;
              }
            | null = null;

          if (
            paymentProof &&
            originalFileName &&
            storedFileName &&
            storagePath &&
            accountingPeriodId
          ) {
            financeDocument =
              await tx.financeDocument.create({
                data: {
                  type:
                    FinanceDocumentType.SUPPLIER_PAYMENT_PROOF,

                  title:
                    reference
                      ? `Supplier Payment Proof - ${reference}`
                      : `Supplier Payment Proof - ${payable.title}`,

                  description:
                    notes ??
                    `Payment proof for ${payable.supplierNameSnapshot} - ${payable.title}`,

                  originalFileName,

                  storedFileName,

                  storagePath,

                  mimeType:
                    paymentProof.type ||
                    "application/octet-stream",

                  fileSize:
                    paymentProof.size,

                  documentDate:
                    paymentDate,

                  referenceNumber:
                    reference,

                  /*
                   * Supporting evidence for an
                   * existing supplier expense.
                   *
                   * It is included in Category 03
                   * but must not be interpreted as
                   * another supplier expense.
                   */
                  accountingCategory:
                    AccountingCategory.EXPENSES_PURCHASES,

                  accountingSubcategory:
                    `${accountingSubcategory} - Payment Proof`,

                  accountingPeriodId,

                  supplierPayableId:
                    payable.id,

                  supplierPayablePaymentId:
                    payment.id,

                  bankTransactionId:
                    ledgerTransaction.id,

                  supplierId:
                    payable.supplierId,

                  bookingId:
                    payable.bookingId,

                  tourId:
                    payable.tourId,

                  departureDateId:
                    payable.departureDateId,

                  uploadedById:
                    session.user.id,
                },

                select: {
                  id: true,
                },
              });
          }

          // --------------------------------------------------
          // UPDATE PAYABLE BALANCE
          // --------------------------------------------------

          const nextAmountPaid =
            payable.amountPaid.plus(
              amount,
            );

          const nextBalance =
            Prisma.Decimal.max(
              new Prisma.Decimal(
                0,
              ),

              payable.approvedAmount
                .minus(
                  payable.creditAmount,
                )
                .minus(
                  nextAmountPaid,
                ),
            );

          const nextPaymentStatus =
            nextBalance.lte(
              0,
            )
              ? "PAID"
              : nextAmountPaid.gt(
                    0,
                  )
                ? "PARTIALLY_PAID"
                : "UNPAID";

          const updated =
            await tx.supplierPayable.update({
              where: {
                id:
                  payable.id,
              },

              data: {
                amountPaid:
                  nextAmountPaid,

                balance:
                  nextBalance,

                paymentStatus:
                  nextPaymentStatus,
              },
            });

          return {
            payment,
            ledgerTransaction,
            financeDocument,
            updated,
          };
        },
      );

    /*
     * Database transaction succeeded.
     * Do not remove the physical file.
     */
    absoluteUploadedFilePath =
      null;

    // ======================================================
    // REVALIDATION
    // ======================================================

    revalidatePath(
      `/admin/supplier-payables/${id}`,
    );

    revalidatePath(
      "/admin/supplier-payables",
    );

    revalidatePath(
      "/admin/finance",
    );

    revalidatePath(
      "/admin/finance/bank-accounts",
    );

    revalidatePath(
      "/admin/finance/documents",
    );

    revalidatePath(
      "/admin/finance/profitability",
    );

    revalidatePath(
      "/admin/accounting",
    );

    return NextResponse.json(
      {
        success: true,

        payment:
          result.payment,

        ledgerTransaction:
          result.ledgerTransaction,

        financeDocument:
          result.financeDocument,

        updated:
          result.updated,

        accounting: {
          category:
            AccountingCategory.EXPENSES_PURCHASES,

          subcategory:
            `${accountingSubcategory} - Payment Proof`,

          year:
            accountingYear,

          month:
            accountingMonth,

          included:
            Boolean(
              result.financeDocument,
            ),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    // ======================================================
    // CLEAN UP ORPHANED LOCAL FILE
    // ======================================================

    if (
      absoluteUploadedFilePath
    ) {
      try {
        await unlink(
          absoluteUploadedFilePath,
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "SUPPLIER_PAYMENT_PROOF_FILE_CLEANUP_ERROR",
          cleanupError,
        );
      }
    }

    console.error(
      "CREATE_SUPPLIER_PAYMENT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to record supplier payment.",
      },
      {
        status: 400,
      },
    );
  }
}