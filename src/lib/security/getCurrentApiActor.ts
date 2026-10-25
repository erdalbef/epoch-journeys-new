import "server-only";

import { AgentStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Actor = { id: string; role: Role };
type Access =
  | { actor: Actor; response?: never }
  | { actor?: never; response: NextResponse };

/** Recheck the database on each sensitive request, not only the session JWT. */
export async function getCurrentApiActor(): Promise<Access> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return {
        response: NextResponse.json(
          { success: false, message: "Authentication required." },
          { status: 401 },
        ),
      };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, approved: true, status: true },
    });

    if (!user) {
      return {
        response: NextResponse.json(
          { success: false, message: "Authentication required." },
          { status: 401 },
        ),
      };
    }

    if (user.role === Role.ADMIN) {
      return { actor: { id: user.id, role: user.role } };
    }

    if (
      user.role === Role.AGENT &&
      user.approved &&
      user.status === AgentStatus.ACTIVE
    ) {
      return { actor: { id: user.id, role: user.role } };
    }

    return {
      response: NextResponse.json(
        { success: false, message: "Access denied." },
        { status: 403 },
      ),
    };
  } catch (error) {
    console.error("API_ACTOR_CHECK_ERROR", error);
    return {
      response: NextResponse.json(
        { success: false, message: "Authorization temporarily unavailable." },
        { status: 503 },
      ),
    };
  }
}
