import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { get } from "@vercel/blob";

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
          mimeType: true,
          fileSize: true,
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
     * Private Blob storage path saved in PostgreSQL.
     *
     * Example:
     * finance/expenses/1234-uuid-invoice.pdf
     */
    const blobResult =
      await get(
        document.storagePath,
        {
          access: "private",
        },
      );

    if (!blobResult) {
      return NextResponse.json(
        {
          error:
            "The document record exists, but the Blob file could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const downloadName =
      safeDownloadName(
        document.originalFileName,
      );

    const encodedFileName =
      encodeURIComponent(
        downloadName,
      );

    /*
     * Stream the private Blob through
     * this authenticated Admin route.
     *
     * The browser never receives direct
     * access to the private Blob store.
     */
    return new Response(
      blobResult.stream,
      {
        status: 200,

        headers: {
          "Content-Type":
            blobResult.blob
              .contentType ||
            document.mimeType ||
            "application/octet-stream",

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