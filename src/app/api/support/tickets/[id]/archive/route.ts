import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isAgent = session.user.role === "AGENT";

  if (!isAdmin && !isAgent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isAdmin) {
    const denied = await requireAdminApiAccess();
    if (denied) return denied;
  } else {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, approved: true, status: true },
    });

    if (
      !user ||
      user.role !== "AGENT" ||
      !user.approved ||
      user.status !== "ACTIVE"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const origin = request.headers.get("origin");

  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  if (body?.action !== "archive" && body?.action !== "restore") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const where = isAdmin
    ? { id }
    : { id, userId: session.user.id };

  const data = isAdmin
    ? { adminArchivedAt: body.action === "archive" ? new Date() : null }
    : { agentArchivedAt: body.action === "archive" ? new Date() : null };

  const result = await db.supportMessage.updateMany({ where, data });

  if (result.count === 0) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    action: body.action,
  });
}
