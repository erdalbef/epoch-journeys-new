import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const bookingIdRaw = String(formData.get("bookingId") || "").trim();
    const requestTypeRaw = String(formData.get("requestType") || "").trim();

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required." },
        { status: 400 }
      );
    }

    let bookingId: string | null = null;

    if (bookingIdRaw) {
      const booking = await db.booking.findUnique({
        where: { id: bookingIdRaw },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!booking || booking.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Invalid booking reference." },
          { status: 400 }
        );
      }

      bookingId = booking.id;
    }

    const uploadedFile = formData.get("file");
    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;

    if (uploadedFile && uploadedFile instanceof File && uploadedFile.size > 0) {
      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "support"
      );

      await fs.mkdir(uploadDir, { recursive: true });

      const safeName = sanitizeFileName(uploadedFile.name);
      const fileName = `${Date.now()}-${safeName}`;
      const fullPath = path.join(uploadDir, fileName);

      const buffer = Buffer.from(await uploadedFile.arrayBuffer());
      await fs.writeFile(fullPath, buffer);

      attachmentPath = `/uploads/support/${fileName}`;
      attachmentName = uploadedFile.name;
    }

    const supportMessage = await db.supportMessage.create({
      data: {
        userId: session.user.id,
        bookingId,
        subject,
        message,
        requestType: requestTypeRaw || null,
        attachmentPath,
        attachmentName,
        status: "OPEN",
      },
    });

    return NextResponse.json({
      success: true,
      supportMessage,
    });
  } catch (error) {
    console.error("Support request error:", error);

    return NextResponse.json(
      { error: "Failed to submit support request." },
      { status: 500 }
    );
  }
}