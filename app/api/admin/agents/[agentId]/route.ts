import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;

    const existingAgent = await db.user.findUnique({
      where: { id: agentId },
    });

    if (!existingAgent) {
      return NextResponse.json(
        { success: false, message: "Agent not found." },
        { status: 404 }
      );
    }

    await db.user.delete({
      where: { id: agentId },
    });

    return NextResponse.json({
      success: true,
      message: "Agent deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE_AGENT_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete agent." },
      { status: 500 }
    );
  }
}