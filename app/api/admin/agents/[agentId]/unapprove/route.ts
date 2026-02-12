import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendAgentUnapprovedEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { agentId } = await params;

    const agent = await db.user.update({
      where: { id: agentId },
      data: { approved: false },
      select: { email: true },
    });

    try {
      await sendAgentUnapprovedEmail(agent.email);
    } catch {
      // ignore email failure
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to block agent" },
      { status: 500 }
    );
  }
}
