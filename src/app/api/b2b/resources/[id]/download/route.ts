import {
  NextRequest,
  NextResponse,
} from "next/server";
import { getServerSession } from "next-auth";
import {
  ResourceAudience,
  ResourceStatus,
} from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

function safeName(
  value: string
) {
  return value.replace(
    /["\r\n]/g,
    "_"
  );
}

function candidatePaths(
  storagePath: string
) {
  const normalized =
    storagePath
      .replaceAll("\\", "/")
      .replace(/^\/+/, "");

  return Array.from(
    new Set([
      path.resolve(
        process.cwd(),
        storagePath
      ),

      path.resolve(
        process.cwd(),
        normalized
      ),

      path.resolve(
        process.cwd(),
        "public",
        normalized
      ),

      path.resolve(
        process.cwd(),
        "storage",
        normalized
      ),
    ])
  );
}

export async function GET(
  request: NextRequest,
  context: Context
) {
  const session =
    await getServerSession(
      authOptions
    );

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const user =
    await db.user.findUnique({
      where: {
        id: session.user.id,
      },

      select: {
        role: true,
        approved: true,
        status: true,
      },
    });

  if (
    !user ||
    user.role !== "AGENT" ||
    !user.approved ||
    user.status !== "ACTIVE"
  ) {
    return NextResponse.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      }
    );
  }

  const { id } =
    await context.params;

  const resource =
    await db.resource.findFirst({
      where: {
        id,

        audience:
          ResourceAudience.AGENT,

        status:
          ResourceStatus.ACTIVE,
      },

      select: {
        originalFileName:
          true,

        storagePath: true,

        mimeType: true,
      },
    });

  if (!resource) {
    return NextResponse.json(
      {
        error:
          "Resource not found",
      },
      {
        status: 404,
      }
    );
  }

  let file:
    Buffer | null = null;

  for (
    const candidate of
    candidatePaths(
      resource.storagePath
    )
  ) {
    try {
      file =
        await readFile(
          candidate
        );

      break;
    } catch {
      // Try next supported local storage location.
    }
  }

  if (!file) {
    console.error(
      "Resource file not found:",
      resource.storagePath
    );

    return NextResponse.json(
      {
        error:
          "Resource file not found",
      },
      {
        status: 404,
      }
    );
  }

  const mode =
    request.nextUrl
      .searchParams
      .get("mode");

  const disposition =
    mode === "download"
      ? "attachment"
      : "inline";

  const fileName =
    safeName(
      resource.originalFileName
    );

  return new NextResponse(
    new Uint8Array(file),
    {
      headers: {
        "Content-Type":
          resource.mimeType ||
          "application/octet-stream",

        "Content-Length":
          String(file.length),

        "Content-Disposition":
          `${disposition}; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(
            fileName
          )}`,

        "Cache-Control":
          "private, no-store",

        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}
