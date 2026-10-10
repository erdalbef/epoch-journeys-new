import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  AccountingPeriodStatus,
  Role,
  SalesDocumentStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import {
  deleteFinanceFile,
} from "@/lib/storage/finansFileStorage";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseDateOnly(
  value: unknown,
) {
  if (
    typeof value !==
      "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

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

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user ||
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

    const { id } =
      await context.params;

    const body =
      await request
        .json()
        .catch(
          () => null,
        );

    const issueDate =
      parseDateOnly(
        body?.issueDate,
      );

    if (!issueDate) {
      return NextResponse.json(
        {
          error:
            "A valid Issue Date is required.",
        },
        {
          status: 400,
        },
      );
    }

    const document =
      await db.salesDocument.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          status: true,
          documentNumber:
            true,
        },
      });

    if (!document) {
      return NextResponse.json(
        {
          error:
            "Sales document not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      document.status !==
        SalesDocumentStatus.DRAFT ||
      document.documentNumber
    ) {
      return NextResponse.json(
        {
          error:
            "Issue Date can only be changed while the document is still a draft.",
        },
        {
          status: 409,
        },
      );
    }

    await db.salesDocument.update({
      where: {
        id,
      },

      data: {
        issueDate,
      },
    });

    return NextResponse.json({
      success: true,
      issueDate:
        issueDate.toISOString(),
    });
  } catch (error) {
    console.error(
      "UPDATE_SALES_DOCUMENT_ISSUE_DATE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update the Issue Date.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user ||
      session.user.role !==
        Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Sales document ID is missing.",
        },
        {
          status: 400,
        },
      );
    }

    const url =
      new URL(request.url);

    const latestDelete =
      url.searchParams.get(
        "latest",
      ) === "true";

    const testDelete =
      url.searchParams.get(
        "test",
      ) === "true";

    const document =
      await db.salesDocument.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          type: true,
          status: true,
          documentNumber: true,
          issueDate: true,
          issuedAt: true,
          bookingId: true,
          paymentId: true,
          originalDocumentId:
            true,

          financeDocument: {
            select: {
              id: true,
              storagePath: true,

              accountingPeriod: {
                select: {
                  status:
                    true,
                },
              },
            },
          },

          originalDocument: {
            select: {
              id: true,
              documentNumber:
                true,
            },
          },

          _count: {
            select: {
              items: true,
              creditNotes: true,
            },
          },
        },
      });

    if (!document) {
      return NextResponse.json(
        {
          error:
            "Sales document not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      document._count
        .creditNotes > 0
    ) {
      return NextResponse.json(
        {
          error:
            `This document has ${document._count.creditNotes} linked Credit Note${
              document._count.creditNotes ===
              1
                ? ""
                : "s"
            }. Delete/correct the Credit Note${
              document._count.creditNotes ===
              1
                ? ""
                : "s"
            } first.`,
        },
        {
          status: 409,
        },
      );
    }

    if (
      !latestDelete &&
      !testDelete
    ) {
      const isDraft =
        document.status ===
        SalesDocumentStatus.DRAFT;

      const hasOfficialNumber =
        Boolean(
          document.documentNumber,
        );

      const hasAccountingDocument =
        Boolean(
          document.financeDocument,
        );

      if (
        !isDraft ||
        hasOfficialNumber ||
        hasAccountingDocument
      ) {
        return NextResponse.json(
          {
            error:
              "Issued sales documents cannot be deleted with the normal delete action. Use Delete Latest Issued only for the current last-issued document.",
          },
          {
            status: 409,
          },
        );
      }

      await db.salesDocument.delete({
        where: {
          id,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          `Draft ${document.type
            .toLowerCase()
            .replaceAll(
              "_",
              " ",
            )} deleted successfully.`,
      });
    }

    if (latestDelete) {
      const deletableStatuses: SalesDocumentStatus[] = [
        SalesDocumentStatus.ISSUED,
        SalesDocumentStatus.SENT,
        SalesDocumentStatus.PARTIALLY_PAID,
        SalesDocumentStatus.PAID,
      ];

      if (
        !deletableStatuses.includes(
          document.status,
        ) ||
        !document.documentNumber ||
        !document.issueDate ||
        !document.issuedAt
      ) {
        return NextResponse.json(
          {
            error:
              "Only an issued, sent, partially paid, or paid document with an official number can use Delete Latest Issued.",
          },
          {
            status: 409,
          },
        );
      }

      const periodStatus =
        document.financeDocument
          ?.accountingPeriod
          ?.status;

      if (
        periodStatus ===
          AccountingPeriodStatus.SUBMITTED ||
        periodStatus ===
          AccountingPeriodStatus.CLOSED
      ) {
        return NextResponse.json(
          {
            error:
              "This document belongs to a submitted or closed accounting period and cannot be deleted.",
          },
          {
            status: 409,
          },
        );
      }

      const laterDocument =
        await db.salesDocument.findFirst({
          where: {
            id: {
              not:
                document.id,
            },

            type:
              document.type,

            documentNumber: {
              not: null,
            },

            issuedAt: {
              gt:
                document.issuedAt,
            },
          },

          orderBy: {
            issuedAt:
              "asc",
          },

          select: {
            id: true,
            documentNumber:
              true,
          },
        });

      if (laterDocument) {
        return NextResponse.json(
          {
            error:
              `This is not the latest issued ${document.type
                .toLowerCase()
                .replaceAll(
                  "_",
                  " ",
                )}. A later document exists: ${
                laterDocument.documentNumber ||
                laterDocument.id
              }.`,
          },
          {
            status: 409,
          },
        );
      }

      const storagePath =
        document.financeDocument
          ?.storagePath ||
        null;

      await db.salesDocument.delete({
        where: {
          id,
        },
      });

      if (storagePath) {
        try {
          await deleteFinanceFile(
            storagePath,
          );
        } catch (error) {
          console.error(
            "DELETE_LATEST_SALES_DOCUMENT_FILE_ERROR",
            error,
          );
        }
      }

      return NextResponse.json({
        success: true,
        message:
          `${document.type
            .toLowerCase()
            .replaceAll(
              "_",
              " ",
            )} ${document.documentNumber} deleted successfully. It was the latest issued document in its sequence.`,
      });
    }

    const storagePath =
      document.financeDocument
        ?.storagePath ||
      null;

    await db.salesDocument.delete({
      where: {
        id,
      },
    });

    if (storagePath) {
      try {
        await deleteFinanceFile(
          storagePath,
        );
      } catch (error) {
        console.error(
          "DELETE_TEST_SALES_DOCUMENT_FILE_ERROR",
          error,
        );
      }
    }

    const documentLabel =
      document.type
        .toLowerCase()
        .replaceAll(
          "_",
          " ",
        );

    return NextResponse.json({
      success: true,
      message:
        document.documentNumber
          ? `Test ${documentLabel} ${document.documentNumber} deleted successfully.`
          : `Test ${documentLabel} deleted successfully.`,
    });
  } catch (error) {
    console.error(
      "DELETE_SALES_DOCUMENT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete sales document.",
      },
      {
        status: 500,
      },
    );
  }
}
