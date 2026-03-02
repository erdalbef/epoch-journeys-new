// app/api/agents/request/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(email);
}

function normalizeText(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

// Allow "none" for website input (store null)
function normalizeWebsite(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.toLowerCase() === "none") return null;
  if (v.toLowerCase() === "n/a") return null;
  if (v.toLowerCase() === "na") return null;

  // If user types "example.com" without protocol, add https://
  const withProtocol = v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
  return withProtocol;
}

function isValidWebsiteUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Optional phone sanity check (very forgiving)
function normalizePhone(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  // keep +, digits, space, parentheses, hyphen
  const cleaned = v.replace(/[^\d+\-\s()]/g, "");
  return cleaned || null;
}

type PartnerType =
  | "TOUR_OPERATOR"
  | "TRAVEL_AGENCY"
  | "TRAVEL_EXPERT"
  | "GROUP_LEADER";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      email: string;
      password: string;
      fullName: string;
      travelAgency: string;
      phone: string;
      website: string; // required in UI, but can be "none"
      membership: string; // optional for now (you can make required later)
      partnerType: PartnerType; // optional (defaults TRAVEL_AGENT)
    }>;

    const email = normalizeEmail(body.email ?? "");
    const password = body.password ?? "";

    const fullName = normalizeText(body.fullName);
    const travelAgency = normalizeText(body.travelAgency);
    const membership = normalizeText(body.membership);
    const phone = normalizePhone(normalizeText(body.phone));

    // ✅ Website: required as a field in the UI, but can be "none"
    const websiteRaw = normalizeText(body.website);
    const website = normalizeWebsite(websiteRaw);

    // partnerType: optional -> defaults TRAVEL_AGENT

    const allowedTypes: PartnerType[] = [
  "TOUR_OPERATOR",
  "TRAVEL_AGENCY",
  "TRAVEL_EXPERT",
  "GROUP_LEADER",
];

const partnerType: PartnerType = allowedTypes.includes(
  body.partnerType as PartnerType
)
  ? (body.partnerType as PartnerType)
  : "TRAVEL_AGENCY";

    // --------------------
    // Validation
    // --------------------
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

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Recommended required fields to reduce fake requests
    if (!fullName) {
      return NextResponse.json(
        { ok: false, error: "Full Name is required." },
        { status: 400 }
      );
    }

    if (!travelAgency) {
      return NextResponse.json(
        { ok: false, error: "Travel Agency is required." },
        { status: 400 }
      );
    }

    // Website field is required in the form, but we accept "none" -> null
    // If user provided a real value, validate it
    if (website !== null && !isValidWebsiteUrl(website)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Website must be a valid URL (e.g., "https://example.com") or type "none".',
        },
        { status: 400 }
      );
    }

    // --------------------
    // Existing user checks
    // --------------------
    const existing = await db.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.role === "AGENT" && existing.approved === false) {
        return NextResponse.json(
          {
            ok: false,
            error: "You already requested partnership access. Your request is pending approval.",
          },
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

    // --------------------
    // Create user
    // --------------------
    const hashed = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        password: hashed,
        role: "AGENT",
        approved: false,

        // profile fields
        fullName,
        travelAgency,
        phone,
        website, // null if "none"
        membership: membership || null,

        partnerType,
      },
      select: {
        id: true,
        email: true,
        role: true,
        approved: true,
        partnerType: true,
        fullName: true,
        travelAgency: true,
        phone: true,
        website: true,
        membership: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err) {
    console.error("POST /api/agents/request failed:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
