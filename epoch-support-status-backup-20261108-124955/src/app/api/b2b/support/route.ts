import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { absoluteAdminUrl, createAdminAlert, notifyEmail, supportAdminEmail } from "@/lib/support/notifications";

const ALLOWED_EXT = new Set([".xlsx", ".xls", ".csv", ".pdf", ".doc", ".docx"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Agent access required." }, { status: 403 });
  }
  const tickets = await db.supportMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, subject: true, message: true, status: true, createdAt: true,
      requestType: true, bookingId: true, attachmentName: true },
  });
  return NextResponse.json({ tickets }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "AGENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = checkRateLimit(`support-submit:${session.user.id}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many support requests. Try again later." }, { status: 429 });
    }
    const formData = await request.formData();

    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const bookingIdRaw = String(formData.get("bookingId") || "").trim();
    const requestTypeRaw = String(formData.get("requestType") || "").trim();

    if (!subject || !message || subject.length > 180 || message.length > 8000) {
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

    if (uploadedFile instanceof File && uploadedFile.size > 0) {
      const extension = path.extname(uploadedFile.name).toLowerCase();
      if (!ALLOWED_EXT.has(extension) || uploadedFile.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "Invalid attachment type or size (10 MB maximum)." }, { status: 400 });
      }
      // Private, non-public directory; serving requires authenticated endpoint.
      const uploadDir = path.join(process.cwd(), "private", "support");
      await fs.mkdir(uploadDir, { recursive: true, mode: 0o700 });
      const fileName = `${randomUUID()}${extension}`;
      const buffer = Buffer.from(await uploadedFile.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, fileName), buffer, { flag: "wx", mode: 0o600 });
      attachmentPath = `private:support/${fileName}`;
      attachmentName = uploadedFile.name.slice(0, 200);
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

    const href=`/admin/support/${supportMessage.id}`;
    await createAdminAlert(`support-new:${supportMessage.id}`,"New agent support request",subject,href);
    const fullUrl=absoluteAdminUrl(href);
    const emailDelivered=!!fullUrl && await notifyEmail(supportAdminEmail(),`New support request - ${subject}`,message,fullUrl);
    return NextResponse.json({
      emailDelivered,
      success: true,
      supportMessage: { id: supportMessage.id, status: supportMessage.status },
    });
  } catch (error) {
    console.error("Support request error:", error);

    return NextResponse.json(
      { error: "Failed to submit support request." },
      { status: 500 }
    );
  }
}