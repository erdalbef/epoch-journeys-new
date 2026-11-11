import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readSupportAttachment } from "@/lib/storage/supportAttachmentStorage";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "ADMIN") {
    const denied = await requireAdminApiAccess();
    if (denied) return denied;
  } else if (session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else {
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
  }
  const { id } = await context.params;
  const ticket = await db.supportMessage.findUnique({ where: { id }, select: {
    userId: true, attachmentPath: true, attachmentName: true,
  }});
  if (!ticket || (session.user.role !== "ADMIN" && ticket.userId !== session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const stored = ticket.attachmentPath ?? "";
  if (stored.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Legacy attachment requires secure migration." }, { status: 410 });
  }
  try {
    const bytes = await readSupportAttachment(stored);
    if (!bytes) {
      return NextResponse.json({ error: "Attachment unavailable." }, { status: 404 });
    }
    const original = (ticket.attachmentName ?? "document").replace(/[\r\n\"\\]/g, "_");
    return new NextResponse(bytes, { headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${original.replace(/[^\x20-\x7E]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch {
    return NextResponse.json({ error: "Attachment unavailable." }, { status: 404 });
  }
}
