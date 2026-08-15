import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      email,
      password,
      fullName,
      travelAgency,
      phone,
      website,
      membership,
      partnerType,
    } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        fullName: fullName.trim(),
        travelAgency: travelAgency?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        membership: membership?.trim() || null,

        role: "AGENT",
        approved: false, // 🔥 IMPORTANT
        status: "ACTIVE",

        partnerType:
          partnerType === "GROUP_LEADER"
            ? "GROUP_LEADER"
            : "TRAVEL_AGENCY",
      },
    });

    return NextResponse.json({
      success: true,
      userId: newUser.id,
    });
  } catch (error) {
    console.error("Partnership request error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit request.",
      },
      { status: 500 }
    );
  }
}