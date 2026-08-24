import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  BankReconciliationStatus,
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TransactionBody = {
  transactionId?: string;
  action?: "attach" | "detach";
};

async function recalculateReconciliation(
  id: string,
  tx: Prisma.TransactionClient,
) {
  const reconciliation =
    await tx.bankReconciliation.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        ledgerOpeningBalance: true,
        statementClosingBalance: true,
        transactions: {
          where: {
            status: BankTransactionStatus.POSTED,
          },
          select: {
            amount: true,
            direction: true,
          },
        },
      },
    });

  if (!reconciliation) {
    throw new Error("Reconciliation not found.");
  }

  let incoming = 0;
  let outgoing = 0;

  for (const transaction of reconciliation.transactions) {
    const amount = Number(transaction.amount);

    if (
      transaction.direction === BankTransactionDirection.IN
    ) {
      incoming += amount;
    } else {
      outgoing += amount;
    }
  }

  const ledgerClosingBalance =
    Number(reconciliation.ledgerOpeningBalance) +
    incoming -
    outgoing;

  const difference =
    Number(reconciliation.statementClosingBalance) -
    ledgerClosingBalance;

  const transactionCount =
    reconciliation.transactions.length;

  await tx.bankReconciliation.update({
    where: {
      id,
    },
    data: {
      ledgerClosingBalance,
      difference,
      status:
        transactionCount > 0
          ? BankReconciliationStatus.IN_PROGRESS
          : BankReconciliationStatus.DRAFT,
      reconciledAt: null,
    },
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      session.user.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const body = (await request.json()) as TransactionBody;

    const transactionId =
      typeof body.transactionId === "string"
        ? body.transactionId.trim()
        : "";

    if (
      !transactionId ||
      (body.action !== "attach" &&
        body.action !== "detach")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid transaction reconciliation request.",
        },
        { status: 400 },
      );
    }

    const reconciliation =
      await db.bankReconciliation.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          bankAccountId: true,
          statementDate: true,
          status: true,
        },
      });

    if (!reconciliation) {
      return NextResponse.json(
        { error: "Reconciliation not found." },
        { status: 404 },
      );
    }

    if (
      reconciliation.status ===
      BankReconciliationStatus.LOCKED
    ) {
      return NextResponse.json(
        {
          error:
            "This reconciliation is locked and its transactions cannot be changed.",
        },
        { status: 409 },
      );
    }

    const previousReconciliation =
      await db.bankReconciliation.findFirst({
        where: {
          bankAccountId:
            reconciliation.bankAccountId,
          id: {
            not: reconciliation.id,
          },
          statementDate: {
            lt: reconciliation.statementDate,
          },
          status: {
            in: [
              BankReconciliationStatus.RECONCILED,
              BankReconciliationStatus.LOCKED,
            ],
          },
        },
        orderBy: {
          statementDate: "desc",
        },
        select: {
          statementDate: true,
        },
      });

    await db.$transaction(async (tx) => {
      const transaction =
        await tx.bankTransaction.findUnique({
          where: {
            id: transactionId,
          },
          select: {
            id: true,
            bankAccountId: true,
            status: true,
            type: true,
            transactionDate: true,
            reconciliationId: true,
          },
        });

      if (!transaction) {
        throw new Error("Bank transaction not found.");
      }

      if (
        transaction.bankAccountId !==
        reconciliation.bankAccountId
      ) {
        throw new Error(
          "This transaction belongs to a different bank account.",
        );
      }

      if (
        transaction.status !==
        BankTransactionStatus.POSTED
      ) {
        throw new Error(
          "Only posted bank transactions can be reconciled.",
        );
      }

      if (
        transaction.type ===
        BankTransactionType.OPENING_BALANCE
      ) {
        throw new Error(
          "Opening-balance transactions are not matched in reconciliation.",
        );
      }

      if (body.action === "attach") {
        if (
          transaction.reconciliationId &&
          transaction.reconciliationId !==
            reconciliation.id
        ) {
          throw new Error(
            "This transaction is already assigned to another reconciliation.",
          );
        }

        if (
          transaction.transactionDate >
          reconciliation.statementDate
        ) {
          throw new Error(
            "The transaction date is after the statement date.",
          );
        }

        if (
          previousReconciliation &&
          transaction.transactionDate <=
            previousReconciliation.statementDate
        ) {
          throw new Error(
            "The transaction belongs to a previously reconciled statement period.",
          );
        }

        await tx.bankTransaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            reconciliationId: reconciliation.id,
            reconciledAt: new Date(),
          },
        });
      } else {
        if (
          transaction.reconciliationId !==
          reconciliation.id
        ) {
          throw new Error(
            "This transaction is not assigned to this reconciliation.",
          );
        }

        await tx.bankTransaction.update({
          where: {
            id: transaction.id,
          },
          data: {
            reconciliationId: null,
            reconciledAt: null,
          },
        });
      }

      await recalculateReconciliation(
        reconciliation.id,
        tx,
      );
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "MATCH_BANK_RECONCILIATION_TRANSACTION_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update reconciliation transaction.",
      },
      { status: 500 },
    );
  }
}
