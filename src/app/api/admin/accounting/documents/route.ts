import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  AccountingCategory,
  FinanceDocumentType,
} from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".csv",
  ".xls",
  ".xlsx",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

function optionalString(
  value: FormDataEntryValue | null
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function isAccountingCategory(
  value: string
): value is AccountingCategory {
  return Object.values(AccountingCategory).includes(
    value as AccountingCategory
  );
}

function isFinanceDocumentType(
  value: string
): value is FinanceDocumentType {
  return Object.values(FinanceDocumentType).includes(
    value as FinanceDocumentType
  );
}

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName);

  const baseName = path.basename(
    fileName,
    extension
  );

  const safeBase = baseName
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 120);

  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");

  return `${safeBase || "document"}${safeExtension}`;
}

function getDueDate(
  year: number,
  month: number
) {
  const nextMonth =
    month === 12 ? 1 : month + 1;

  const nextYear =
    month === 12 ? year + 1 : year;

  return new Date(
    Date.UTC(
      nextYear,
      nextMonth - 1,
      5,
      12,
      0,
      0
    )
  );
}

export async function POST(
  request: Request
) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (
      !session?.user?.id ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const formData =
      await request.formData();

    const year = Number(
      formData.get("year")
    );

    const month = Number(
      formData.get("month")
    );

    const categoryRaw =
      formData
        .get("accountingCategory")
        ?.toString() ?? "";

    const typeRaw =
      formData
        .get("type")
        ?.toString() ?? "";

    const title = optionalString(
      formData.get("title")
    );

    const fileEntry =
      formData.get("file");

    /*
     * Validate accounting period
     */

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid accounting year.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid accounting month.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Validate category
     */

    if (
      !isAccountingCategory(
        categoryRaw
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid accounting category.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Validate document type
     */

    if (
      !isFinanceDocumentType(
        typeRaw
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid document type.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Validate title
     */

    if (!title) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Document title is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Validate file
     */

    if (
      !(fileEntry instanceof File)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please select a file.",
        },
        {
          status: 400,
        }
      );
    }

    if (fileEntry.size <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The selected file is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fileEntry.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Maximum file size is 15 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const extension = path
      .extname(fileEntry.name)
      .toLowerCase();

    if (
      !ALLOWED_EXTENSIONS.has(
        extension
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unsupported file extension.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Some browsers may provide an empty
     * MIME type. We allow that as long as
     * the file extension is permitted.
     */

    if (
      fileEntry.type &&
      !ALLOWED_MIME_TYPES.has(
        fileEntry.type
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unsupported file type.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Create/find monthly accounting period
     */

    const period =
      await db.accountingPeriod.upsert({
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

          dueDate:
            getDueDate(
              year,
              month
            ),
        },
      });

    /*
     * Read optional document fields
     */

    const accountingSubcategory =
      optionalString(
        formData.get(
          "accountingSubcategory"
        )
      );

    const description =
      optionalString(
        formData.get(
          "description"
        )
      );

    const referenceNumber =
      optionalString(
        formData.get(
          "referenceNumber"
        )
      );

    const notes =
      optionalString(
        formData.get("notes")
      );

    const supplierId =
      optionalString(
        formData.get(
          "supplierId"
        )
      );

    const tourId =
      optionalString(
        formData.get("tourId")
      );

    const bookingId =
      optionalString(
        formData.get(
          "bookingId"
        )
      );

    const departureDateId =
      optionalString(
        formData.get(
          "departureDateId"
        )
      );

    const bankAccountId =
      optionalString(
        formData.get(
          "bankAccountId"
        )
      );

    /*
     * Document date
     */

    const documentDateRaw =
      optionalString(
        formData.get(
          "documentDate"
        )
      );

    let documentDate: Date | null =
      null;

    if (documentDateRaw) {
      documentDate = new Date(
        `${documentDateRaw}T12:00:00.000Z`
      );

      if (
        Number.isNaN(
          documentDate.getTime()
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Invalid document date.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Prepare file storage
     */

    const safeOriginalName =
      sanitizeFileName(
        fileEntry.name
      );

    const storedFileName =
      `${Date.now()}-${crypto.randomUUID()}-${safeOriginalName}`;

    const monthFolder =
      String(month).padStart(
        2,
        "0"
      );

    const relativeFolder =
      path.join(
        "uploads",
        "accounting",
        String(year),
        monthFolder
      );

    const absoluteFolder =
      path.join(
        process.cwd(),
        "public",
        relativeFolder
      );

    await mkdir(
      absoluteFolder,
      {
        recursive: true,
      }
    );

    const absoluteFilePath =
      path.join(
        absoluteFolder,
        storedFileName
      );

    /*
     * Save physical file
     */

    const bytes =
      await fileEntry.arrayBuffer();

    await writeFile(
      absoluteFilePath,
      Buffer.from(bytes)
    );

    /*
     * Browser-accessible file path
     */

    const storagePath =
      `/${relativeFolder
        .split(path.sep)
        .join("/")}/${storedFileName}`;

    /*
     * Create FinanceDocument
     */

    await db.financeDocument.create({
      data: {
        type: typeRaw,

        title,

        description,

        originalFileName:
          fileEntry.name,

        storedFileName,

        storagePath,

        mimeType:
          fileEntry.type ||
          "application/octet-stream",

        fileSize:
          fileEntry.size,

        documentDate,

        referenceNumber,

        notes,

        accountingPeriodId:
          period.id,

        accountingCategory:
          categoryRaw,

        accountingSubcategory,

        supplierId,

        tourId,

        bookingId,

        departureDateId,

        bankAccountId,

        uploadedById:
          session.user.id,
      },
    });

    /*
     * Return to the accounting month
     * and preserve selected category.
     */

    const redirectUrl =
      new URL(
        `/admin/accounting/${year}/${month}`,
        request.url
      );

    redirectUrl.searchParams.set(
      "category",
      categoryRaw
    );

    redirectUrl.searchParams.set(
      "uploaded",
      "1"
    );

    return NextResponse.redirect(
      redirectUrl,
      303
    );
  } catch (error) {
    console.error(
      "POST /api/admin/accounting/documents error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to upload accounting document.",
      },
      {
        status: 500,
      }
    );
  }
}