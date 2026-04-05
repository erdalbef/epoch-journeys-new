import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPartnerRequestEmail } from "@/lib/email/templates/sendPartnerRequestEmail";
import { sendPartnerRequestConfirmationEmail } from "@/lib/email/templates/sendPartnerRequestConfirmationEmail";

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
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "";
}

async function verifyTurnstile(token: string, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return {
      success: false,
      error: "missing-secret",
      errorCodes: ["missing-secret"],
      hostname: null,
    };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });

    if (ip) {
      body.append("remoteip", ip);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = (await response.json()) as {
      success: boolean;
      "error-codes"?: string[];
      hostname?: string;
    };

    return {
      success: data.success,
      errorCodes: data["error-codes"] ?? [],
      hostname: data.hostname ?? null,
    };
  } catch (error) {
    console.error("TURNSTILE_VERIFY_REQUEST_FAILED", error);

    return {
      success: false,
      error: "verification-request-failed",
      errorCodes: ["verification-request-failed"],
      hostname: null,
    };
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || null;

    const rate = checkRateLimit(
      `partner-request:${ip || "unknown"}`,
      5,
      10 * 60 * 1000
    );

    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rate.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const body = (await req.json()) as {
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
    } = body;

    // Honeypot protection
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

    if (!turnstileToken?.trim()) {
      return NextResponse.json(
        { error: "Security verification is required." },
        { status: 400 }
      );
    }

    const turnstile = await verifyTurnstile(turnstileToken, ip || undefined);

    console.log("TURNSTILE_RESULT", {
      success: turnstile.success,
      hostname: turnstile.hostname,
      errorCodes: turnstile.errorCodes,
      ip,
      email: normalizedEmail,
    });

    if (!turnstile.success) {
      console.error("TURNSTILE_VERIFICATION_FAILED", {
        email: normalizedEmail,
        ip,
        hostname: turnstile.hostname,
        errorCodes: turnstile.errorCodes,
      });

      return NextResponse.json(
        {
          error:
            "Security verification failed. Please retry the security check.",
        },
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
        signupIp: ip || "unknown",
        signupUserAgent: userAgent,
      },
    });

    try {
      await sendPartnerRequestEmail({
        fullName: fullName.trim(),
        email: normalizedEmail,
        partnerType,
        travelAgency: travelAgency?.trim() || null,
        phone: phone.trim(),
        website: website?.trim() || null,
        membership: membership.trim(),
      });
    } catch (error) {
      console.error("ADMIN_EMAIL_ERROR", error);
    }

    try {
      await sendPartnerRequestConfirmationEmail({
        fullName: fullName.trim(),
        email: normalizedEmail,
      });
    } catch (error) {
      console.error("CONFIRMATION_EMAIL_ERROR", error);
    }

    return NextResponse.json({
      success: true,
      message: "Request submitted. Pending approval.",
    });
  } catch (error) {
    console.error("PARTNER_REQUEST_ERROR", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}