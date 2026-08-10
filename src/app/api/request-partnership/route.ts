import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  PartnerType,
  Role,
} from "@prisma/client";

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

  billingContactName?: string | null;
  billingCompanyName?: string | null;
  billingEmail?: string | null;
  billingEmailSecondary?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  billingTaxNumber?: string | null;
};

function cleanOptionalString(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function cleanRequiredString(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeEmail(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase();
}

function getPartnerType(
  value: unknown,
): PartnerType {
  if (
    typeof value === "string" &&
    Object.values(PartnerType).includes(
      value as PartnerType,
    )
  ) {
    return value as PartnerType;
  }

  return PartnerType.TRAVEL_AGENCY;
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
      cleanRequiredString(
        body.fullName,
      );

    const billingContactName =
      cleanRequiredString(
        body.billingContactName,
      );

    const billingCompanyName =
      cleanRequiredString(
        body.billingCompanyName,
      );

    const billingEmail =
      normalizeEmail(
        body.billingEmail,
      );

    const billingAddress =
      cleanRequiredString(
        body.billingAddress,
      );

    const billingCity =
      cleanRequiredString(
        body.billingCity,
      );

    const billingCountry =
      cleanRequiredString(
        body.billingCountry,
      );

    /*
     * -------------------------------------------------------
     * REQUIRED ACCOUNT INFORMATION
     * -------------------------------------------------------
     */

    if (
      !email ||
      !password ||
      !fullName
    ) {
      return NextResponse.json(
        {
          error:
            "Email, password and full name are required.",
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

    /*
     * -------------------------------------------------------
     * REQUIRED BILLING INFORMATION
     * -------------------------------------------------------
     */

    if (
      !billingContactName ||
      !billingCompanyName ||
      !billingEmail ||
      !billingAddress ||
      !billingCity ||
      !billingCountry
    ) {
      return NextResponse.json(
        {
          error:
            "Complete the required Billing & Invoice Information.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * PREVENT DUPLICATE EMAIL
     * -------------------------------------------------------
     */

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
            "A user with this email already exists.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * PASSWORD
     * -------------------------------------------------------
     */

    const hashedPassword =
      await bcrypt.hash(
        password,
        10,
      );

    /*
     * -------------------------------------------------------
     * CREATE PARTNER
     * -------------------------------------------------------
     */

    const newUser =
      await db.user.create({
        data: {
          email,

          password:
            hashedPassword,

          fullName,

          travelAgency:
            cleanOptionalString(
              body.travelAgency,
            ),

          phone:
            cleanOptionalString(
              body.phone,
            ),

          website:
            cleanOptionalString(
              body.website,
            ),

          membership:
            cleanOptionalString(
              body.membership,
            ),

          role:
            Role.AGENT,

          approved:
            false,

          /*
           * Your Prisma schema currently uses
           * the string value ACTIVE here rather
           * than a UserStatus enum.
           */
          status:
            "ACTIVE",

          /*
           * Preserve all supported partner types:
           *
           * TRAVEL_AGENCY
           * GROUP_LEADER
           * TOUR_OPERATOR
           * TRAVEL_EXPERT
           */
          partnerType:
            getPartnerType(
              body.partnerType,
            ),

          /*
           * -------------------------------------------------
           * BILLING / INVOICE INFORMATION
           * -------------------------------------------------
           */

          billingContactName,

          billingCompanyName,

          billingEmail,

          billingEmailSecondary:
            normalizeEmail(
              body.billingEmailSecondary,
            ) || null,

          billingAddress,

          billingCity,

          billingPostalCode:
            cleanOptionalString(
              body.billingPostalCode,
            ),

          billingCountry,

          /*
           * Optional.
           *
           * Some organizations may not have an
           * applicable Tax / Company Registration
           * Number.
           */
          billingTaxNumber:
            cleanOptionalString(
              body.billingTaxNumber,
            ),

          /*
           * VAT number is intentionally not
           * requested on the Partnership form.
           */
        },
      });

    return NextResponse.json(
      {
        success: true,

        userId:
          newUser.id,

        message:
          "Partnership request submitted successfully.",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "PARTNERSHIP_REQUEST_ERROR",
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