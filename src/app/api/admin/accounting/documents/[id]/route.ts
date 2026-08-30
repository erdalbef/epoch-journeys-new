import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  AccountingCategory,
  AccountingPeriodStatus,
  FinanceDocumentType,
} from "@prisma/client";

import { db } from "@/lib/db";
import { deleteFinanceFile } from "@/lib/storage/finansFileStorage";
import { authOptions } from "@/lib/authOptions";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
  return Object.values(
    AccountingCategory
  ).includes(
    value as AccountingCategory
  );
}

function isFinanceDocumentType(
  value: string
): value is FinanceDocumentType {
  return Object.values(
    FinanceDocumentType
  ).includes(
    value as FinanceDocumentType
  );
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

async function updateDocument(
  request: Request,
  context: RouteContext
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

    const { id } =
      await context.params;

    /*
     * Load the document together with
     * its CURRENT accounting period.
     *
     * This prevents a document from
     * being edited or moved OUT of a
     * closed accounting month.
     */

    const existing =
      await db.financeDocument.findUnique({
        where: {
          id,
        },

        select: {
          id: true,

          accountingPeriod: {
            select: {
              id: true,
              year: true,
              month: true,
              status: true,
            },
          },
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Accounting document not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      existing.accountingPeriod
        ?.status ===
      AccountingPeriodStatus.CLOSED
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This accounting period is closed. Reopen the period before editing or moving documents.",
        },
        {
          status: 409,
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

    const title =
      optionalString(
        formData.get("title")
      );

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

    const documentDateRaw =
      optionalString(
        formData.get(
          "documentDate"
        )
      );

    let documentDate:
      | Date
      | null = null;

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
     * Find or create the DESTINATION
     * accounting period.
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
     * A document must not be edited
     * INTO a closed accounting period.
     *
     * Together with the earlier check,
     * this protects both directions:
     *
     * CLOSED -> another month
     * another month -> CLOSED
     */

    if (
      period.status ===
      AccountingPeriodStatus.CLOSED
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The destination accounting period is closed. Reopen the period before making changes.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Update FinanceDocument.
     *
     * The uploaded physical file is
     * intentionally left unchanged.
     */

    await db.financeDocument.update({
      where: {
        id,
      },

      data: {
        title,

        type: typeRaw,

        documentDate,

        referenceNumber,

        description,

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
      },
    });

    /*
     * Return to the NEW accounting
     * month/category.
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
      "updated",
      "1"
    );

    return NextResponse.redirect(
      redirectUrl,
      303
    );
  } catch (error) {
    console.error(
      "PATCH accounting document error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to update accounting document.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  return updateDocument(
    request,
    context
  );
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  return updateDocument(
    request,
    context
  );
}

export async function DELETE(
  _request: Request,
  context: RouteContext
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

    const { id } =
      await context.params;

    /*
     * Load the document together with
     * its accounting period so CLOSED
     * periods cannot lose documents.
     */

    const document =
      await db.financeDocument.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          storagePath: true,

          accountingPeriod: {
            select: {
              status: true,
            },
          },
        },
      });

    if (!document) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Accounting document not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      document.accountingPeriod
        ?.status ===
      AccountingPeriodStatus.CLOSED
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This accounting period is closed. Reopen the period before deleting documents.",
        },
        {
          status: 409,
        }
      );
    }

    await db.financeDocument.delete({
      where: {
        id,
      },
    });

    /*
     * Remove the physical file from its configured
     * storage provider. Supports legacy local files
     * and Vercel Blob URLs.
     */
    try {
      await deleteFinanceFile(
        document.storagePath,
      );
    } catch (fileError) {
      console.warn(
        "Unable to remove accounting file:",
        fileError,
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/accounting/documents/[id] error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to delete accounting document.",
      },
      {
        status: 500,
      }
    );
  }
}