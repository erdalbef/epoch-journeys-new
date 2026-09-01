import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import {
  AccountingCategory,
  FinanceDocumentType,
  Prisma,
  SupplierPayableDocumentType,
  SupplierServiceType,
} from "@prisma/client";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { deleteFinanceFile, saveFinanceFile } from "@/lib/storage/finansFileStorage";

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

function createInternalReference() {
  const year =
    new Date().getUTCFullYear();

  const stamp =
    Date.now()
      .toString(36)
      .toUpperCase();

  const random =
    crypto.randomUUID()
      .replaceAll("-", "")
      .slice(0, 6)
      .toUpperCase();

  return `SP-${year}-${stamp}-${random}`;
}

export async function POST(
  request: Request,
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

    const agencyGroupName =
      stringValue(
        form.get(
          "agencyGroupName",
        ),
      );

    const currency =
      stringValue(
        form.get(
          "currency",
        ),
      )?.toUpperCase() ||
      "EUR";

    const documentTypeText =
      stringValue(
        form.get(
          "documentType",
        ),
      ) ||
      SupplierPayableDocumentType.FINAL_INVOICE;

    if (
      !Object.values(
        SupplierPayableDocumentType,
      ).includes(
        documentTypeText as SupplierPayableDocumentType,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid supplier document type." },
        { status: 400 },
      );
    }

    const documentType =
      documentTypeText as SupplierPayableDocumentType;

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

    let creditAmount =
      decimalValue(
        form.get(
          "creditAmount",
        ),
      ) ??
      new Prisma.Decimal(0);

    if (
      documentType ===
      SupplierPayableDocumentType.CREDIT_NOTE
    ) {
      creditAmount =
        approvedAmount;
    }

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

    const baseAccountingSubcategory =
      accountingSubcategoryForService(
        service?.type ?? null,
      );

    const accountingSubcategory =
      documentType === SupplierPayableDocumentType.PROFORMA
        ? `Supplier Proforma / ${baseAccountingSubcategory}`
        : documentType === SupplierPayableDocumentType.DEPOSIT_INVOICE
          ? `Supplier Deposit Invoice / ${baseAccountingSubcategory}`
          : documentType === SupplierPayableDocumentType.CREDIT_NOTE
            ? `Supplier Credit Note / ${baseAccountingSubcategory}`
            : baseAccountingSubcategory;

    const financeDocumentType =
      documentType === SupplierPayableDocumentType.CREDIT_NOTE
        ? FinanceDocumentType.SUPPLIER_CREDIT_NOTE
        : documentType === SupplierPayableDocumentType.PROFORMA
          ? FinanceDocumentType.OTHER
          : FinanceDocumentType.SUPPLIER_INVOICE;

    const accountingCategory =
      documentType === SupplierPayableDocumentType.PROFORMA
        ? AccountingCategory.OTHER_DOCUMENTS
        : AccountingCategory.EXPENSES_PURCHASES;

    // ========================================================
    // STORE FILE (VERCEL BLOB IN PRODUCTION)
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
      const savedFile =
        await saveFinanceFile({
          file,
          year:
            accountingYear,
          month:
            accountingMonth,
          safeFileName:
            sanitizeFileName(
              file.name ||
                "supplier-invoice",
            ),
        });

      originalFileName =
        savedFile.originalFileName;

      storedFileName =
        savedFile.storedFileName;

      storagePath =
        savedFile.storagePath;

      uploadedStoragePath =
        savedFile.storagePath;
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

                internalReference:
                  createInternalReference(),

                documentType,

                title,
                description,
                agencyGroupName,

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
                    financeDocumentType,

                  title:
                    supplierInvoiceNumber
                      ? `${documentType.replaceAll("_", " ")} ${supplierInvoiceNumber} - ${title}`
                      : `${documentType.replaceAll("_", " ")} - ${title}`,

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

                  accountingCategory,

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
    uploadedStoragePath =
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
      uploadedStoragePath
    ) {
      try {
        await deleteFinanceFile(
          uploadedStoragePath,
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

type SupplierPayableRouteContext = {
  params: Promise<{ id: string }>;
};

type SupplierPayableAction =
  | "submit"
  | "approve"
  | "reject"
  | "cancel";

function paymentStatusForPayable(
  balance: Prisma.Decimal,
  dueDate: Date | null,
) {
  if (balance.lte(0)) {
    return "PAID" as const;
  }

  if (
    dueDate &&
    dueDate.getTime() < Date.now()
  ) {
    return "OVERDUE" as const;
  }

  return "UNPAID" as const;
}

function paymentStatusAfterEdit({
  approvalStatus,
  balance,
  amountPaid,
  dueDate,
}: {
  approvalStatus: string;
  balance: Prisma.Decimal;
  amountPaid: Prisma.Decimal;
  dueDate: Date | null;
}) {
  if (approvalStatus === "CANCELLED") {
    return "CANCELLED" as const;
  }

  if (balance.lte(0)) {
    return "PAID" as const;
  }

  if (
    dueDate &&
    dueDate.getTime() < Date.now()
  ) {
    return "OVERDUE" as const;
  }

  if (amountPaid.gt(0)) {
    return "PARTIALLY_PAID" as const;
  }

  return "UNPAID" as const;
}

export async function PUT(
  request: Request,
  { params }: SupplierPayableRouteContext,
) {
  let uploadedStoragePath: string | null = null;
  let oldStoragePathToDelete: string | null = null;

  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { id } = await params;

    const existing =
      await db.supplierPayable.findUnique({
        where: { id },
        select: {
          id: true,
          supplierId: true,
          currency: true,
          approvalStatus: true,
          amountPaid: true,
          payments: {
            select: {
              amount: true,
            },
          },
          documents: {
            where: {
              supplierPayablePaymentId: null,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              id: true,
              storagePath: true,
            },
          },
        },
      });

    if (!existing) {
      return NextResponse.json(
        { error: "Payable not found." },
        { status: 404 },
      );
    }

    if (
      existing.approvalStatus ===
      "CANCELLED"
    ) {
      return NextResponse.json(
        {
          error:
            "Cancelled payables cannot be edited. Delete the cancelled payable or create a new payable.",
        },
        { status: 409 },
      );
    }

    const form =
      await request.formData();

    const supplierId =
      stringValue(
        form.get("supplierId"),
      );

    const serviceId =
      stringValue(
        form.get("serviceId"),
      );

    const rateId =
      stringValue(
        form.get("rateId"),
      );

    const title =
      stringValue(
        form.get("title"),
      );

    const agencyGroupName =
      stringValue(
        form.get(
          "agencyGroupName",
        ),
      );

    const currency =
      stringValue(
        form.get("currency"),
      )?.toUpperCase() || "EUR";

    const documentTypeText =
      stringValue(
        form.get("documentType"),
      ) ||
      SupplierPayableDocumentType.FINAL_INVOICE;

    if (
      !Object.values(
        SupplierPayableDocumentType,
      ).includes(
        documentTypeText as SupplierPayableDocumentType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid supplier document type.",
        },
        { status: 400 },
      );
    }

    const documentType =
      documentTypeText as SupplierPayableDocumentType;

    if (!supplierId || !title) {
      return NextResponse.json(
        {
          error:
            "Supplier and title are required.",
        },
        { status: 400 },
      );
    }

    const approvedAmount =
      decimalValue(
        form.get("approvedAmount"),
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
        { status: 400 },
      );
    }

    const contractedAmount =
      decimalValue(
        form.get(
          "contractedAmount",
        ),
      );

    let creditAmount =
      decimalValue(
        form.get("creditAmount"),
      ) ?? new Prisma.Decimal(0);

    if (
      documentType ===
      SupplierPayableDocumentType.CREDIT_NOTE
    ) {
      creditAmount = approvedAmount;
    }

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
        { status: 400 },
      );
    }

    const paidAmount =
      existing.payments.reduce(
        (sum, payment) =>
          sum.plus(payment.amount),
        new Prisma.Decimal(0),
      );

    const liability =
      Prisma.Decimal.max(
        new Prisma.Decimal(0),
        approvedAmount.minus(
          creditAmount,
        ),
      );

    if (
      liability.lt(paidAmount)
    ) {
      return NextResponse.json(
        {
          error: `The corrected payable total cannot be lower than the amount already paid (${paidAmount.toFixed(2)} ${existing.currency}).`,
        },
        { status: 409 },
      );
    }

    if (
      paidAmount.gt(0) &&
      currency !== existing.currency
    ) {
      return NextResponse.json(
        {
          error:
            "Currency cannot be changed after a supplier payment has been recorded.",
        },
        { status: 409 },
      );
    }

    if (
      paidAmount.gt(0) &&
      supplierId !==
        existing.supplierId
    ) {
      return NextResponse.json(
        {
          error:
            "Supplier cannot be changed after a supplier payment has been recorded. Other payable details and amounts can still be corrected.",
        },
        { status: 409 },
      );
    }

    if (
      paidAmount.gt(0) &&
      documentType ===
        SupplierPayableDocumentType.CREDIT_NOTE
    ) {
      return NextResponse.json(
        {
          error:
            "A payable with recorded payments cannot be converted into a credit note.",
        },
        { status: 409 },
      );
    }

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
        { error: "Supplier not found." },
        { status: 404 },
      );
    }

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
        { status: 400 },
      );
    }

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

    if (rateId && !rate) {
      return NextResponse.json(
        {
          error:
            "Selected rate does not belong to this supplier.",
        },
        { status: 400 },
      );
    }

    if (
      rate?.serviceId &&
      serviceId &&
      rate.serviceId !== serviceId
    ) {
      return NextResponse.json(
        {
          error:
            "Selected rate does not match the selected service.",
        },
        { status: 400 },
      );
    }

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
        form.get("bookingId"),
      );

    if (departureDateId) {
      const departure =
        await db.departureDate.findUnique({
          where: {
            id: departureDateId,
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
          { status: 404 },
        );
      }

      if (
        tourId &&
        departure.tourId !== tourId
      ) {
        return NextResponse.json(
          {
            error:
              "Departure does not belong to the selected tour.",
          },
          { status: 400 },
        );
      }
    }

    if (bookingId) {
      const booking =
        await db.booking.findUnique({
          where: { id: bookingId },
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
          { status: 404 },
        );
      }
    }

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
        form.get("invoiceDate"),
      );

    const dueDate =
      dateValue(
        form.get("dueDate"),
      );

    const description =
      stringValue(
        form.get("description"),
      );

    const internalNotes =
      stringValue(
        form.get("internalNotes"),
      );

    const removeExistingDocument =
      stringValue(
        form.get(
          "removeExistingDocument",
        ),
      ) === "true";

    const invoiceFile =
      form.get("invoiceFile");

    let file: File | null = null;

    if (
      invoiceFile instanceof File &&
      invoiceFile.size > 0
    ) {
      file = invoiceFile;
    }

    if (file && !service) {
      return NextResponse.json(
        {
          error:
            "Please select the supplier service before attaching an invoice.",
        },
        { status: 400 },
      );
    }

    if (file) {
      const extension =
        path.extname(file.name)
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
          { status: 400 },
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
          { status: 400 },
        );
      }

      if (
        file.size > MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              "Invoice file must be smaller than 10 MB.",
          },
          { status: 400 },
        );
      }
    }

    const balance =
      Prisma.Decimal.max(
        new Prisma.Decimal(0),
        liability.minus(paidAmount),
      );

    const paymentStatus =
      paymentStatusAfterEdit({
        approvalStatus:
          existing.approvalStatus,
        balance,
        amountPaid: paidAmount,
        dueDate,
      });

    const accountingDate =
      invoiceDate ?? new Date();

    const accountingYear =
      accountingDate.getUTCFullYear();

    const accountingMonth =
      accountingDate.getUTCMonth() + 1;

    const baseAccountingSubcategory =
      accountingSubcategoryForService(
        service?.type ?? null,
      );

    const accountingSubcategory =
      documentType ===
      SupplierPayableDocumentType.PROFORMA
        ? `Supplier Proforma / ${baseAccountingSubcategory}`
        : documentType ===
            SupplierPayableDocumentType.DEPOSIT_INVOICE
          ? `Supplier Deposit Invoice / ${baseAccountingSubcategory}`
          : documentType ===
              SupplierPayableDocumentType.CREDIT_NOTE
            ? `Supplier Credit Note / ${baseAccountingSubcategory}`
            : baseAccountingSubcategory;

    const financeDocumentType =
      documentType ===
      SupplierPayableDocumentType.CREDIT_NOTE
        ? FinanceDocumentType.SUPPLIER_CREDIT_NOTE
        : documentType ===
            SupplierPayableDocumentType.PROFORMA
          ? FinanceDocumentType.OTHER
          : FinanceDocumentType.SUPPLIER_INVOICE;

    const accountingCategory =
      documentType ===
      SupplierPayableDocumentType.PROFORMA
        ? AccountingCategory.OTHER_DOCUMENTS
        : AccountingCategory.EXPENSES_PURCHASES;

    let savedFile:
      | {
          originalFileName: string;
          storedFileName: string;
          storagePath: string;
        }
      | null = null;

    if (file) {
      savedFile =
        await saveFinanceFile({
          file,
          year: accountingYear,
          month: accountingMonth,
          safeFileName:
            sanitizeFileName(
              file.name ||
                "supplier-invoice",
            ),
        });

      uploadedStoragePath =
        savedFile.storagePath;
    }

    const currentDocument =
      existing.documents[0] ?? null;

    await db.$transaction(
      async (tx) => {
        await tx.supplierPayable.update({
          where: { id },
          data: {
            supplierId,
            serviceId:
              service?.id ?? null,
            rateId:
              rate?.id ?? null,
            tourId,
            departureDateId,
            bookingId,
            documentType,
            title,
            description,
            agencyGroupName,
            supplierInvoiceNumber,
            supplierReference,
            invoiceDate,
            dueDate,
            currency,
            contractedAmount,
            approvedAmount,
            creditAmount,
            amountPaid: paidAmount,
            balance,
            paymentStatus,
            internalNotes,
            supplierNameSnapshot:
              supplier.name,
            serviceNameSnapshot:
              service?.name ?? null,
            rateNameSnapshot:
              rate?.name ?? null,
          },
        });

        const accountingPeriod =
          await tx.accountingPeriod.upsert({
            where: {
              year_month: {
                year: accountingYear,
                month: accountingMonth,
              },
            },
            update: {},
            create: {
              year: accountingYear,
              month: accountingMonth,
              dueDate: getDueDate(
                accountingYear,
                accountingMonth,
              ),
            },
            select: {
              id: true,
            },
          });

        const documentTitle =
          supplierInvoiceNumber
            ? `${documentType.replaceAll("_", " ")} ${supplierInvoiceNumber} - ${title}`
            : `${documentType.replaceAll("_", " ")} - ${title}`;

        if (
          removeExistingDocument &&
          !file &&
          currentDocument
        ) {
          oldStoragePathToDelete =
            currentDocument.storagePath;

          await tx.financeDocument.delete({
            where: {
              id: currentDocument.id,
            },
          });
        } else if (
          currentDocument
        ) {
          if (
            file &&
            savedFile
          ) {
            oldStoragePathToDelete =
              currentDocument.storagePath;
          }

          await tx.financeDocument.update({
            where: {
              id: currentDocument.id,
            },
            data: {
              type: financeDocumentType,
              title: documentTitle,
              description,
              documentDate:
                invoiceDate ??
                accountingDate,
              referenceNumber:
                supplierInvoiceNumber ??
                supplierReference,
              accountingCategory,
              accountingSubcategory,
              accountingPeriodId:
                accountingPeriod.id,
              supplierId,
              bookingId,
              tourId,
              departureDateId,
              ...(file && savedFile
                ? {
                    originalFileName:
                      savedFile.originalFileName,
                    storedFileName:
                      savedFile.storedFileName,
                    storagePath:
                      savedFile.storagePath,
                    mimeType:
                      file.type ||
                      "application/octet-stream",
                    fileSize: file.size,
                  }
                : {}),
            },
          });
        } else if (
          file &&
          savedFile
        ) {
          await tx.financeDocument.create({
            data: {
              type: financeDocumentType,
              title: documentTitle,
              description,
              originalFileName:
                savedFile.originalFileName,
              storedFileName:
                savedFile.storedFileName,
              storagePath:
                savedFile.storagePath,
              mimeType:
                file.type ||
                "application/octet-stream",
              fileSize: file.size,
              documentDate:
                invoiceDate ??
                accountingDate,
              referenceNumber:
                supplierInvoiceNumber ??
                supplierReference,
              accountingCategory,
              accountingSubcategory,
              accountingPeriodId:
                accountingPeriod.id,
              supplierPayableId: id,
              supplierId,
              bookingId,
              tourId,
              departureDateId,
              uploadedById:
                session.user.id,
            },
          });
        }
      },
    );

    uploadedStoragePath = null;

    if (
      oldStoragePathToDelete &&
      oldStoragePathToDelete !==
        savedFile?.storagePath
    ) {
      try {
        await deleteFinanceFile(
          oldStoragePathToDelete,
        );
      } catch (cleanupError) {
        console.error(
          "REPLACE_SUPPLIER_PAYABLE_FILE_CLEANUP_ERROR",
          cleanupError,
        );
      }
    }

    revalidatePath(
      `/admin/supplier-payables/${id}`,
    );
    revalidatePath(
      `/admin/supplier-payables/${id}/edit`,
    );
    revalidatePath(
      "/admin/supplier-payables",
    );
    revalidatePath(
      "/admin/finance",
    );
    revalidatePath(
      "/admin/accounting",
    );

    return NextResponse.json({
      success: true,
      payable: {
        id,
        balance:
          balance.toNumber(),
        amountPaid:
          paidAmount.toNumber(),
        paymentStatus,
      },
    });
  } catch (error) {
    if (uploadedStoragePath) {
      try {
        await deleteFinanceFile(
          uploadedStoragePath,
        );
      } catch (cleanupError) {
        console.error(
          "EDIT_SUPPLIER_PAYABLE_FILE_CLEANUP_ERROR",
          cleanupError,
        );
      }
    }

    console.error(
      "EDIT_SUPPLIER_PAYABLE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update supplier payable.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: SupplierPayableRouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { id } = await params;

    const body =
      (await request.json()) as {
        action?: SupplierPayableAction;
      };

    const payable =
      await db.supplierPayable.findUnique({
        where: { id },
        select: {
          id: true,
          approvalStatus: true,
          paymentStatus: true,
          balance: true,
          dueDate: true,
          amountPaid: true,
        },
      });

    if (!payable) {
      return NextResponse.json(
        { error: "Payable not found." },
        { status: 404 },
      );
    }

    const action = body.action;

    if (action === "submit") {
      if (
        payable.approvalStatus !==
        "DRAFT"
      ) {
        return NextResponse.json(
          {
            error:
              "Only draft payables can be submitted.",
          },
          { status: 400 },
        );
      }

      await db.supplierPayable.update({
        where: { id },
        data: {
          approvalStatus:
            "PENDING_APPROVAL",
        },
      });
    } else if (
      action === "approve"
    ) {
      if (
        payable.approvalStatus !==
        "PENDING_APPROVAL"
      ) {
        return NextResponse.json(
          {
            error:
              "Only payables awaiting approval can be approved.",
          },
          { status: 400 },
        );
      }

      await db.supplierPayable.update({
        where: { id },
        data: {
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
          approvedById:
            session.user.id,
          paymentStatus:
            paymentStatusForPayable(
              payable.balance,
              payable.dueDate,
            ),
        },
      });
    } else if (
      action === "reject"
    ) {
      if (
        payable.approvalStatus !==
        "PENDING_APPROVAL"
      ) {
        return NextResponse.json(
          {
            error:
              "Only payables awaiting approval can be rejected.",
          },
          { status: 400 },
        );
      }

      await db.supplierPayable.update({
        where: { id },
        data: {
          approvalStatus: "REJECTED",
        },
      });
    } else if (
      action === "cancel"
    ) {
      await db.supplierPayable.update({
        where: { id },
        data: {
          approvalStatus: "CANCELLED",
          paymentStatus: "CANCELLED",
          cancelledAt: new Date(),
        },
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 },
      );
    }

    revalidatePath(
      `/admin/supplier-payables/${id}`,
    );
    revalidatePath(
      "/admin/supplier-payables",
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "UPDATE_SUPPLIER_PAYABLE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update supplier payable.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: SupplierPayableRouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { id } = await params;

    const payable =
      await db.supplierPayable.findUnique({
        where: { id },
        select: {
          id: true,
          approvalStatus: true,
          documents: {
            select: {
              storagePath: true,
            },
          },
          payments: {
            select: {
              id: true,
              documents: {
                select: {
                  storagePath: true,
                },
              },
              bankTransactions: {
                select: {
                  id: true,
                  reversals: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!payable) {
      return NextResponse.json(
        { error: "Payable not found." },
        { status: 404 },
      );
    }

    if (
      payable.approvalStatus !==
      "CANCELLED"
    ) {
      return NextResponse.json(
        {
          error:
            "Only cancelled supplier payables can be permanently deleted.",
        },
        { status: 409 },
      );
    }

    const paymentIds =
      payable.payments.map(
        (payment) => payment.id,
      );

    const bankTransactionIds =
      payable.payments.flatMap(
        (payment) =>
          payment.bankTransactions.map(
            (transaction) =>
              transaction.id,
          ),
      );

    const reversalIds =
      payable.payments.flatMap(
        (payment) =>
          payment.bankTransactions.flatMap(
            (transaction) =>
              transaction.reversals
                ? [
                    transaction
                      .reversals.id,
                  ]
                : [],
          ),
      );

    const allBankTransactionIds = [
      ...bankTransactionIds,
      ...reversalIds,
    ];

    const storagePaths =
      Array.from(
        new Set(
          [
            ...payable.documents.map(
              (document) =>
                document.storagePath,
            ),
            ...payable.payments.flatMap(
              (payment) =>
                payment.documents.map(
                  (document) =>
                    document.storagePath,
                ),
            ),
          ].filter(
            (
              storagePath,
            ): storagePath is string =>
              Boolean(storagePath),
          ),
        ),
      );

    await db.$transaction(
      async (tx) => {
        if (
          allBankTransactionIds.length >
          0
        ) {
          await tx.bankStatementLine.updateMany({
            where: {
              matchedBankTransactionId: {
                in: allBankTransactionIds,
              },
            },
            data: {
              matchedBankTransactionId:
                null,
              matchedAt: null,
              matchStatus:
                "UNMATCHED",
            },
          });
        }

        await tx.financeDocument.deleteMany({
          where: {
            OR: [
              {
                supplierPayableId:
                  id,
              },
              ...(paymentIds.length >
              0
                ? [
                    {
                      supplierPayablePaymentId:
                        {
                          in: paymentIds,
                        },
                    },
                  ]
                : []),
              ...(allBankTransactionIds.length >
              0
                ? [
                    {
                      bankTransactionId:
                        {
                          in: allBankTransactionIds,
                        },
                    },
                  ]
                : []),
            ],
          },
        });

        if (
          reversalIds.length > 0
        ) {
          await tx.bankTransaction.deleteMany({
            where: {
              id: {
                in: reversalIds,
              },
            },
          });
        }

        if (
          bankTransactionIds.length >
          0
        ) {
          await tx.bankTransaction.deleteMany({
            where: {
              id: {
                in: bankTransactionIds,
              },
            },
          });
        }

        if (
          paymentIds.length > 0
        ) {
          await tx.supplierPayablePayment.deleteMany({
            where: {
              id: {
                in: paymentIds,
              },
            },
          });
        }

        await tx.supplierPayable.delete({
          where: { id },
        });
      },
    );

    for (
      const storagePath of
      storagePaths
    ) {
      try {
        await deleteFinanceFile(
          storagePath,
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "DELETE_SUPPLIER_PAYABLE_FILE_CLEANUP_ERROR",
          cleanupError,
        );
      }
    }

    revalidatePath(
      "/admin/supplier-payables",
    );
    revalidatePath(
      "/admin/finance",
    );
    revalidatePath(
      "/admin/accounting",
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE_SUPPLIER_PAYABLE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete supplier payable.",
      },
      { status: 500 },
    );
  }
}
