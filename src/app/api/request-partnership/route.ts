import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PartnerType } from "@prisma/client";

import { db } from "@/lib/db";

type PartnershipRequestBody = {
  email?: string;
  password?: string;
  fullName?: string;

  travelAgency?: string | null;
  phone?: string | null;
  website?: string | null;
  membership?: string | null;
  partnerType?: string;

  billingCompanyName?: string;
  billingCompanyRegNo?: string | null;
  billingTaxNumber?: string | null;
  billingVatNumber?: string | null;

  billingAddress?: string;
  billingCity?: string;
  billingState?: string | null;
  billingPostalCode?: string;
  billingCountry?: string;

  billingContactName?: string | null;
  billingEmail?: string;
  billingEmailSecondary?: string | null;
  billingPhone?: string | null;
};

function cleanOptional(
  value: unknown,
) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned || null;
}

function cleanRequired(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizeEmail(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .toLowerCase()
    : "";
}

function resolvePartnerType(
  value: unknown,
): PartnerType {
  switch (value) {
    case PartnerType.TRAVEL_AGENCY:
      return PartnerType.TRAVEL_AGENCY;

    case PartnerType.TOUR_OPERATOR:
      return PartnerType.TOUR_OPERATOR;

    case PartnerType.TRAVEL_EXPERT:
      return PartnerType.TRAVEL_EXPERT;

    case PartnerType.GROUP_LEADER:
      return PartnerType.GROUP_LEADER;

    default:
      return PartnerType.TRAVEL_AGENCY;
  }
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as PartnershipRequestBody;

    const email =
      normalizeEmail(
        body.email,
      );

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    const fullName =
      cleanRequired(
        body.fullName,
      );

    const billingCompanyName =
      cleanRequired(
        body.billingCompanyName,
      );

    const billingAddress =
      cleanRequired(
        body.billingAddress,
      );

    const billingCity =
      cleanRequired(
        body.billingCity,
      );

    const billingPostalCode =
      cleanRequired(
        body.billingPostalCode,
      );

    const billingCountry =
      cleanRequired(
        body.billingCountry,
      );

    const billingEmail =
      normalizeEmail(
        body.billingEmail,
      );

    if (
      !email ||
      !password ||
      !fullName
    ) {
      return NextResponse.json(
        {
          error:
            "Full name, email, and password are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      password.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 6 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !billingCompanyName ||
      !billingAddress ||
      !billingCity ||
      !billingPostalCode ||
      !billingCountry ||
      !billingEmail
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete all required Billing & Invoice Details.",
        },
        {
          status: 400,
        },
      );
    }

    const existingUser =
      await db.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists.",
        },
        {
          status: 400,
        },
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10,
      );

    const newUser =
      await db.user.create({
        data: {
          email,
          password:
            hashedPassword,

          fullName,

          travelAgency:
            cleanOptional(
              body.travelAgency,
            ),

          phone:
            cleanOptional(
              body.phone,
            ),

          website:
            cleanOptional(
              body.website,
            ),

          membership:
            cleanOptional(
              body.membership,
            ),

          role: "AGENT",

          approved: false,

          status: "ACTIVE",

          partnerType:
            resolvePartnerType(
              body.partnerType,
            ),

          billingCompanyName,

          billingCompanyRegNo:
            cleanOptional(
              body.billingCompanyRegNo,
            ),

          billingTaxNumber:
            cleanOptional(
              body.billingTaxNumber,
            ),

          billingVatNumber:
            cleanOptional(
              body.billingVatNumber,
            ),

          billingAddress,

          billingCity,

          billingState:
            cleanOptional(
              body.billingState,
            ),

          billingPostalCode,

          billingCountry,

          billingContactName:
            cleanOptional(
              body.billingContactName,
            ) || fullName,

          billingEmail,

          billingEmailSecondary:
            normalizeEmail(
              body.billingEmailSecondary,
            ) || null,

          billingPhone:
            cleanOptional(
              body.billingPhone,
            ),
        },
      });

    return NextResponse.json(
      {
        success: true,
        userId:
          newUser.id,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Partnership request error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit request.",
      },
      {
        status: 500,
      },
    );
  }
}
