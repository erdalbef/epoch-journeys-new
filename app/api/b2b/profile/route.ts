import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type ProfileUpdateBody = {
  fullName?: string;
  phone?: string;
  travelAgency?: string;
};

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(request: Request) {
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
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.role !== "AGENT" || !user.approved || user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as ProfileUpdateBody;

    const fullName = cleanString(body.fullName);
    const phone = cleanString(body.phone);
    const travelAgency = cleanString(body.travelAgency);

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        fullName,
        phone,
        travelAgency,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        travelAgency: true,
        agentLogoUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("B2B_PROFILE_PATCH_ERROR", error);

    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}