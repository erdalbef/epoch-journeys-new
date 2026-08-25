import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

const ALLOWED_EXTENSIONS =
  new Set([
    ".pdf",
    ".csv",
    ".xls",
    ".xlsx",
  ]);

const ALLOWED_MIME_TYPES =
  new Set([
    "application/pdf",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

function parseOptionalDecimal(
  value: FormDataEntryValue | null
): number | null {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function sanitizeFileName(
  fileName: string
) {
  const extension =
    path.extname(fileName);

  const baseName =
    path.basename(
      fileName,
      extension
    );

  const safeBase =
    baseName
      .replace(/\s+/g, "-")
      .replace(
        /[^a-zA-Z0-9._-]/g,
        ""
      )
      .slice(0, 120);

  const safeExtension =
    extension
      .toLowerCase()
      .replace(
        /[^a-z0-9.]/g,
        ""
      );

  return `${
    safeBase || "statement"
  }${safeExtension}`;
}

function getDueDate(
  year: number,
  month: number
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
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const formData =
      await request.formData();

    const year =
      Number(
        formData.get(
          "year"
        )
      );

    const month =
      Number(
        formData.get(
          "month"
        )
      );

    const bankAccountId =
      optionalString(
        formData.get(
          "bankAccountId"
        )
      );

    const statementDateRaw =
      optionalString(
        formData.get(
          "statementDate"
        )
      );

    const notes =
      optionalString(
        formData.get(
          "notes"
        )
      );

    const openingBalance =
      parseOptionalDecimal(
        formData.get(
          "openingBalance"
        )
      );

    const closingBalance =
      parseOptionalDecimal(
        formData.get(
          "closingBalance"
        )
      );

    const fileEntry =
      formData.get(
        "file"
      );

    // ======================================================
    // VALIDATE PERIOD
    // ======================================================

    if (
      !Number.isInteger(
        year
      ) ||
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
      !Number.isInteger(
        month
      ) ||
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

    if (!bankAccountId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bank account is required.",
        },
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // BANK ACCOUNT
    // ======================================================

    const bankAccount =
      await db.bankAccount.findUnique({
        where: {
          id:
            bankAccountId,
        },

        select: {
          id: true,
          currency: true,
          isActive: true,
        },
      });

    if (
      !bankAccount ||
      !bankAccount.isActive
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bank account not found or inactive.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Phase 1:
     * Accounting bank statements are
     * currently limited to EUR.
     */

    if (
      bankAccount.currency !==
      "EUR"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only EUR bank accounts are supported in Phase 1.",
        },
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // STATEMENT DATE
    // ======================================================

    if (!statementDateRaw) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Statement date is required.",
        },
        {
          status: 400,
        }
      );
    }

    const statementDate =
      new Date(
        `${statementDateRaw}T12:00:00.000Z`
      );

    if (
      Number.isNaN(
        statementDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid statement date.",
        },
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // FILE VALIDATION
    // ======================================================

    if (
      !(fileEntry instanceof File)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please select a statement file.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fileEntry.size <=
      0
    ) {
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
            "Maximum file size is 20 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const extension =
      path
        .extname(
          fileEntry.name
        )
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
            "Unsupported bank statement file extension.",
        },
        {
          status: 400,
        }
      );
    }

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
            "Unsupported bank statement file type.",
        },
        {
          status: 400,
        }
      );
    }

    // ======================================================
    // ACCOUNTING PERIOD
    // ======================================================

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
     * CLOSED accounting periods are
     * read-only.
     *
     * The administrator must reopen the
     * month before another bank
     * statement can be uploaded.
     */

    if (
      period.status ===
      "CLOSED"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This accounting period is closed. Reopen the period before uploading a bank statement.",
        },
        {
          status: 409,
        }
      );
    }

    // ======================================================
    // PREPARE FILE STORAGE
    // ======================================================

    const safeFileName =
      sanitizeFileName(
        fileEntry.name
      );

    const storedFileName =
      `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

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
        monthFolder,
        "bank-statements"
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

    // ======================================================
    // SAVE PHYSICAL FILE
    // ======================================================

    const bytes =
      await fileEntry.arrayBuffer();

    await writeFile(
      absoluteFilePath,
      Buffer.from(
        bytes
      )
    );

    // ======================================================
    // CREATE BANK STATEMENT
    // ======================================================

    await db.bankStatement.create({
      data: {
        bankAccountId:
          bankAccount.id,

        uploadedById:
          session.user.id,

        accountingPeriodId:
          period.id,

        fileName:
          storedFileName,

        fileType:
          fileEntry.type ||
          extension.replace(
            ".",
            ""
          ),

        statementDate,

        openingBalance,

        closingBalance,

        currency:
          "EUR",

        notes,
      },
    });

    // ======================================================
    // RETURN TO ACCOUNTING MONTH
    // ======================================================

    const redirectUrl =
      new URL(
        `/admin/accounting/${year}/${month}`,
        request.url
      );

    redirectUrl.searchParams.set(
      "category",
      "BANK_STATEMENTS"
    );

    redirectUrl.searchParams.set(
      "statementUploaded",
      "1"
    );

    return NextResponse.redirect(
      redirectUrl,
      303
    );
  } catch (error) {
    console.error(
      "POST /api/admin/accounting/bank-statements error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to upload bank statement.",
      },
      {
        status: 500,
      }
    );
  }
}