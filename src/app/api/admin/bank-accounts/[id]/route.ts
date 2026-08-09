import {
  NextResponse,
} from "next/server";

import {
  getServerSession,
} from "next-auth";

import {
  Prisma,
  Role,
} from "@prisma/client";

import {
  authOptions,
} from "@/lib/authOptions";

import {
  db,
} from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function PATCH(
  request: Request,
  context: RouteContext,
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

    const { id } =
      await context.params;

    const account =
      await db.bankAccount.findUnique(
        {
          where: {
            id,
          },

          select: {
            id: true,
            name: true,
            currency: true,
            openingBalance: true,
            currentBalance: true,
            isActive: true,

            _count: {
              select: {
                bankTransactions:
                  true,
              },
            },
          },
        },
      );

    if (!account) {
      return NextResponse.json(
        {
          error:
            "Bank account not found.",
        },
        {
          status: 404,
        },
      );
    }

    const formData =
      await request.formData();

    /*
     * Activate / deactivate without opening
     * the full edit form.
     *
     * Multiple accounts can remain active.
     */
    const toggleActive =
      stringValue(
        formData.get(
          "toggleActive",
        ),
      ) === "true";

    if (toggleActive) {
      const updated =
        await db.bankAccount.update(
          {
            where: {
              id,
            },

            data: {
              isActive:
                !account.isActive,
            },
          },
        );

      return NextResponse.json({
        success: true,
        account:
          updated,
      });
    }

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
        ) ||
        account.currency
      ).toUpperCase();

    const openingBalance =
      Number(
        formData.get(
          "openingBalance",
        ) ??
          account.openingBalance,
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

    const hasLedgerActivity =
      account._count
        .bankTransactions >
      0;

    /*
     * Once an account has financial history,
     * changing the currency would make old
     * transactions inconsistent.
     */
    if (
      hasLedgerActivity &&
      currency !==
        account.currency
    ) {
      return NextResponse.json(
        {
          error:
            "Currency cannot be changed after ledger activity exists.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Opening balance becomes part of the
     * financial history once transactions
     * exist.
     *
     * Later corrections should be made with
     * an ADJUSTMENT transaction rather than
     * rewriting the starting balance.
     */
    if (
      hasLedgerActivity &&
      Math.abs(
        openingBalance -
          account.openingBalance,
      ) >
        0.000001
    ) {
      return NextResponse.json(
        {
          error:
            "Opening balance cannot be changed after ledger activity exists. Use a Bank Ledger adjustment instead.",
        },
        {
          status: 409,
        },
      );
    }

    const updated =
      await db.bankAccount.update(
        {
          where: {
            id,
          },

          data: {
            name,

            currency,

            openingBalance,

            /*
             * currentBalance is intentionally
             * NOT accepted from the client.
             *
             * It is no longer manually editable.
             */
            notes,

            isActive,
          },
        },
      );

    return NextResponse.json({
      success: true,
      account: updated,
    });
  } catch (error) {
    console.error(
      "UPDATE_BANK_ACCOUNT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update bank account.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
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

    const { id } =
      await context.params;

    const account =
      await db.bankAccount.findUnique(
        {
          where: {
            id,
          },

          select: {
            id: true,
            name: true,

            _count: {
              select: {
                bankTransactions:
                  true,

                supplierPayablePayments:
                  true,

                expenses:
                  true,

                refunds:
                  true,

                financeDocuments:
                  true,
              },
            },
          },
        },
      );

    if (!account) {
      return NextResponse.json(
        {
          error:
            "Bank account not found.",
        },
        {
          status: 404,
        },
      );
    }

    const hasFinancialHistory =
      account._count
        .bankTransactions >
        0 ||
      account._count
        .supplierPayablePayments >
        0 ||
      account._count.expenses >
        0 ||
      account._count.refunds >
        0 ||
      account._count
        .financeDocuments >
        0;

    if (hasFinancialHistory) {
      return NextResponse.json(
        {
          error:
            "This account has financial history and cannot be deleted. Deactivate it instead.",
        },
        {
          status: 409,
        },
      );
    }

    await db.bankAccount.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE_BANK_ACCOUNT_ERROR",
      error,
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "This account is linked to financial records and cannot be deleted. Deactivate it instead.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete bank account.",
      },
      {
        status: 500,
      },
    );
  }
}