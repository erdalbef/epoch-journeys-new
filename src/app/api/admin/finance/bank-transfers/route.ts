import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  Role,
} from "@prisma/client";
import { randomUUID } from "crypto";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type TransferBody = {
  fromBankAccountId?: string;
  toBankAccountId?: string;

  amount?: number;
  currency?: string;

  transactionDate?: string | null;

  reference?: string | null;
  notes?: string | null;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(
      authOptions,
    );

    if (
      !session?.user?.id ||
      session.user.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      (await request.json()) as TransferBody;

    const fromBankAccountId =
      body.fromBankAccountId?.trim();

    const toBankAccountId =
      body.toBankAccountId?.trim();

    const amount =
      Number(body.amount);

    const currency =
      body.currency
        ?.trim()
        .toUpperCase() || "EUR";

    const reference =
      body.reference?.trim() ||
      null;

    const notes =
      body.notes?.trim() ||
      null;

    if (!fromBankAccountId) {
      return NextResponse.json(
        {
          error:
            "Source bank or cash account is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!toBankAccountId) {
      return NextResponse.json(
        {
          error:
            "Destination bank or cash account is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      fromBankAccountId ===
      toBankAccountId
    ) {
      return NextResponse.json(
        {
          error:
            "Source and destination accounts must be different.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Transfer amount must be greater than zero.",
        },
        {
          status: 400,
        },
      );
    }

    let transactionDate =
      new Date();

    if (
      body.transactionDate &&
      body.transactionDate.trim()
    ) {
      transactionDate =
        new Date(
          body.transactionDate,
        );

      if (
        Number.isNaN(
          transactionDate.getTime(),
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid transfer date.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const [
      fromAccount,
      toAccount,
    ] = await Promise.all([
      db.bankAccount.findUnique({
        where: {
          id:
            fromBankAccountId,
        },

        select: {
          id: true,
          name: true,
          currency: true,
          isActive: true,
        },
      }),

      db.bankAccount.findUnique({
        where: {
          id:
            toBankAccountId,
        },

        select: {
          id: true,
          name: true,
          currency: true,
          isActive: true,
        },
      }),
    ]);

    if (
      !fromAccount ||
      !fromAccount.isActive
    ) {
      return NextResponse.json(
        {
          error:
            "Source account is not available.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !toAccount ||
      !toAccount.isActive
    ) {
      return NextResponse.json(
        {
          error:
            "Destination account is not available.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      fromAccount.currency !==
      toAccount.currency
    ) {
      return NextResponse.json(
        {
          error:
            "Source and destination accounts must use the same currency in this version.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      currency !==
      fromAccount.currency
    ) {
      return NextResponse.json(
        {
          error:
            "Transfer currency must match the selected accounts.",
        },
        {
          status: 400,
        },
      );
    }

    const transferGroupId =
      randomUUID();

    const result =
      await db.$transaction(
        async (tx) => {
          const transferOut =
            await tx.bankTransaction.create({
              data: {
                bankAccountId:
                  fromAccount.id,

                createdById:
                  session.user.id,

                type:
                  BankTransactionType.TRANSFER_OUT,

                direction:
                  BankTransactionDirection.OUT,

                status:
                  BankTransactionStatus.POSTED,

                amount,

                currency,

                transactionDate,

                reference,

                description:
                  `Transfer to ${toAccount.name}`,

                notes,

                transferGroupId,
              },
            });

          const transferIn =
            await tx.bankTransaction.create({
              data: {
                bankAccountId:
                  toAccount.id,

                createdById:
                  session.user.id,

                type:
                  BankTransactionType.TRANSFER_IN,

                direction:
                  BankTransactionDirection.IN,

                status:
                  BankTransactionStatus.POSTED,

                amount,

                currency,

                transactionDate,

                reference,

                description:
                  `Transfer from ${fromAccount.name}`,

                notes,

                transferGroupId,
              },
            });

          return {
            transferOut,
            transferIn,
          };
        },
      );

    return NextResponse.json(
      {
        success: true,

        transferGroupId,

        fromAccount: {
          id:
            fromAccount.id,

          name:
            fromAccount.name,
        },

        toAccount: {
          id:
            toAccount.id,

          name:
            toAccount.name,
        },

        amount,
        currency,

        transferOut:
          result.transferOut,

        transferIn:
          result.transferIn,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "CREATE_BANK_TRANSFER_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create bank transfer.",
      },
      {
        status: 500,
      },
    );
  }
}