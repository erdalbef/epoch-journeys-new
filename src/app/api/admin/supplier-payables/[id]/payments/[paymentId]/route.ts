import fs from "fs/promises";
import path from "path";

import { get } from "@vercel/blob";
import {
  AccountingCategory,
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  FinanceDocumentType,
  PaymentMethod,
  Prisma,
  Role,
  SupplierServiceType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import {
  deleteFinanceFile,
  saveFinanceFile,
} from "@/lib/storage/finansFileStorage";

type Context = {
  params: Promise<{
    id: string;
    paymentId: string;
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
  value:
    | FormDataEntryValue
    | null,
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
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

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
      ) ||
    "supplier-payment-proof";

  const safeExtension =
    extension
      .toLowerCase()
      .replace(
        /[^a-z0-9.]/g,
        "",
      );

  return `${safeBase}${safeExtension}`;
}

function safeResponseFileName(
  value: string,
) {
  return (
    value
      .replace(
        /[\r\n"]/g,
        "",
      )
      .trim() ||
    "supplier-payment-proof"
  );
}

function isHttpUrl(
  value: string,
) {
  return /^https?:\/\//i.test(
    value,
  );
}

function resolveLocalAccountingPath(
  storagePath: string,
) {
  if (
    !storagePath.startsWith(
      "/uploads/accounting/",
    )
  ) {
    return null;
  }

  const publicRoot =
    path.resolve(
      process.cwd(),
      "public",
    );

  const absolutePath =
    path.resolve(
      publicRoot,
      storagePath.replace(
        /^\/+/,
        "",
      ),
    );

  const accountingRoot =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      "accounting",
    );

  const relativeToRoot =
    path.relative(
      accountingRoot,
      absolutePath,
    );

  if (
    relativeToRoot.startsWith(
      "..",
    ) ||
    path.isAbsolute(
      relativeToRoot,
    )
  ) {
    return null;
  }

  return absolutePath;
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

function revalidateSupplierFinance(
  payableId: string,
) {
  revalidatePath(
    `/admin/supplier-payables/${payableId}`,
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
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: Context,
) {
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
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      id,
      paymentId,
    } = await params;

    const payment =
      await db.supplierPayablePayment.findFirst({
        where: {
          id:
            paymentId,

          payableId:
            id,
        },

        select: {
          id: true,

          documents: {
            where: {
              type:
                FinanceDocumentType.SUPPLIER_PAYMENT_PROOF,
            },

            orderBy: {
              createdAt:
                "desc",
            },

            take: 1,

            select: {
              originalFileName:
                true,

              storagePath:
                true,

              mimeType:
                true,
            },
          },
        },
      });

    if (!payment) {
      return NextResponse.json(
        {
          error:
            "Supplier payment not found.",
        },
        {
          status: 404,
        },
      );
    }

    const document =
      payment.documents[0] ??
      null;

    if (!document) {
      return NextResponse.json(
        {
          error:
            "No payment proof is attached.",
        },
        {
          status: 404,
        },
      );
    }

    const downloadName =
      safeResponseFileName(
        document.originalFileName,
      );

    const encodedName =
      encodeURIComponent(
        downloadName,
      );

    if (
      isHttpUrl(
        document.storagePath,
      )
    ) {
      const blobResult =
        await get(
          document.storagePath,
          {
            access:
              "private",
          },
        );

      if (
        !blobResult ||
        blobResult.statusCode !==
          200 ||
        !blobResult.stream
      ) {
        return NextResponse.json(
          {
            error:
              "Supplier payment proof could not be found.",
          },
          {
            status: 404,
          },
        );
      }

      return new Response(
        blobResult.stream,
        {
          status: 200,

          headers: {
            "Content-Type":
              blobResult.blob
                .contentType ||
              document.mimeType ||
              "application/octet-stream",

            "Content-Disposition":
              `inline; filename="${downloadName}"; filename*=UTF-8''${encodedName}`,

            "Cache-Control":
              "private, no-store, max-age=0",

            Pragma:
              "no-cache",

            Expires:
              "0",

            "X-Content-Type-Options":
              "nosniff",
          },
        },
      );
    }

    const localPath =
      resolveLocalAccountingPath(
        document.storagePath,
      );

    if (!localPath) {
      return NextResponse.json(
        {
          error:
            "Unsupported supplier payment proof storage path.",
        },
        {
          status: 400,
        },
      );
    }

    const bytes =
      await fs.readFile(
        localPath,
      );

    return new Response(
      bytes,
      {
        status: 200,

        headers: {
          "Content-Type":
            document.mimeType ||
            "application/octet-stream",

          "Content-Disposition":
            `inline; filename="${downloadName}"; filename*=UTF-8''${encodedName}`,

          "Cache-Control":
            "private, no-store, max-age=0",

          Pragma:
            "no-cache",

          Expires:
            "0",

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "SUPPLIER_PAYMENT_PROOF_VIEW_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to open supplier payment proof.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: Context,
) {
  let uploadedStoragePath:
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
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      id,
      paymentId,
    } = await params;

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

    const proofValue =
      formData.get(
        "paymentProof",
      );

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
      amount.lte(0)
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

    const [
      payable,
      payment,
      bank,
    ] =
      await Promise.all([
        db.supplierPayable.findUnique({
          where: {
            id,
          },

          select: {
            id: true,
            title: true,
            supplierId:
              true,
            supplierNameSnapshot:
              true,
            currency:
              true,
            approvedAmount:
              true,
            creditAmount:
              true,
            bookingId:
              true,
            tourId:
              true,
            departureDateId:
              true,

            service: {
              select: {
                type:
                  true,
              },
            },
          },
        }),

        db.supplierPayablePayment.findFirst({
          where: {
            id:
              paymentId,

            payableId:
              id,
          },

          select: {
            id:
              true,

            amount:
              true,

            documents: {
              where: {
                type:
                  FinanceDocumentType.SUPPLIER_PAYMENT_PROOF,
              },

              orderBy: {
                createdAt:
                  "desc",
              },

              take: 1,

              select: {
                id:
                  true,

                storagePath:
                  true,
              },
            },

            bankTransactions: {
              where: {
                status:
                  BankTransactionStatus.POSTED,
              },

              orderBy: {
                createdAt:
                  "desc",
              },

              take: 1,

              select: {
                id:
                  true,
              },
            },
          },
        }),

        db.bankAccount.findUnique({
          where: {
            id:
              bankAccountId,
          },

          select: {
            id:
              true,

            name:
              true,

            currency:
              true,

            isActive:
              true,
          },
        }),
      ]);

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

    if (!payment) {
      return NextResponse.json(
        {
          error:
            "Supplier payment not found.",
        },
        {
          status: 404,
        },
      );
    }

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

    const otherPayments =
      await db.supplierPayablePayment.aggregate({
        where: {
          payableId:
            id,

          id: {
            not:
              paymentId,
          },
        },

        _sum: {
          amount:
            true,
        },
      });

    const otherPaid =
      new Prisma.Decimal(
        otherPayments
          ._sum
          .amount ?? 0,
      );

    const netApproved =
      payable.approvedAmount.minus(
        payable.creditAmount,
      );

    if (
      otherPaid
        .plus(
          amount,
        )
        .gt(
          netApproved,
        )
    ) {
      return NextResponse.json(
        {
          error:
            "The corrected payment would make total supplier payments exceed the approved payable amount.",
        },
        {
          status: 400,
        },
      );
    }

    let paymentProof:
      | File
      | null = null;

    if (
      proofValue instanceof
        File &&
      proofValue.size > 0
    ) {
      paymentProof =
        proofValue;

      const extension =
        path
          .extname(
            paymentProof.name,
          )
          .toLowerCase();

      if (
        !ALLOWED_EXTENSIONS.has(
          extension,
        ) ||
        (
          paymentProof.type &&
          !ALLOWED_FILE_TYPES.has(
            paymentProof.type,
          )
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

    let savedFile:
      | {
          originalFileName:
            string;

          storedFileName:
            string;

          storagePath:
            string;
        }
      | null = null;

    if (paymentProof) {
      savedFile =
        await saveFinanceFile({
          file:
            paymentProof,

          year:
            accountingYear,

          month:
            accountingMonth,

          safeFileName:
            sanitizeFileName(
              paymentProof.name ||
                "supplier-payment-proof",
            ),
        });

      uploadedStoragePath =
        savedFile.storagePath;
    }

    const existingDocument =
      payment.documents[0] ??
      null;

    const existingBankTransaction =
      payment.bankTransactions[0] ??
      null;

    const previousStoragePath =
      existingDocument?.storagePath ??
      null;

    await db.$transaction(
      async (tx) => {
        const updatedPayment =
          await tx.supplierPayablePayment.update({
            where: {
              id:
                paymentId,
            },

            data: {
              bankAccountId:
                bank.id,

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

        let ledgerTransactionId:
          | string
          | null =
          existingBankTransaction?.id ??
          null;

        if (
          existingBankTransaction
        ) {
          const ledger =
            await tx.bankTransaction.update({
              where: {
                id:
                  existingBankTransaction.id,
              },

              data: {
                bankAccountId:
                  bank.id,

                amount,

                currency:
                  payable.currency,

                transactionDate:
                  paymentDate,

                reference,

                description:
                  `${payable.supplierNameSnapshot} - ${payable.title}`,

                notes,

                status:
                  BankTransactionStatus.POSTED,

                direction:
                  BankTransactionDirection.OUT,

                type:
                  BankTransactionType.SUPPLIER_PAYMENT,
              },

              select: {
                id:
                  true,
              },
            });

          ledgerTransactionId =
            ledger.id;
        } else {
          const ledger =
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
                  updatedPayment.id,

                bookingId:
                  payable.bookingId,

                tourId:
                  payable.tourId,

                departureDateId:
                  payable.departureDateId,
              },

              select: {
                id:
                  true,
              },
            });

          ledgerTransactionId =
            ledger.id;
        }

        if (
          paymentProof &&
          savedFile
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
                id:
                  true,
              },
            });

          const documentData = {
            type:
              FinanceDocumentType.SUPPLIER_PAYMENT_PROOF,

            title:
              reference
                ? `Supplier Payment Proof - ${reference}`
                : `Supplier Payment Proof - ${payable.title}`,

            description:
              notes ??
              `Payment proof for ${payable.supplierNameSnapshot} - ${payable.title}`,

            originalFileName:
              savedFile.originalFileName,

            storedFileName:
              savedFile.storedFileName,

            storagePath:
              savedFile.storagePath,

            mimeType:
              paymentProof.type ||
              "application/octet-stream",

            fileSize:
              paymentProof.size,

            documentDate:
              paymentDate,

            referenceNumber:
              reference,

            accountingCategory:
              AccountingCategory.EXPENSES_PURCHASES,

            accountingSubcategory:
              `${accountingSubcategory} - Payment Proof`,

            accountingPeriodId:
              accountingPeriod.id,

            supplierPayableId:
              payable.id,

            supplierPayablePaymentId:
              paymentId,

            bankTransactionId:
              ledgerTransactionId,

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
          };

          if (
            existingDocument
          ) {
            await tx.financeDocument.update({
              where: {
                id:
                  existingDocument.id,
              },

              data:
                documentData,
            });
          } else {
            await tx.financeDocument.create({
              data:
                documentData,
            });
          }
        }

        const total =
          await tx.supplierPayablePayment.aggregate({
            where: {
              payableId:
                payable.id,
            },

            _sum: {
              amount:
                true,
            },
          });

        const nextAmountPaid =
          new Prisma.Decimal(
            total._sum.amount ??
              0,
          );

        const nextBalance =
          Prisma.Decimal.max(
            new Prisma.Decimal(
              0,
            ),

            netApproved.minus(
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
      },
    );

    uploadedStoragePath =
      null;

    if (
      paymentProof &&
      previousStoragePath &&
      savedFile &&
      previousStoragePath !==
        savedFile.storagePath
    ) {
      await deleteFinanceFile(
        previousStoragePath,
      ).catch(
        (cleanupError) => {
          console.error(
            "SUPPLIER_PAYMENT_OLD_PROOF_CLEANUP_ERROR",
            cleanupError,
          );
        },
      );
    }

    revalidateSupplierFinance(
      id,
    );

    return NextResponse.json({
      success:
        true,
    });
  } catch (error) {
    if (
      uploadedStoragePath
    ) {
      await deleteFinanceFile(
        uploadedStoragePath,
      ).catch(
        () => undefined,
      );
    }

    console.error(
      "UPDATE_SUPPLIER_PAYMENT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update supplier payment.",
      },
      {
        status: 400,
      },
    );
  }
}
