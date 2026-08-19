import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ResourceAudience, ResourceStatus, Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import {
  deleteResourceFile,
  saveResourceFile,
} from "@/lib/resources/resourceFileStrorage";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
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

    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return NextResponse.json(
        { ok: false, error: "Please select a file." },
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

    let savedFile:
      | Awaited<ReturnType<typeof saveResourceFile>>
      | null = null;

    try {
      savedFile = await saveResourceFile(fileEntry, audienceRaw);

      const resource = await db.resource.create({
        data: {
          title,
          description: description || null,
          audience: audienceRaw,
          status: ResourceStatus.ACTIVE,
          categoryId,
          tourId: tourId || null,
          uploadedById: session.user.id || null,
          destinations,
          tags,
          originalFileName: savedFile.originalFileName,
          storedFileName: savedFile.storedFileName,
          storagePath: savedFile.storagePath,
          mimeType: savedFile.mimeType,
          fileSize: savedFile.fileSize,
          featured,
        },
        select: { id: true },
      });

      return NextResponse.json({ ok: true, id: resource.id });
    } catch (error) {
      if (savedFile) {
        await deleteResourceFile(savedFile.storagePath);
      }
      throw error;
    }
  } catch (error) {
    console.error("POST /api/admin/resources/upload error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not upload resource.",
      },
      { status: 500 },
    );
  }
}
