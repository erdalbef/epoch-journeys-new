import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  BankReconciliationStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type CreateBody = {
  bankAccountId?: string;
  statementDate?: string;
  statementOpeningBalance?: number;
  statementClosingBalance?: number;
  notes?: string;
};

function asFiniteNumber(value: unknown) {
  const parsed =
    typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
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

    const body = (await request.json()) as CreateBody;

    const bankAccountId =
      typeof body.bankAccountId === "string"
        ? body.bankAccountId.trim()
        : "";

    const statementDate =
      typeof body.statementDate === "string"
        ? new Date(`${body.statementDate}T23:59:59.999Z`)
        : null;

    const statementOpeningBalance = asFiniteNumber(
      body.statementOpeningBalance,
    );

    const statementClosingBalance = asFiniteNumber(
      body.statementClosingBalance,
    );

    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    if (!bankAccountId) {
      return NextResponse.json(
        {
          error: "Select a bank or cash account.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !statementDate ||
      Number.isNaN(statementDate.getTime())
    ) {
      return NextResponse.json(
        {
          error: "Statement date is invalid.",
        },
        {
          status: 400,
        },
      );
    }

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

    const bankAccount = await db.bankAccount.findUnique({
      where: {
        id: bankAccountId,
      },
      select: {
        id: true,
        name: true,
        currency: true,
        openingBalance: true,
        isActive: true,
      },
    });

    if (!bankAccount || !bankAccount.isActive) {
      return NextResponse.json(
        {
          error: "Selected bank account is not available.",
        },
        {
          status: 400,
        },
      );
    }

    const openReconciliation =
      await db.bankReconciliation.findFirst({
        where: {
          bankAccountId,
          status: {
            in: [
              BankReconciliationStatus.DRAFT,
              BankReconciliationStatus.IN_PROGRESS,
              BankReconciliationStatus.RECONCILED,
            ],
          },
        },
        orderBy: {
          statementDate: "desc",
        },
        select: {
          id: true,
          status: true,
          statementDate: true,
        },
      });

    if (openReconciliation) {
      return NextResponse.json(
        {
          error:
            "This account already has an unlocked reconciliation. Complete and lock it before starting the next statement period.",
        },
        {
          status: 409,
        },
      );
    }

    const duplicate = await db.bankReconciliation.findFirst({
      where: {
        bankAccountId,
        statementDate,
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "A reconciliation already exists for this account and statement date.",
        },
        {
          status: 409,
        },
      );
    }

    const previousReconciliation =
      await db.bankReconciliation.findFirst({
        where: {
          bankAccountId,
          statementDate: {
            lt: statementDate,
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
          id: true,
          statementDate: true,
          ledgerClosingBalance: true,
        },
      });

    const ledgerOpeningBalance = previousReconciliation
      ? Number(previousReconciliation.ledgerClosingBalance)
      : bankAccount.openingBalance;

    /*
     * A new reconciliation starts with zero matched movement.
     * Transactions are attached from the detail screen.
     */
    const ledgerClosingBalance = ledgerOpeningBalance;

    const difference =
      statementClosingBalance - ledgerClosingBalance;

    const reconciliation =
      await db.bankReconciliation.create({
        data: {
          bankAccountId,
          createdById: session.user.id,
          statementDate,
          statementOpeningBalance,
          statementClosingBalance,
          ledgerOpeningBalance,
          ledgerClosingBalance,
          difference,
          status: BankReconciliationStatus.DRAFT,
          notes,
        },
        select: {
          id: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        reconciliation,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("CREATE_BANK_RECONCILIATION_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create bank reconciliation.",
      },
      {
        status: 500,
      },
    );
  }
}
