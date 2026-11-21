import "server-only";

import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

/**
 * Call at the beginning of a privileged Admin API handler.
 * Returns null if access is allowed, or a JSON error response otherwise.
 *
 * The database recheck prevents an old JWT from retaining Admin access
 * after a user's role is changed or account is deleted.
 */
export async function requireAdminApiAccess(): Promise<NextResponse | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      );
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 },
      );
    }

    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (currentUser?.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 },
      );
    }

    return null;
  } catch (error) {
    console.error("ADMIN_API_ACCESS_CHECK_ERROR", error);
    // Fail closed if authentication or the database cannot be verified.
    return NextResponse.json(
      { success: false, message: "Authorization temporarily unavailable." },
      { status: 503 },
    );
  }
}
