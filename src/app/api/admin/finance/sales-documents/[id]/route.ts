import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  _request: Request,
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

          _count: {
            select: {
              items: true,
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
     * This endpoint exists specifically for
     * ADMIN test-data cleanup.
     *
     * It should not become the normal workflow
     * for correcting real issued invoices.
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
            "This sales document still has related records that prevent deletion. Remove the linked test records first.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json({
      success: true,

      message:
        `Test ${document.type.toLowerCase().replaceAll("_", " ")} ` +
        `${document.documentNumber || document.id} was deleted.`,
    });
  } catch (error) {
    console.error(
      "DELETE_TEST_SALES_DOCUMENT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete test sales document.",
      },
      {
        status: 500,
      },
    );
  }
}