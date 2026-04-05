import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { v4 as uuid } from "uuid";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
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

    if (
      !user ||
      user.role !== "AGENT" ||
      !user.approved ||
      user.status !== "ACTIVE"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("logo");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
    }

    if (file.size > 2_000_000) {
      return NextResponse.json(
        { error: "File too large (max 2MB)." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = file.type === "image/png" ? "png" : "jpg";
    const fileName = `agent-${user.id}-${uuid()}.${fileExt}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "agents");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/agents/${fileName}`;

    await db.user.update({
      where: { id: user.id },
      data: {
        agentLogoUrl: publicPath,
      },
    });

    return NextResponse.json({
      success: true,
      logoUrl: publicPath,
    });
  } catch (error) {
    console.error("LOGO_UPLOAD_ERROR", error);

    return NextResponse.json(
      { error: "Failed to upload logo." },
      { status: 500 }
    );
  }
}