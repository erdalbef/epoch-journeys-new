import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "path";
import { unlink } from "fs/promises";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        approved: true,
        status: true,
        agentLogoUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.role !== "AGENT" || !user.approved || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (user.agentLogoUrl) {
      try {
        const relativePath = user.agentLogoUrl.replace(/^\/+/, "");
        const absolutePath = path.join(process.cwd(), "public", relativePath);
        await unlink(absolutePath);
      } catch (error) {
        console.error("LOGO_FILE_DELETE_WARNING", error);
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        agentLogoUrl: null,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("LOGO_DELETE_ERROR", error);

    return NextResponse.json(
      { error: "Failed to remove logo." },
      { status: 500 }
    );
  }
}