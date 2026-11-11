import { queueNotificationEmail } from "@/lib/email/notificationOutbox";
import { deliverNotificationEmail } from "@/lib/email/notificationDelivery";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { saveSupportAttachment } from "@/lib/storage/supportAttachmentStorage";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { describeSupportTicket, getLastSupportReplies } from "@/lib/support/ticketActivity";
import { checkRateLimit } from "@/lib/rate-limit";
import { absoluteAdminUrl, createAdminAlert, supportAdminEmail } from "@/lib/support/notifications";

const ALLOWED_EXT = new Set([".xlsx", ".xls", ".csv", ".pdf", ".doc", ".docx"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function GET(request: Request) {
  const archived = new URL(request.url).searchParams.get('archived') === '1';
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Agent access required." }, { status: 403 });
  }
  const currentAgent = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, approved: true, status: true },
  });

  if (
    !currentAgent ||
    currentAgent.role !== "AGENT" ||
    !currentAgent.approved ||
    currentAgent.status !== "ACTIVE"
  ) {
    return NextResponse.json(
      { error: "Agent account is not authorized." },
      { status: 403 }
    );
  }

  const tickets = await db.supportMessage.findMany({
    where: { userId: session.user.id, agentArchivedAt: archived ? { not: null } : null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, subject: true, message: true, status: true, createdAt: true,
      requestType: true, bookingId: true, attachmentName: true, agentArchivedAt: true },
  });
  const latest = await getLastSupportReplies(tickets.map(t => t.id));
  const withActivity = tickets.map(t => ({ ...t, ...describeSupportTicket(t.status, t.createdAt, latest.get(t.id)) }))
    .sort((a,b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  return NextResponse.json({ tickets: withActivity }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "AGENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentAgent = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        approved: true,
        status: true,
      },
    });

    if (
      !currentAgent ||
      currentAgent.role !== "AGENT" ||
      !currentAgent.approved ||
      currentAgent.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        { error: "Agent account is not authorized." },
        { status: 403 }
      );
    }

    const origin = request.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== request.headers.get("host")) {
          return NextResponse.json(
            { error: "Invalid request origin." },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid request origin." },
          { status: 403 }
        );
      }
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
      const extension = uploadedFile.name.substring(uploadedFile.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_EXT.has(extension) || uploadedFile.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "Invalid attachment type or size (10 MB maximum)." }, { status: 400 });
      }
      attachmentPath = await saveSupportAttachment(uploadedFile);
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
    const eventKey=`support-new:${supportMessage.id}`;
    try {
      await createAdminAlert(
        eventKey,
        "New agent support request",
        subject,
        href
      );
    } catch (error) {
      console.error(
        "Support request saved, but Admin alert failed",
        error
      );
    }
    const fullUrl=absoluteAdminUrl(href);
    let emailQueued=false;
    let emailDelivered=false;
    if(fullUrl){
      try {
        const queued=await queueNotificationEmail({
          eventKey,
          recipient:supportAdminEmail(),
          subject:`New support request - ${subject}`,
          body:message,
          targetUrl:fullUrl,
        });
        emailQueued=queued.queued || queued.alreadyExists;
        emailDelivered=(await deliverNotificationEmail(eventKey))==="ACCEPTED";
      } catch(error){
        console.error("Support notification queue error",error);
      }
    }
    return NextResponse.json({
      emailDelivered, emailQueued,
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