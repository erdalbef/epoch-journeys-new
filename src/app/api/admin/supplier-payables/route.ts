import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  AccountingCategory,
  FinanceDocumentType,
  Prisma,
  SupplierServiceType,
} from "@prisma/client";
import {
  mkdir,
  unlink,
  writeFile,
} from "fs/promises";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

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
    typeof value !== "string"
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
  const extension =
    path.extname(fileName);

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
      .replace(/-+/g, "-")
      .slice(0, 120);

  const safeExtension =
    extension
      .toLowerCase()
      .replace(
        /[^a-z0-9.]/g,
        "",
      );

  return `${
    safeBase ||
    "supplier-invoice"
  }${safeExtension}`;
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
) {
  let absoluteUploadedFilePath:
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
              type: true,
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
    // FILE
    // ========================================================

    const invoiceFile =
      form.get(
        "invoiceFile",
      );

    let file:
      | File
      | null = null;

    if (
      invoiceFile instanceof
        File &&
      invoiceFile.size > 0
    ) {
      file = invoiceFile;
    }

    /*
     * An invoice file requires a service.
     *
     * This gives Accounting a reliable
     * automatic classification.
     */
    if (
      file &&
      !service
    ) {
      return NextResponse.json(
        {
          error:
            "Please select the supplier service before attaching an invoice.",
        },
        {
          status: 400,
        },
      );
    }

    if (file) {
      const extension =
        path
          .extname(
            file.name,
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
              "Only PDF, JPG, PNG and WEBP files are allowed.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        file.type &&
        !ALLOWED_FILE_TYPES.has(
          file.type,
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
        file.size >
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
    }

    // ========================================================
    // ACCOUNTING PERIOD
    // ========================================================

    /*
     * Supplier invoice accounting month
     * follows its invoice date.
     *
     * If no invoice date is entered,
     * the current date is used.
     */
    const accountingDate =
      invoiceDate ??
      new Date();

    const accountingYear =
      accountingDate.getUTCFullYear();

    const accountingMonth =
      accountingDate.getUTCMonth() +
      1;

    const accountingSubcategory =
      accountingSubcategoryForService(
        service?.type ?? null,
      );

    // ========================================================
    // STORE FILE LOCALLY
    // ========================================================

    let originalFileName:
      | string
      | null = null;

    let storedFileName:
      | string
      | null = null;

    let storagePath:
      | string
      | null = null;

    if (file) {
      originalFileName =
        file.name ||
        "supplier-invoice";

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

      /*
       * Use exactly the same physical
       * accounting storage family as
       * manual Accounting uploads.
       */
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
          recursive: true,
        },
      );

      absoluteUploadedFilePath =
        path.join(
          absoluteFolder,
          storedFileName,
        );

      const bytes =
        await file.arrayBuffer();

      await writeFile(
        absoluteUploadedFilePath,
        Buffer.from(bytes),
      );

      storagePath =
        `/${relativeFolder
          .split(path.sep)
          .join("/")}/${storedFileName}`;
    }

    // ========================================================
    // CREATE PAYABLE + FINANCE DOCUMENT
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
                 * Legacy field retained
                 * for old/manual records.
                 *
                 * New supplier invoice
                 * files are represented by
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
            file &&
            originalFileName &&
            storedFileName &&
            storagePath
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

            financeDocument =
              await tx.financeDocument.create({
                data: {
                  type:
                    FinanceDocumentType.SUPPLIER_INVOICE,

                  title:
                    supplierInvoiceNumber
                      ? `Supplier Invoice ${supplierInvoiceNumber} - ${title}`
                      : `Supplier Invoice - ${title}`,

                  description,

                  originalFileName,

                  storedFileName,

                  storagePath,

                  mimeType:
                    file.type ||
                    "application/octet-stream",

                  fileSize:
                    file.size,

                  documentDate:
                    invoiceDate ??
                    accountingDate,

                  referenceNumber:
                    supplierInvoiceNumber ??
                    supplierReference,

                  accountingCategory:
                    AccountingCategory.EXPENSES_PURCHASES,

                  accountingSubcategory,

                  accountingPeriodId:
                    accountingPeriod.id,

                  supplierPayableId:
                    payable.id,

                  supplierId,

                  bookingId,

                  tourId,

                  departureDateId,

                  uploadedById:
                    session.user.id,
                },

                select: {
                  id: true,
                },
              });
          }

          return {
            payable,
            financeDocument,
          };
        },
      );

    /*
     * Database creation succeeded.
     * The physical file now belongs to
     * the created FinanceDocument, so
     * prevent catch cleanup.
     */
    absoluteUploadedFilePath =
      null;

    return NextResponse.json(
      {
        success: true,

        payable:
          result.payable,

        financeDocument:
          result.financeDocument,

        accounting: {
          category:
            AccountingCategory.EXPENSES_PURCHASES,

          subcategory:
            accountingSubcategory,

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
    /*
     * If the physical file was written
     * but database creation failed,
     * remove the orphaned file.
     */
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
          "SUPPLIER_PAYABLE_FILE_CLEANUP_ERROR",
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