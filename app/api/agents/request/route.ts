import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

type PartnerType = "TRAVEL_AGENT" | "GROUP_LEADER";

function isValidEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(trimmed);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      partnerType?: PartnerType;
      fullName?: string;
      travelAgency?: string;
      phone?: string | null;
      website?: string | null;
      membership?: string | null;
      email?: string;
      password?: string;
    };

    const partnerType = body.partnerType;
    const fullName = (body.fullName ?? "").trim();
    const travelAgency = (body.travelAgency ?? "").trim();

    const emailRaw = body.email ?? "";
    const password = body.password ?? "";
    const email = emailRaw.trim().toLowerCase();

    if (partnerType !== "TRAVEL_AGENT" && partnerType !== "GROUP_LEADER") {
      return NextResponse.json({ ok: false, error: "Partner Type is required." }, { status: 400 });
    }

    if (!fullName) {
      return NextResponse.json({ ok: false, error: "Full name is required." }, { status: 400 });
    }

    if (!travelAgency) {
      return NextResponse.json({ ok: false, error: "Travel Agency is required." }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address (example: name@domain.com)." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.role === "AGENT" && existing.approved === false) {
        return NextResponse.json(
          { ok: false, error: "You already requested partnership access. Your request is pending approval." },
          { status: 409 }
        );
      }

      if (existing.role === "AGENT" && existing.approved === true) {
        return NextResponse.json(
          { ok: false, error: "Your account is already approved. Please sign in." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { ok: false, error: "This email is already registered. Please sign in." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        password: hashed,
        role: "AGENT",
        approved: false,

        partnerType,
        fullName,
        travelAgency,
        phone: body.phone?.trim() || null,
        website: body.website?.trim() || null,
        membership: body.membership?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        approved: true,
        role: true,
        partnerType: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err) {
    console.error("Request partnership failed:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
