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

function safeDownloadName(
  fileName: string,
) {
  return (
    fileName
      .replace(/[\r\n"]/g, "")
      .trim() || "document"
  );
}

function resolveFinanceStoragePath(
  storagePath: string,
) {
  const absolutePath =
    path.resolve(
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

  if (
    relativePath.startsWith(
      "..",
    ) ||
    path.isAbsolute(
      relativePath,
    )
  ) {
    return null;
  }

  return absolutePath;
}

export async function GET(
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
      await db.financeDocument.findUnique(
        {
          where: {
            id,
          },

          select: {
            id: true,
            title: true,
            originalFileName: true,
            storagePath: true,
            mimeType: true,
            fileSize: true,
          },
        },
      );

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
     * Database contains a relative path such as:
     *
     * storage/finance/expenses/file.pdf
     *
     * Resolve it against the project root.
     */
    const absolutePath =
      resolveFinanceStoragePath(
        document.storagePath,
      );

    if (!absolutePath) {
      console.error(
        "FINANCE_DOCUMENT_INVALID_STORAGE_PATH",
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
     * Read the private physical file.
     */
    let fileBuffer: Buffer;

    try {
      fileBuffer =
        await fs.readFile(
          absolutePath,
        );
    } catch (error) {
      console.error(
        "FINANCE_DOCUMENT_FILE_READ_ERROR",
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
            "The document record exists, but the physical file could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * NextResponse uses the Web Response API.
     *
     * Node Buffer is not accepted by the
     * BodyInit type in this Next.js version,
     * so convert it into a browser-compatible
     * Uint8Array and Blob.
     */
    const fileBytes =
      new Uint8Array(
        fileBuffer,
      );

    const fileBlob =
      new Blob(
        [fileBytes],
        {
          type:
            document.mimeType ||
            "application/octet-stream",
        },
      );

    const downloadName =
      safeDownloadName(
        document.originalFileName,
      );

    /*
     * Encode the UTF-8 filename as well.
     *
     * filename= provides compatibility,
     * filename*=UTF-8 provides proper support
     * for international filenames.
     */
    const encodedFileName =
      encodeURIComponent(
        downloadName,
      );

    return new NextResponse(
      fileBlob,
      {
        status: 200,

        headers: {
          "Content-Type":
            document.mimeType ||
            "application/octet-stream",

          "Content-Length":
            String(
              fileBuffer.byteLength,
            ),

          "Content-Disposition":
            `attachment; filename="${downloadName}"; filename*=UTF-8''${encodedFileName}`,

          "Cache-Control":
            "private, no-store, max-age=0",

          Pragma:
            "no-cache",

          Expires:
            "0",

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
  } catch (error) {
    console.error(
      "FINANCE_DOCUMENT_DOWNLOAD_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to download finance document.",
      },
      {
        status: 500,
      },
    );
  }
}