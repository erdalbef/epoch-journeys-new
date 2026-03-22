import { NextResponse } from "next/server";
import { db} from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { agentApprovalEmail } from "@/lib/email/templates/agentApprovalEmail";

function normalizeAgentCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

async function generateUniqueAgentCode(fullName?: string | null): Promise<string> {
  const cleanedName = (fullName ?? "").trim();

  let baseCode = "AGT";

  if (cleanedName) {
    const parts = cleanedName
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 1) {
      baseCode = normalizeAgentCode(parts[0].slice(0, 3)) || "AGT";
    } else {
      baseCode =
        normalizeAgentCode(parts.map((part) => part[0]).join("")) || "AGT";
    }
  }

  baseCode = baseCode.slice(0, 6) || "AGT";

  let counter = 0;

  while (true) {
    const candidate =
      counter === 0 ? baseCode : `${baseCode}${String(counter)}`;

    const existing = await db.user.findFirst({
      where: {
        agentCode: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }

    counter += 1;
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;

    const existingAgent = await db.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        email: true,
        fullName: true,
        approved: true,
        agentCode: true,
      },
    });

    if (!existingAgent) {
      return NextResponse.json(
        { success: false, message: "Agent not found." },
        { status: 404 }
      );
    }

    if (existingAgent.approved) {
      return NextResponse.json(
        { success: false, message: "Agent already approved." },
        { status: 400 }
      );
    }

    let agentCode = existingAgent.agentCode;

    if (!agentCode) {
      agentCode = await generateUniqueAgentCode(existingAgent.fullName);
    }

    const agent = await db.user.update({
      where: { id: agentId },
      data: {
        approved: true,
        agentCode,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        agentCode: true,
      },
    });

    try {
      await sendEmail({
        to: agent.email,
        subject: "Your Epoch Journeys Agent Account Has Been Approved",
        html: agentApprovalEmail(agent.fullName || "Partner"),
      });
    } catch (emailError) {
      console.error("EMAIL_ERROR", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Agent approved and email sent.",
      agentCode: agent.agentCode,
    });
  } catch (error) {
    console.error("APPROVE_AGENT_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to approve agent." },
      { status: 500 }
    );
  }
}