import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  Role,
  SalesDocumentStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
      session.user.role !== Role.ADMIN
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

    /*
     * IMPORTANT
     *
     * test=true is a temporary administrative
     * cleanup mechanism for documents created
     * while developing/testing the module.
     *
     * Ordinary DELETE requests continue to
     * protect issued accounting documents.
     */

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
          bookingId: true,
          paymentId: true,
          originalDocumentId: true,

          financeDocument: {
            select: {
              id: true,
            },
          },

          originalDocument: {
            select: {
              id: true,
              documentNumber: true,
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

    /*
     * ------------------------------------------------------
     * NORMAL PRODUCTION DELETE
     * ------------------------------------------------------
     *
     * Only a completely unissued DRAFT may
     * be physically deleted.
     */

    if (!testDelete) {
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
              "Issued sales documents cannot be deleted. Use the appropriate correction or Credit Note workflow so the accounting and audit history remains intact.",
          },
          {
            status: 409,
          },
        );
      }

      if (
        document._count.creditNotes >
        0
      ) {
        return NextResponse.json(
          {
            error:
              "This sales document has related Credit Notes and cannot be deleted.",
          },
          {
            status: 409,
          },
        );
      }

      try {
        await db.salesDocument.delete({
          where: {
            id,
          },
        });
      } catch (error) {
        console.error(
          "DELETE_DRAFT_SALES_DOCUMENT_DATABASE_ERROR",
          error,
        );

        return NextResponse.json(
          {
            error:
              "This draft still has related records that prevent deletion. Remove the linked draft/test records first.",
          },
          {
            status: 409,
          },
        );
      }

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

    /*
     * ------------------------------------------------------
     * TEST DOCUMENT DELETE
     * ------------------------------------------------------
     *
     * ADMIN ONLY.
     *
     * This allows us to clean documents created
     * while testing the Sales Documents module.
     *
     * We deliberately DO NOT automatically
     * delete Credit Notes belonging to an Invoice.
     *
     * Delete test Credit Notes first, then delete
     * their original test Invoice.
     */

    if (
      document._count.creditNotes >
      0
    ) {
      return NextResponse.json(
        {
          error:
            `This document has ${document._count.creditNotes} linked Credit Note${
              document._count.creditNotes ===
              1
                ? ""
                : "s"
            }. Delete the test Credit Note${
              document._count.creditNotes ===
              1
                ? ""
                : "s"
            } first, then delete this test document.`,
        },
        {
          status: 409,
        },
      );
    }

    /*
     * SalesDocumentItem:
     *   onDelete: Cascade
     *
     * FinanceDocument:
     *   onDelete: Cascade
     *
     * Therefore Prisma/database will remove
     * those dependent records automatically.
     *
     * If this document itself is a Credit Note,
     * deleting it is safe: it removes the child
     * while leaving the original Invoice intact.
     */

    try {
      await db.salesDocument.delete({
        where: {
          id,
        },
      });
    } catch (error) {
      console.error(
        "DELETE_TEST_SALES_DOCUMENT_DATABASE_ERROR",
        error,
      );

      return NextResponse.json(
        {
          error:
            "This test document still has a related financial record that prevents deletion. Remove its dependent test records first.",
        },
        {
          status: 409,
        },
      );
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