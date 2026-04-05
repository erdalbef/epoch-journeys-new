import JSZip from "jszip";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeName(value: string) {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

function getFileExtensionFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").pop() || "";
    const dotIndex = lastSegment.lastIndexOf(".");

    if (dotIndex !== -1) {
      return lastSegment.slice(dotIndex);
    }

    return "";
  } catch {
    return "";
  }
}

async function addRemoteFileToZip(
  zip: JSZip,
  folderName: string,
  label: string,
  url: string
) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error("ZIP_FILE_FETCH_FAILED", {
        url,
        status: response.status,
      });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const extension = getFileExtensionFromUrl(url);
    const safeFolder = sanitizeName(folderName);
    const safeLabel = sanitizeName(label);

    zip.folder(safeFolder)?.file(`${safeLabel}${extension}`, arrayBuffer);
  } catch (error) {
    console.error("ZIP_ADD_FILE_ERROR", { url, error });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      approved: true,
      status: true,
    },
  });

  if (!user || user.role !== "AGENT" || !user.approved || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const destination = searchParams.get("destination")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";

  const tours = await db.tour.findMany({
    where: {
      isPublished: true,
      OR: [
        { brochureUrl: { not: null } },
        { mainImageUrl: { not: null } },
        { mapImageUrl: { not: null } },
      ],
      ...(destination ? { destinations: { has: destination } } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: {
      title: "asc",
    },
    select: {
      title: true,
      brochureUrl: true,
      mainImageUrl: true,
      mapImageUrl: true,
    },
  });

  const zip = new JSZip();

  for (const tour of tours) {
    if (tour.brochureUrl) {
      await addRemoteFileToZip(zip, tour.title, "brochure", tour.brochureUrl);
    }

    if (tour.mainImageUrl) {
      await addRemoteFileToZip(zip, tour.title, "main-image", tour.mainImageUrl);
    }

    if (tour.mapImageUrl) {
      await addRemoteFileToZip(zip, tour.title, "map-image", tour.mapImageUrl);
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipData = new Uint8Array(zipBuffer);

  const parts = ["tour-resources"];
  if (destination) parts.push(sanitizeName(destination));
  if (category) parts.push(sanitizeName(category));

  const fileName = `${parts.join("-")}.zip`;

  return new NextResponse(zipData, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}