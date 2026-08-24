import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type ProfileUpdateBody = {
  fullName?: string;
  phone?: string;
  travelAgency?: string;
  website?: string;
  membership?: string;

  billingCompanyName?: string;
  billingCompanyRegNo?: string;
  billingTaxNumber?: string;
  billingVatNumber?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  billingContactName?: string;
  billingEmail?: string;
  billingEmailSecondary?: string;
  billingPhone?: string;
};

function cleanString(
  value: unknown,
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed.length > 0
    ? trimmed
    : null;
}

function cleanEmail(
  value: unknown,
): string | null {
  const cleaned =
    cleanString(value);

  return cleaned
    ? cleaned.toLowerCase()
    : null;
}

export async function PATCH(
  request: Request,
) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const user =
      await db.user.findUnique({
        where: {
          id: session.user.id,
        },

        select: {
          id: true,
          role: true,
          approved: true,
          status: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "User not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      user.role !== "AGENT" ||
      !user.approved ||
      user.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    const body =
      (await request.json()) as ProfileUpdateBody;

    const billingCompanyName =
      cleanString(
        body.billingCompanyName,
      );

    const billingAddress =
      cleanString(
        body.billingAddress,
      );

    const billingCity =
      cleanString(
        body.billingCity,
      );

    const billingPostalCode =
      cleanString(
        body.billingPostalCode,
      );

    const billingCountry =
      cleanString(
        body.billingCountry,
      );

    const billingEmail =
      cleanEmail(
        body.billingEmail,
      );

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

    const updatedUser =
      await db.user.update({
        where: {
          id: user.id,
        },

        data: {
          fullName:
            cleanString(
              body.fullName,
            ),

          phone:
            cleanString(
              body.phone,
            ),

          travelAgency:
            cleanString(
              body.travelAgency,
            ),

          website:
            cleanString(
              body.website,
            ),

          membership:
            cleanString(
              body.membership,
            ),

          billingCompanyName,

          billingCompanyRegNo:
            cleanString(
              body.billingCompanyRegNo,
            ),

          billingTaxNumber:
            cleanString(
              body.billingTaxNumber,
            ),

          billingVatNumber:
            cleanString(
              body.billingVatNumber,
            ),

          billingAddress,

          billingCity,

          billingState:
            cleanString(
              body.billingState,
            ),

          billingPostalCode,

          billingCountry,

          billingContactName:
            cleanString(
              body.billingContactName,
            ),

          billingEmail,

          billingEmailSecondary:
            cleanEmail(
              body.billingEmailSecondary,
            ),

          billingPhone:
            cleanString(
              body.billingPhone,
            ),
        },

        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          travelAgency: true,
          website: true,
          membership: true,

          billingCompanyName:
            true,
          billingCompanyRegNo:
            true,
          billingTaxNumber:
            true,
          billingVatNumber:
            true,
          billingAddress:
            true,
          billingCity: true,
          billingState: true,
          billingPostalCode:
            true,
          billingCountry: true,
          billingContactName:
            true,
          billingEmail: true,
          billingEmailSecondary:
            true,
          billingPhone: true,
        },
      });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "B2B_PROFILE_PATCH_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to update profile.",
      },
      {
        status: 500,
      },
    );
  }
}
