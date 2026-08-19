import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { resolveResourceDiskPath } from "@/lib/resources/resourceFileStrorage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const resource = await db.resource.findUnique({
    where: { id },
    select: {
      originalFileName: true,
      storagePath: true,
      mimeType: true,
    },
  });

  if (!resource) {
    return NextResponse.json(
      { ok: false, error: "Resource not found." },
      { status: 404 },
    );
  }

  const diskPath = resolveResourceDiskPath(resource.storagePath);

  if (!diskPath || !existsSync(diskPath)) {
    return NextResponse.json(
      { ok: false, error: "Resource file not found." },
      { status: 404 },
    );
  }

  const file = await readFile(diskPath);
  const safeFileName = resource.originalFileName.replace(/[\r\n"]/g, "-");

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": resource.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${safeFileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
