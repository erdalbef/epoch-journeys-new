
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/sendEmail";
import { agentApprovalEmail } from "@/lib/email/templates/agentApprovalEmail";

export async function POST(
  req: Request,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;

    console.log("agentId:", agentId);

    const existingAgent = await prisma.user.findUnique({
      where: { id: agentId },
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

    const agent = await prisma.user.update({
      where: { id: agentId },
      data: { approved: true },
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
    });
  } catch (error) {
    console.error("APPROVE_AGENT_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to approve agent." },
      { status: 500 }
    );
  }
}