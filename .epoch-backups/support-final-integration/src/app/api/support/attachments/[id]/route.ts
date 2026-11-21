import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { readFile } from "fs/promises";
import path from "path";
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
  }
  const { id } = await context.params;
  const ticket = await db.supportMessage.findUnique({ where: { id }, select: {
    userId: true, attachmentPath: true, attachmentName: true,
  }});
  if (!ticket || (session.user.role !== "ADMIN" && ticket.userId !== session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const stored = ticket.attachmentPath ?? "";
  if (!/^private:support\/[a-f0-9-]{36}\.(xlsx|xls|csv|pdf|doc|docx)$/i.test(stored)) {
    // Do not redirect to old publicly hosted files.
    return NextResponse.json({ error: "Legacy attachment requires secure migration." }, { status: 410 });
  }
  const name = stored.split("/").pop() ?? "";
  try {
    const bytes = await readFile(path.join(process.cwd(), "private", "support", name));
    const original = (ticket.attachmentName ?? "document").replace(/[\r\n\"\\]/g, "_");
    return new NextResponse(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${original.replace(/[^\x20-\x7E]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch {
    return NextResponse.json({ error: "Attachment unavailable." }, { status: 404 });
  }
}
