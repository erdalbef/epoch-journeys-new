import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

type PartnerType =
  | "TOUR_OPERATOR"
  | "TRAVEL_AGENCY"
  | "TRAVEL_EXPERT"
  | "GROUP_LEADER";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim().toLowerCase());
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return req.headers.get("x-real-ip") || "unknown";
}

async function verifyTurnstile(token: string, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return { success: false, error: "Turnstile secret key is missing." };
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    }
  );

  const data = (await response.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };

  return {
    success: data.success,
    error: data["error-codes"]?.join(", ") || null,
  };
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || null;

    const rate = checkRateLimit(`partner-request:${ip}`, 5, 10 * 60 * 1000);

    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rate.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();

    const {
      partnerType,
      fullName,
      travelAgency,
      phone,
      website,
      membership,
      email,
      password,
      companyName,
      turnstileToken,
    } = body as {
      partnerType?: PartnerType;
      fullName?: string;
      travelAgency?: string | null;
      phone?: string;
      website?: string | null;
      membership?: string;
      email?: string;
      password?: string;
      companyName?: string;
      turnstileToken?: string;
    };

    if (companyName && companyName.trim() !== "") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    if (
      partnerType !== "TOUR_OPERATOR" &&
      partnerType !== "TRAVEL_AGENCY" &&
      partnerType !== "TRAVEL_EXPERT" &&
      partnerType !== "GROUP_LEADER"
    ) {
      return NextResponse.json(
        { error: "Partner type is required." },
        { status: 400 }
      );
    }

    if (!fullName?.trim()) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    if (!phone?.trim()) {
      return NextResponse.json(
        { error: "Phone is required." },
        { status: 400 }
      );
    }

    const websiteRequired =
      partnerType === "TOUR_OPERATOR" || partnerType === "TRAVEL_AGENCY";

    const agencyRequired =
      partnerType === "TOUR_OPERATOR" || partnerType === "TRAVEL_AGENCY";

    if (agencyRequired && !travelAgency?.trim()) {
      return NextResponse.json(
        { error: "Travel Agency is required." },
        { status: 400 }
      );
    }

    if (websiteRequired && !website?.trim()) {
      return NextResponse.json(
        { error: "Website is required." },
        { status: 400 }
      );
    }

    if (!membership?.trim()) {
      return NextResponse.json(
        { error: "Membership is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email?.trim().toLowerCase() || "";

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Valid email is required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (!turnstileToken) {
      return NextResponse.json(
        { error: "Security verification is required." },
        { status: 400 }
      );
    }

    const turnstile = await verifyTurnstile(turnstileToken, ip);

    if (!turnstile.success) {
      return NextResponse.json(
        { error: "Security verification failed. Please try again." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: "AGENT",
        approved: false,
        status: "ACTIVE",
        partnerType,
        fullName: fullName.trim(),
        travelAgency: travelAgency?.trim() || null,
        phone: phone.trim(),
        website: website?.trim() || null,
        membership: membership.trim(),
        signupIp: ip,
        signupUserAgent: userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Request submitted. Pending approval.",
    });
  } catch (error) {
    console.error("Partner request error:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}