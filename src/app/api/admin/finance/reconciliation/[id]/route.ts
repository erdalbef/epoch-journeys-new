import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  BankReconciliationStatus,
  BankTransactionDirection,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateBody = {
  action?: "update" | "reconcile" | "lock";
  statementOpeningBalance?: number;
  statementClosingBalance?: number;
  notes?: string;
};

function asFiniteNumber(value: unknown) {
  const parsed =
    typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

async function recalculateReconciliation(id: string) {
  const reconciliation = await db.bankReconciliation.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      ledgerOpeningBalance: true,
      statementClosingBalance: true,
      transactions: {
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

  return db.bankReconciliation.update({
    where: {
      id,
    },
    data: {
      ledgerClosingBalance,
      difference,
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
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    const reconciliation = await db.bankReconciliation.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        status: true,
        difference: true,
        statementOpeningBalance: true,
        statementClosingBalance: true,
        ledgerOpeningBalance: true,
      },
    });

    if (!reconciliation) {
      return NextResponse.json(
        {
          error: "Reconciliation not found.",
        },
        {
          status: 404,
        },
      );
    }

    const body = (await request.json()) as UpdateBody;
    const action = body.action || "update";

    if (
      reconciliation.status === BankReconciliationStatus.LOCKED
    ) {
      return NextResponse.json(
        {
          error:
            "This reconciliation is locked and can no longer be changed.",
        },
        {
          status: 409,
        },
      );
    }

    if (action === "update") {
      const statementOpeningBalance = asFiniteNumber(
        body.statementOpeningBalance,
      );

      const statementClosingBalance = asFiniteNumber(
        body.statementClosingBalance,
      );

      if (
        statementOpeningBalance === null ||
        statementClosingBalance === null
      ) {
        return NextResponse.json(
          {
            error: "Statement balances are invalid.",
          },
          {
            status: 400,
          },
        );
      }

      const notes =
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null;

      await db.bankReconciliation.update({
        where: {
          id,
        },
        data: {
          statementOpeningBalance,
          statementClosingBalance,
          notes,
          status:
            reconciliation.status ===
            BankReconciliationStatus.RECONCILED
              ? BankReconciliationStatus.IN_PROGRESS
              : reconciliation.status,
          reconciledAt:
            reconciliation.status ===
            BankReconciliationStatus.RECONCILED
              ? null
              : undefined,
        },
      });

      await recalculateReconciliation(id);

      return NextResponse.json({
        success: true,
      });
    }

    if (action === "reconcile") {
      const recalculated = await recalculateReconciliation(id);

      if (Math.abs(Number(recalculated.difference)) >= 0.005) {
        return NextResponse.json(
          {
            error:
              "The reconciliation difference must be zero before the statement can be marked reconciled.",
          },
          {
            status: 409,
          },
        );
      }

      const openingDifference =
        Number(recalculated.statementOpeningBalance) -
        Number(recalculated.ledgerOpeningBalance);

      if (Math.abs(openingDifference) >= 0.005) {
        return NextResponse.json(
          {
            error:
              "The statement opening balance does not match the ledger opening balance. Review the prior period or opening balance before reconciling.",
          },
          {
            status: 409,
          },
        );
      }

      await db.bankReconciliation.update({
        where: {
          id,
        },
        data: {
          status: BankReconciliationStatus.RECONCILED,
          reconciledAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    if (action === "lock") {
      const recalculated = await recalculateReconciliation(id);

      if (
        recalculated.status !== BankReconciliationStatus.RECONCILED
      ) {
        return NextResponse.json(
          {
            error:
              "Only a reconciled statement can be locked.",
          },
          {
            status: 409,
          },
        );
      }

      if (Math.abs(Number(recalculated.difference)) >= 0.005) {
        return NextResponse.json(
          {
            error:
              "The reconciliation difference must remain zero before locking.",
          },
          {
            status: 409,
          },
        );
      }

      await db.bankReconciliation.update({
        where: {
          id,
        },
        data: {
          status: BankReconciliationStatus.LOCKED,
          lockedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        error: "Invalid reconciliation action.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error("UPDATE_BANK_RECONCILIATION_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update bank reconciliation.",
      },
      {
        status: 500,
      },
    );
  }
}
