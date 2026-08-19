import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ResourceAudience, ResourceStatus, Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import {
  deleteResourceFile,
  migrateLegacyResourceFile,
  saveResourceFile,
} from "@/lib/resources/resourceFileStrorage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: FormDataEntryValue | null) {
  return [
    ...new Set(
      text(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 30);
}

function isAudience(value: string): value is ResourceAudience {
  return Object.values(ResourceAudience).includes(value as ResourceAudience);
}

function isStatus(value: unknown): value is ResourceStatus {
  return (
    typeof value === "string" &&
    Object.values(ResourceStatus).includes(value as ResourceStatus)
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const existing = await db.resource.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Resource not found." },
        { status: 404 },
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { status?: string };

      if (!isStatus(body.status)) {
        return NextResponse.json(
          { ok: false, error: "Invalid resource status." },
          { status: 400 },
        );
      }

      const updated = await db.resource.update({
        where: { id },
        data: {
          status: body.status,
          archivedAt:
            body.status === ResourceStatus.ARCHIVED ? new Date() : null,
        },
        select: { id: true, status: true },
      });

      return NextResponse.json({ ok: true, resource: updated });
    }

    const formData = await request.formData();
    const title = text(formData.get("title"));
    const description = text(formData.get("description"));
    const audienceRaw = text(formData.get("audience"));
    const categoryId = text(formData.get("categoryId"));
    const tourId = text(formData.get("tourId"));
    const destinations = list(formData.get("destinations"));
    const tags = list(formData.get("tags"));
    const featured = text(formData.get("featured")) === "true";
    const fileEntry = formData.get("file");

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Title is required." },
        { status: 400 },
      );
    }

    if (!isAudience(audienceRaw)) {
      return NextResponse.json(
        { ok: false, error: "Invalid resource audience." },
        { status: 400 },
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { ok: false, error: "Please select a folder/category." },
        { status: 400 },
      );
    }

    const category = await db.resourceCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, audience: true, isActive: true },
    });

    if (!category || !category.isActive || category.audience !== audienceRaw) {
      return NextResponse.json(
        {
          ok: false,
          error: "The selected folder does not match the resource audience.",
        },
        { status: 400 },
      );
    }

    if (tourId) {
      const tour = await db.tour.findUnique({
        where: { id: tourId },
        select: { id: true },
      });

      if (!tour) {
        return NextResponse.json(
          { ok: false, error: "The selected tour could not be found." },
          { status: 400 },
        );
      }
    }

    let replacement:
      | Awaited<ReturnType<typeof saveResourceFile>>
      | null = null;

    try {
      if (fileEntry instanceof File && fileEntry.size > 0) {
        replacement = await saveResourceFile(fileEntry, audienceRaw);
      }

      let nextStoragePath = existing.storagePath;

      if (!replacement) {
        nextStoragePath = await migrateLegacyResourceFile(
          existing.storagePath,
          existing.storedFileName,
          audienceRaw,
        );
      }

      const updated = await db.resource.update({
        where: { id },
        data: {
          title,
          description: description || null,
          audience: audienceRaw,
          categoryId,
          tourId: tourId || null,
          destinations,
          tags,
          featured,
          ...(replacement
            ? {
                originalFileName: replacement.originalFileName,
                storedFileName: replacement.storedFileName,
                storagePath: replacement.storagePath,
                mimeType: replacement.mimeType,
                fileSize: replacement.fileSize,
              }
            : { storagePath: nextStoragePath }),
        },
        select: { id: true },
      });

      if (replacement) {
        await deleteResourceFile(existing.storagePath);
      }

      return NextResponse.json({ ok: true, id: updated.id });
    } catch (error) {
      if (replacement) {
        await deleteResourceFile(replacement.storagePath);
      }
      throw error;
    }
  } catch (error) {
    console.error("PATCH /api/admin/resources/[id] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not update resource.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
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
      select: { id: true, storagePath: true },
    });

    if (!resource) {
      return NextResponse.json(
        { ok: false, error: "Resource not found." },
        { status: 404 },
      );
    }

    await db.resource.delete({ where: { id } });
    await deleteResourceFile(resource.storagePath);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/resources/[id] error:", error);

    return NextResponse.json(
      { ok: false, error: "Could not delete resource." },
      { status: 500 },
    );
  }
}
