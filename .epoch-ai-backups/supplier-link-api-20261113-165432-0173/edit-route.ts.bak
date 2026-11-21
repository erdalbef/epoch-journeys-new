import crypto from "crypto";
import { readFile } from "fs/promises";
import path from "path";

import { del, put } from "@vercel/blob";
import {
  AccountingCategory,
  FinanceDocumentType,
  Role,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { readFinanceFile } from "@/lib/storage/finansFileStorage";

type Context = {
  params: Promise<{ id: string }>;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function cleanString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: FormDataEntryValue | null) {
  return cleanString(value) || null;
}

function parseDate(value: FormDataEntryValue | null) {
  const raw = cleanString(value);

  if (!raw) {
    return null;
  }

  const date = new Date(`${raw}T12:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function sanitizeBaseName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function extensionFromName(fileName: string) {
  const ext = path
    .extname(fileName)
    .toLowerCase();

  return ext
    ? ext.slice(0, 12)
    : "";
}

function buildStorageFolder(
  type: FinanceDocumentType
) {
  switch (type) {
    case FinanceDocumentType.EXPENSE_RECEIPT:
    case FinanceDocumentType.EXPENSE_INVOICE:
      return "expenses";

    case FinanceDocumentType.SUPPLIER_INVOICE:
    case FinanceDocumentType.SUPPLIER_CREDIT_NOTE:
    case FinanceDocumentType.SUPPLIER_PAYMENT_PROOF:
      return "suppliers";

    case FinanceDocumentType.CUSTOMER_PAYMENT_PROOF:
      return "customer-payments";

    case FinanceDocumentType.CUSTOMER_REFUND_PROOF:
      return "refunds";

    case FinanceDocumentType.BANK_STATEMENT:
    case FinanceDocumentType.BANK_TRANSFER_PROOF:
      return "banking";

    case FinanceDocumentType.TAX_DOCUMENT:
      return "tax";

    case FinanceDocumentType.CONTRACT:
    case FinanceDocumentType.AGREEMENT:
      return "contracts";

    case FinanceDocumentType.CREDIT_NOTE:
    case FinanceDocumentType.INVOICE:
      return "invoices";

    case FinanceDocumentType.PERSONAL_WITHDRAWAL:
      return "owner-personal";

    default:
      return "other";
  }
}

function accountingSubcategory(
  category: AccountingCategory
) {
  switch (category) {
    case AccountingCategory.OWNER_PERSONAL_PAYMENTS:
      return "Owner / Personal Payments";

    case AccountingCategory.OTHER_DOCUMENTS:
      return "Other Documents";

    case AccountingCategory.TRIP_GROUP_DOCUMENTATION:
      return "Trip / Group Documentation";

    default:
      return null;
  }
}

function getAccountingPeriodParts(
  value: Date
) {
  return {
    year: value.getUTCFullYear(),
    month:
      value.getUTCMonth() + 1,
  };
}

function isHttpUrl(value: string | null | undefined) {
  return Boolean(
    value &&
      /^https?:\/\//i.test(value)
  );
}

async function validateLinkedRecords(values: {
  expenseId: string | null;
  supplierPayableId: string | null;
  supplierPayablePaymentId: string | null;
  refundId: string | null;
  bankAccountId: string | null;
  bankTransactionId: string | null;
  bookingId: string | null;
  tourId: string | null;
  departureDateId: string | null;
  supplierId: string | null;
}) {
  const checks: Promise<boolean>[] = [];

  if (values.expenseId) {
    checks.push(
      db.expense
        .findUnique({
          where: {
            id: values.expenseId,
          },
          select: {
            id: true,
          },
        })
        .then(Boolean)
    );
  }

  if (values.supplierPayableId) {
    checks.push(
      db.supplierPayable
        .findUnique({
          where: {
            id: values.supplierPayableId,
          },
          select: {
            id: true,
          },
        })
        .then(Boolean)
    );
  }

  if (values.supplierPayablePaymentId) {
    checks.push(
      db.supplierPayablePayment
        .findUnique({
          where: {
            id:
              values.supplierPayablePaymentId,
          },
          select: {
            id: true,
          },
        })
        .then(Boolean)
    );
  }

  if (values.refundId) {
    checks.push(
      db.refund
        .findUnique({
          where: {
            id: values.refundId,
          },
          select: {
            id: true,
          },
        })
        .then(Boolean)
    );
  }

  if (values.bankAccountId) {
    checks.push(
      db.bankAccount
        .findUnique({
          where: {
            id: values.bankAccountId,
          },
          select: {
            id: true,
          },
        })
        .then(Boolean)
    );
  }

  if (values.bankTransactionId) {
    checks.push(
      db.bankTransaction
        .findUnique({
          where: {
            id: values.bankTransactionId,
          },
          select: {
            id: true,
          },
        })
        .then(Boolean)
    );
  }

  if (values.bookingId) {
    checks.push(
      db.booking
        .findUnique({
          where: {
            id: values.bookingId,
          },
          select: {
            id: true,
          },
        })
        .then(Boolean)
    );
  }

  if (values.tourId) {
    checks.push(
      db.tour
        .findUnique({
          where: {
            id: values.tourId,
          },
          select: {
            id: true,
          },
        })
        .then(Boolean)
    );
  }

  if (values.departureDateId) {
    checks.push(
      db.departureDate
        .findUnique({
          where: {
            id: values.departureDateId,
          },
          select: {
            id: true,
          },
        })
        .then(Boolean)
    );
  }

  if (values.supplierId) {
    checks.push(
      db.supplier
        .findUnique({
          where: {
            id: values.supplierId,
          },
          select: {
            id: true,
          },
        })
        .then(Boolean)
    );
  }

  const results =
    await Promise.all(checks);

  return results.every(Boolean);
}

function redirectToEdit(
  request: Request,
  id: string,
  message: string
) {
  const url = new URL(
    `/admin/finance/documents/${id}/edit`,
    request.url
  );

  url.searchParams.set(
    "error",
    message
  );

  return NextResponse.redirect(
    url,
    303
  );
}


function safeLocalPublicPath(storagePath: string) {
  const normalized = storagePath.replace(/\\/g, "/");
  const relative = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  if (relative.includes("..")) return null;
  return path.join(process.cwd(), "public", relative);
}

export async function GET(request: Request, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.redirect(new URL("/admin-login", request.url), 303);
    }
    const { id } = await params;
    if (new URL(request.url).searchParams.get("view") !== "1") {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }
    const document = await db.financeDocument.findUnique({
      where: { id },
      select: { originalFileName: true, storagePath: true, mimeType: true },
    });
    if (!document) {
      return NextResponse.json({ ok: false, error: "Finance document not found." }, { status: 404 });
    }
    let buffer: Buffer | null = null;
    if (isHttpUrl(document.storagePath)) {
      buffer = await readFinanceFile(document.storagePath);
    } else {
      const localPath = safeLocalPublicPath(document.storagePath);
      if (localPath) buffer = await readFile(localPath).catch(() => null);
    }
    if (!buffer) {
      return NextResponse.json({ ok: false, error: "The stored document file could not be found." }, { status: 404 });
    }
    const safeName = document.originalFileName.replace(/["\r\n]/g, "");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("FINANCE_DOCUMENT_VIEW_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to open finance document." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: Context
) {
  let newBlobUrl:
    | string
    | null = null;

  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (
      !session?.user?.id ||
      session.user.role !== Role.ADMIN
    ) {
      return NextResponse.redirect(
        new URL(
          "/admin-login",
          request.url
        ),
        303
      );
    }

    const { id } =
      await params;

    const existing =
      await db.financeDocument.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          storagePath: true,
          originalFileName: true,
          storedFileName: true,
          mimeType: true,
          fileSize: true,
          accountingPeriodId: true,
        },
      });

    if (!existing) {
      return redirectToEdit(
        request,
        id,
        "Finance document not found."
      );
    }

    const formData =
      await request.formData();

    const requestedAction = cleanString(formData.get("_action"));

    if (requestedAction === "delete") {
      const confirmUrl = new URL(`/admin/finance/documents/${id}/edit`, request.url);
      confirmUrl.searchParams.set("confirmDelete", "1");
      return NextResponse.redirect(confirmUrl, 303);
    }

    if (requestedAction === "delete-confirmed") {
      const protectedDocument = await db.financeDocument.findUnique({
        where: { id },
        select: {
          expenseId: true,
          supplierPayableId: true,
          supplierPayablePaymentId: true,
          refundId: true,
          bankTransactionId: true,
          bookingId: true,
          tourId: true,
          departureDateId: true,
          supplierId: true,
          paymentId: true,
          salesDocumentId: true,
          storagePath: true,
        },
      });
      if (!protectedDocument) return redirectToEdit(request, id, "Finance document not found.");
      const hasProtectedLink = Boolean(
        protectedDocument.expenseId ||
        protectedDocument.supplierPayableId ||
        protectedDocument.supplierPayablePaymentId ||
        protectedDocument.refundId ||
        protectedDocument.bankTransactionId ||
        protectedDocument.bookingId ||
        protectedDocument.tourId ||
        protectedDocument.departureDateId ||
        protectedDocument.supplierId ||
        protectedDocument.paymentId ||
        protectedDocument.salesDocumentId
      );
      if (hasProtectedLink) {
        return redirectToEdit(request, id, "This document is linked to another finance or operational record and cannot be deleted here.");
      }
      await db.financeDocument.delete({ where: { id } });
      if (isHttpUrl(protectedDocument.storagePath)) {
        await del(protectedDocument.storagePath).catch((error) =>
          console.error("FINANCE_DOCUMENT_DELETE_BLOB_ERROR", error)
        );
      }
      return NextResponse.redirect(new URL("/admin/finance/documents?deleted=1", request.url), 303);
    }

    const typeRaw =
      cleanString(
        formData.get("type")
      );

    if (
      !Object.values(
        FinanceDocumentType
      ).includes(
        typeRaw as FinanceDocumentType
      )
    ) {
      return redirectToEdit(
        request,
        id,
        "Invalid finance document type."
      );
    }

    const type =
      typeRaw as FinanceDocumentType;

    const categoryRaw =
      cleanString(
        formData.get(
          "accountingCategory"
        )
      );

    const allowedCategories =
      new Set<AccountingCategory>([
        AccountingCategory.OWNER_PERSONAL_PAYMENTS,
        AccountingCategory.OTHER_DOCUMENTS,
        AccountingCategory.TRIP_GROUP_DOCUMENTATION,
      ]);

    if (
      !allowedCategories.has(
        categoryRaw as AccountingCategory
      )
    ) {
      return redirectToEdit(
        request,
        id,
        "Invalid accounting destination."
      );
    }

    const accountingCategory =
      categoryRaw as AccountingCategory;

    const title =
      cleanString(
        formData.get("title")
      );

    if (!title) {
      return redirectToEdit(
        request,
        id,
        "Document title is required."
      );
    }

    const documentDate =
      parseDate(
        formData.get("documentDate")
      );

    const description =
      nullableString(
        formData.get("description")
      );

    const referenceNumber =
      nullableString(
        formData.get(
          "referenceNumber"
        )
      );

    const notes =
      nullableString(
        formData.get("notes")
      );

    const links = {
      expenseId:
        nullableString(
          formData.get("expenseId")
        ),

      supplierPayableId:
        nullableString(
          formData.get(
            "supplierPayableId"
          )
        ),

      supplierPayablePaymentId:
        nullableString(
          formData.get(
            "supplierPayablePaymentId"
          )
        ),

      refundId:
        nullableString(
          formData.get("refundId")
        ),

      bankAccountId:
        nullableString(
          formData.get(
            "bankAccountId"
          )
        ),

      bankTransactionId:
        nullableString(
          formData.get(
            "bankTransactionId"
          )
        ),

      bookingId:
        nullableString(
          formData.get("bookingId")
        ),

      tourId:
        nullableString(
          formData.get("tourId")
        ),

      departureDateId:
        nullableString(
          formData.get(
            "departureDateId"
          )
        ),

      supplierId:
        nullableString(
          formData.get("supplierId")
        ),
    };

    if (
      !(await validateLinkedRecords(
        links
      ))
    ) {
      return redirectToEdit(
        request,
        id,
        "One or more linked finance records were not found."
      );
    }

    if (
      links.bankAccountId &&
      links.bankTransactionId
    ) {
      const validBankTransaction =
        await db.bankTransaction.findFirst(
          {
            where: {
              id:
                links.bankTransactionId,
              bankAccountId:
                links.bankAccountId,
            },
            select: {
              id: true,
            },
          }
        );

      if (!validBankTransaction) {
        return redirectToEdit(
          request,
          id,
          "The selected bank transaction does not belong to the selected bank account."
        );
      }
    }

    if (
      type ===
        FinanceDocumentType.BANK_STATEMENT &&
      !links.bankAccountId
    ) {
      return redirectToEdit(
        request,
        id,
        "Please select the bank account for this bank statement."
      );
    }

    const fileValue =
      formData.get("file");

    const replacementFile =
      fileValue instanceof File &&
      fileValue.size > 0
        ? fileValue
        : null;

    let replacementData:
      | {
          originalFileName: string;
          storedFileName: string;
          storagePath: string;
          mimeType: string;
          fileSize: number;
        }
      | undefined;

    if (replacementFile) {
      if (
        replacementFile.size >
        MAX_FILE_SIZE
      ) {
        return redirectToEdit(
          request,
          id,
          "File must be smaller than 20 MB."
        );
      }

      if (
        !ALLOWED_MIME_TYPES.has(
          replacementFile.type
        )
      ) {
        return redirectToEdit(
          request,
          id,
          "Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX, XLS, XLSX."
        );
      }

      const originalFileName =
        replacementFile.name ||
        "document";

      const extension =
        extensionFromName(
          originalFileName
        );

      const baseName =
        sanitizeBaseName(
          path.basename(
            originalFileName,
            path.extname(
              originalFileName
            )
          )
        ) || "document";

      const storedFileName =
        `${Date.now()}-${crypto.randomUUID()}-${baseName}${extension}`;

      const blobPathname =
        `finance/${buildStorageFolder(
          type
        )}/${storedFileName}`;

      const blob =
        await put(
          blobPathname,
          replacementFile,
          {
            access: "private",
            contentType:
              replacementFile.type ||
              "application/octet-stream",
            addRandomSuffix: false,
          }
        );

      // IMPORTANT:
      // Store the full private Blob URL,
      // not blob.pathname.
      newBlobUrl = blob.url;

      replacementData = {
        originalFileName,
        storedFileName,
        storagePath: blob.url,
        mimeType:
          replacementFile.type ||
          "application/octet-stream",
        fileSize:
          replacementFile.size,
      };
    }

    let accountingPeriodId =
      existing.accountingPeriodId;

    if (documentDate) {
      const { year, month } =
        getAccountingPeriodParts(
          documentDate
        );

      const period =
        await db.accountingPeriod.upsert(
          {
            where: {
              year_month: {
                year,
                month,
              },
            },
            update: {},
            create: {
              year,
              month,
            },
            select: {
              id: true,
            },
          }
        );

      accountingPeriodId =
        period.id;
    }

    await db.financeDocument.update({
      where: {
        id,
      },
      data: {
        type,
        title,
        description,
        documentDate,
        referenceNumber,
        notes,
        accountingCategory,
        accountingSubcategory:
          accountingSubcategory(
            accountingCategory
          ),
        accountingPeriodId,
        ...links,
        ...(replacementData ?? {}),
      },
    });

    /*
     * Delete the previous file only when
     * it is an actual HTTP/HTTPS Blob URL.
     *
     * Historical values such as:
     * finance/contracts/...
     * finance/other/...
     * finance/banking/...
     *
     * are legacy local paths and must not
     * be sent to Vercel Blob's del().
     */
    if (
      replacementData &&
      existing.storagePath !==
        replacementData.storagePath &&
      isHttpUrl(
        existing.storagePath
      )
    ) {
      await del(
        existing.storagePath
      ).catch((error) => {
        console.error(
          "FINANCE_DOCUMENT_OLD_BLOB_DELETE_ERROR",
          error
        );
      });
    }

    /*
     * Database update succeeded.
     * Do not delete the newly uploaded
     * Blob in the catch block.
     */
    newBlobUrl = null;

    return NextResponse.redirect(
      new URL(
        `/admin/finance/documents/${id}/edit?saved=1`,
        request.url
      ),
      303
    );
  } catch (error) {
    /*
     * If Blob upload succeeded but the
     * database update subsequently failed,
     * remove the newly uploaded Blob so
     * we do not leave an orphan file.
     */
    if (newBlobUrl) {
      await del(
        newBlobUrl
      ).catch(
        () => undefined
      );
    }

    console.error(
      "FINANCE_DOCUMENT_EDIT_ERROR",
      error
    );

    const { id } =
      await params;

    return redirectToEdit(
      request,
      id,
      error instanceof Error
        ? error.message
        : "Failed to update finance document."
    );
  }
}