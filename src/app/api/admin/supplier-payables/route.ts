import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  FinanceDocumentType,
  Prisma,
} from "@prisma/client";
import { del, put } from "@vercel/blob";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

function stringValue(
  value: FormDataEntryValue | null,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed || null;
}

function decimalValue(
  value: FormDataEntryValue | null,
  required = false,
): Prisma.Decimal | null {
  const text =
    stringValue(value);

  if (!text) {
    if (required) {
      throw new Error(
        "Required amount is missing.",
      );
    }

    return null;
  }

  const amount =
    new Prisma.Decimal(text);

  if (amount.isNegative()) {
    throw new Error(
      "Amounts cannot be negative.",
    );
  }

  return amount;
}

function dateValue(
  value: FormDataEntryValue | null,
) {
  const text =
    stringValue(value);

  if (!text) {
    return null;
  }

  const result =
    new Date(
      `${text}T12:00:00.000Z`,
    );

  if (
    Number.isNaN(
      result.getTime(),
    )
  ) {
    throw new Error(
      "Invalid date.",
    );
  }

  return result;
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

    const form =
      await request.formData();

    // ========================================================
    // SUPPLIER / SERVICE / RATE
    // ========================================================

    const supplierId =
      stringValue(
        form.get(
          "supplierId",
        ),
      );

    const serviceId =
      stringValue(
        form.get(
          "serviceId",
        ),
      );

    const rateId =
      stringValue(
        form.get(
          "rateId",
        ),
      );

    const title =
      stringValue(
        form.get("title"),
      );

    const currency =
      stringValue(
        form.get(
          "currency",
        ),
      )?.toUpperCase() ||
      "EUR";

    if (
      !supplierId ||
      !title
    ) {
      return NextResponse.json(
        {
          error:
            "Supplier and title are required.",
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // AMOUNTS
    // ========================================================

    const approvedAmount =
      decimalValue(
        form.get(
          "approvedAmount",
        ),
        true,
      );

    if (
      !approvedAmount ||
      approvedAmount.lte(0)
    ) {
      return NextResponse.json(
        {
          error:
            "Approved amount must be greater than zero.",
        },
        {
          status: 400,
        },
      );
    }

    const contractedAmount =
      decimalValue(
        form.get(
          "contractedAmount",
        ),
      );

    const creditAmount =
      decimalValue(
        form.get(
          "creditAmount",
        ),
      ) ??
      new Prisma.Decimal(0);

    if (
      creditAmount.gt(
        approvedAmount,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Credit amount cannot exceed the approved amount.",
        },
        {
          status: 400,
        },
      );
    }

    const balance =
      Prisma.Decimal.max(
        new Prisma.Decimal(0),
        approvedAmount.minus(
          creditAmount,
        ),
      );

    // ========================================================
    // SUPPLIER
    // ========================================================

    const supplier =
      await db.supplier.findUnique({
        where: {
          id: supplierId,
        },

        select: {
          id: true,
          name: true,
        },
      });

    if (!supplier) {
      return NextResponse.json(
        {
          error:
            "Supplier not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ========================================================
    // SERVICE
    // ========================================================

    const service =
      serviceId
        ? await db.supplierService.findFirst({
            where: {
              id: serviceId,
              supplierId,
            },

            select: {
              id: true,
              name: true,
            },
          })
        : null;

    if (
      serviceId &&
      !service
    ) {
      return NextResponse.json(
        {
          error:
            "Selected service does not belong to this supplier.",
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // RATE
    // ========================================================

    const rate =
      rateId
        ? await db.supplierRate.findFirst({
            where: {
              id: rateId,
              supplierId,
            },

            select: {
              id: true,
              name: true,
              serviceId: true,
            },
          })
        : null;

    if (
      rateId &&
      !rate
    ) {
      return NextResponse.json(
        {
          error:
            "Selected rate does not belong to this supplier.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      rate?.serviceId &&
      serviceId &&
      rate.serviceId !==
        serviceId
    ) {
      return NextResponse.json(
        {
          error:
            "Selected rate does not match the selected service.",
        },
        {
          status: 400,
        },
      );
    }

    // ========================================================
    // TOUR / DEPARTURE / BOOKING
    // ========================================================

    const tourId =
      stringValue(
        form.get("tourId"),
      );

    const departureDateId =
      stringValue(
        form.get(
          "departureDateId",
        ),
      );

    const bookingId =
      stringValue(
        form.get(
          "bookingId",
        ),
      );

    if (departureDateId) {
      const departure =
        await db.departureDate.findUnique({
          where: {
            id:
              departureDateId,
          },

          select: {
            tourId: true,
          },
        });

      if (!departure) {
        return NextResponse.json(
          {
            error:
              "Departure not found.",
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
              "Departure does not belong to the selected tour.",
          },
          {
            status: 400,
          },
        );
      }
    }

    if (bookingId) {
      const booking =
        await db.booking.findUnique({
          where: {
            id: bookingId,
          },

          select: {
            id: true,
          },
        });

      if (!booking) {
        return NextResponse.json(
          {
            error:
              "Booking not found.",
          },
          {
            status: 404,
          },
        );
      }
    }

    // ========================================================
    // INVOICE DETAILS
    // ========================================================

    const supplierInvoiceNumber =
      stringValue(
        form.get(
          "supplierInvoiceNumber",
        ),
      );

    const supplierReference =
      stringValue(
        form.get(
          "supplierReference",
        ),
      );

    const invoiceDate =
      dateValue(
        form.get(
          "invoiceDate",
        ),
      );

    const dueDate =
      dateValue(
        form.get(
          "dueDate",
        ),
      );

    const description =
      stringValue(
        form.get(
          "description",
        ),
      );

    const internalNotes =
      stringValue(
        form.get(
          "internalNotes",
        ),
      );

    const submitForApproval =
      stringValue(
        form.get(
          "submitForApproval",
        ),
      ) === "true";

    // ========================================================
    // FILE VALIDATION
    // ========================================================

    const invoiceFile =
      form.get(
        "invoiceFile",
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
      invoiceFile &&
      typeof invoiceFile !==
        "string" &&
      invoiceFile.size > 0
    ) {
      if (
        !ALLOWED_FILE_TYPES.has(
          invoiceFile.type,
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
        invoiceFile.size >
        MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              "Invoice file must be smaller than 10 MB.",
          },
          {
            status: 400,
          },
        );
      }

      originalFileName =
        invoiceFile.name ||
        "supplier-invoice";

      const safeFileName =
        sanitizeFileName(
          originalFileName,
        ) ||
        "supplier-invoice";

      blob = await put(
        `finance/suppliers/${Date.now()}-${safeFileName}`,
        invoiceFile,
        {
          access: "private",

          addRandomSuffix:
            true,

          contentType:
            invoiceFile.type ||
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
    // CREATE PAYABLE + DOCUMENT
    // ========================================================

    const result =
      await db.$transaction(
        async (tx) => {
          const payable =
            await tx.supplierPayable.create({
              data: {
                supplierId,

                serviceId:
                  service?.id ??
                  null,

                rateId:
                  rate?.id ??
                  null,

                tourId,
                departureDateId,
                bookingId,

                createdById:
                  session.user.id,

                title,
                description,

                supplierInvoiceNumber,
                supplierReference,

                invoiceDate,
                dueDate,

                currency,

                contractedAmount,
                approvedAmount,
                creditAmount,

                amountPaid:
                  new Prisma.Decimal(
                    0,
                  ),

                balance,

                approvalStatus:
                  submitForApproval
                    ? "PENDING_APPROVAL"
                    : "DRAFT",

                paymentStatus:
                  "UNPAID",

                /*
                 * Legacy field retained for
                 * old/manual records only.
                 *
                 * New uploads go through
                 * FinanceDocument.
                 */
                documentUrl:
                  null,

                internalNotes,

                supplierNameSnapshot:
                  supplier.name,

                serviceNameSnapshot:
                  service?.name ??
                  null,

                rateNameSnapshot:
                  rate?.name ??
                  null,
              },
            });

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
            financeDocument =
              await tx.financeDocument.create({
                data: {
                  type:
                    FinanceDocumentType.SUPPLIER_INVOICE,

                  title:
                    supplierInvoiceNumber
                      ? `Supplier Invoice ${supplierInvoiceNumber} – ${title}`
                      : `Supplier Invoice – ${title}`,

                  description,

                  originalFileName,

                  storedFileName,

                  storagePath:
                    blob.pathname,

                  mimeType:
                    invoiceFile &&
                    typeof invoiceFile !==
                      "string"
                      ? invoiceFile.type ||
                        "application/octet-stream"
                      : "application/octet-stream",

                  fileSize:
                    invoiceFile &&
                    typeof invoiceFile !==
                      "string"
                      ? invoiceFile.size
                      : 0,

                  documentDate:
                    invoiceDate,

                  referenceNumber:
                    supplierInvoiceNumber ??
                    supplierReference,

                  supplierPayableId:
                    payable.id,

                  supplierId,

                  bookingId,

                  tourId,

                  departureDateId,

                  uploadedById:
                    session.user.id,
                },
              });
          }

          return {
            payable,
            financeDocument,
          };
        },
      );

    return NextResponse.json(
      {
        success: true,

        payable:
          result.payable,

        financeDocument:
          result.financeDocument,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    /*
     * If Blob upload succeeded but database
     * creation failed, remove the orphaned file.
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
          "SUPPLIER_PAYABLE_BLOB_CLEANUP_ERROR",
          cleanupError,
        );
      }
    }

    console.error(
      "CREATE_SUPPLIER_PAYABLE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create supplier payable.",
      },
      {
        status: 400,
      },
    );
  }
}