import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  _req: Request,
  context: { params: Promise<{ agentId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const { agentId } = await context.params;

    const existingAgent = await db.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        approved: true,
      },
    });

    if (!existingAgent) {
      return NextResponse.json(
        { ok: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    await db.user.update({
      where: { id: agentId },
      data: { approved: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("UNAPPROVE_AGENT_ERROR", error);

    return NextResponse.json(
      { ok: false, error: "Failed to block agent" },
      { status: 500 }
    );
  }
}