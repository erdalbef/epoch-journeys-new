import {
  NextResponse,
} from "next/server";

import {
  getServerSession,
} from "next-auth";

import {
  Role,
} from "@prisma/client";

import {
  authOptions,
} from "@/lib/authOptions";

import {
  db,
} from "@/lib/db";

function stringValue(
  value:
    | FormDataEntryValue
    | null,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed || null;
}

export async function POST(
  request: Request,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
      session.user.role !==
        Role.ADMIN
    ) {
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

    const formData =
      await request.formData();

    const name =
      stringValue(
        formData.get(
          "name",
        ),
      );

    const currency =
      (
        stringValue(
          formData.get(
            "currency",
          ),
        ) || "EUR"
      ).toUpperCase();

    const openingBalance =
      Number(
        formData.get(
          "openingBalance",
        ) ?? 0,
      );

    const notes =
      stringValue(
        formData.get(
          "notes",
        ),
      );

    const isActive =
      formData.get(
        "isActive",
      ) === "on";

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Account name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      currency.length !==
      3
    ) {
      return NextResponse.json(
        {
          error:
            "Currency must be a 3-letter code such as EUR, USD or GBP.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(
        openingBalance,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Opening balance is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Multiple accounts may be active.
     *
     * isActive means available for finance
     * transactions, not "the one selected
     * account".
     */

    const account =
      await db.bankAccount.create(
        {
          data: {
            name,

            currency,

            openingBalance,

            /*
             * Retain currentBalance for
             * compatibility with the existing
             * Prisma model.
             *
             * On creation it starts equal to
             * the opening balance.
             */
            currentBalance:
              openingBalance,

            isActive,

            notes,
          },
        },
      );

    return NextResponse.json(
      {
        success: true,
        account,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "CREATE_BANK_ACCOUNT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create bank account.",
      },
      {
        status: 500,
      },
    );
  }
}