import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function resolveFinanceStoragePath(
  storagePath: string,
) {
  const absolutePath = path.resolve(
    process.cwd(),
    storagePath,
  );

  const financeStorageRoot =
    path.resolve(
      process.cwd(),
      "storage",
      "finance",
    );

  const relativePath =
    path.relative(
      financeStorageRoot,
      absolutePath,
    );

  /*
   * Prevent a database path from escaping
   * the private Finance storage directory.
   *
   * Example that must never be allowed:
   * ../../.env
   */
  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }

  return absolutePath;
}

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

    const absolutePath =
      resolveFinanceStoragePath(
        document.storagePath,
      );

    if (!absolutePath) {
      console.error(
        "FINANCE_DOCUMENT_INVALID_DELETE_PATH",
        {
          documentId:
            document.id,

          storagePath:
            document.storagePath,
        },
      );

      return NextResponse.json(
        {
          error:
            "Invalid finance document storage path.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * First verify whether the physical
     * file exists.
     *
     * A missing file should NOT prevent us
     * from deleting an orphaned DB record.
     */
    let physicalFileExists =
      true;

    try {
      await fs.access(
        absolutePath,
      );
    } catch {
      physicalFileExists =
        false;
    }

    /*
     * Delete the database record first.
     *
     * If DB deletion fails, the physical
     * file remains safely stored.
     */
    await db.financeDocument.delete({
      where: {
        id:
          document.id,
      },
    });

    /*
     * Now remove the physical file.
     *
     * If this part fails, the database
     * record is already gone, so we log
     * the orphaned file for maintenance.
     */
    let fileDeleted =
      false;

    if (physicalFileExists) {
      try {
        await fs.unlink(
          absolutePath,
        );

        fileDeleted =
          true;
      } catch (error) {
        console.error(
          "FINANCE_DOCUMENT_PHYSICAL_DELETE_ERROR",
          {
            documentId:
              document.id,

            originalFileName:
              document.originalFileName,

            storagePath:
              document.storagePath,

            error,
          },
        );
      }
    }

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

        physicalFile: {
          existed:
            physicalFileExists,

          deleted:
            fileDeleted,
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