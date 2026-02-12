import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendAgentApprovedEmail } from "@/lib/email";
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

    if (!agentId) {
      return NextResponse.json(
        { ok: false, error: "Missing agentId" },
        { status: 400 }
      );
    }

    const agent = await db.user.update({
      where: { id: agentId },
      data: { approved: true },
      select: { id: true, email: true, approved: true },
    });

    // Email send should NOT block approval
    try {
      await sendAgentApprovedEmail(agent.email);
    } catch (emailErr) {
      console.warn("Approval email failed:", emailErr);
    }

    return NextResponse.json({ ok: true, agent });
  } catch (err) {
    console.error("Approve agent failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to approve agent" },
      { status: 500 }
    );
  }
}
