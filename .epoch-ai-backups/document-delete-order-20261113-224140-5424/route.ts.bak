import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { del } from "@vercel/blob";

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
            "Document ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const document =
      await db.financeDocument.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          title: true,
          originalFileName: true,
          storagePath: true,
        },
      });

    if (!document) {
      return NextResponse.json(
        {
          error:
            "Finance document not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * First delete the Blob.
     *
     * storagePath contains the private
     * Blob pathname, for example:
     *
     * finance/expenses/123-file.pdf
     */
    try {
      await del(
        document.storagePath,
      );
    } catch (error) {
      console.error(
        "FINANCE_DOCUMENT_BLOB_DELETE_ERROR",
        {
          documentId:
            document.id,

          storagePath:
            document.storagePath,

          error,
        },
      );

      return NextResponse.json(
        {
          error:
            "The finance document could not be removed from private storage.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Only delete the database record
     * after Blob deletion succeeds.
     *
     * This avoids leaving a database
     * record pointing to a file we
     * failed to remove.
     */
    await db.financeDocument.delete({
      where: {
        id:
          document.id,
      },
    });

    return NextResponse.json(
      {
        success: true,

        deletedDocument: {
          id:
            document.id,

          title:
            document.title,

          originalFileName:
            document.originalFileName,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "FINANCE_DOCUMENT_DELETE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete finance document.",
      },
      {
        status: 500,
      },
    );
  }
}