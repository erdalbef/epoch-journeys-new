import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  BankReconciliationStatus,
  BankStatementLineMatchStatus,
  BankStatementStatus,
  BankTransactionDirection,
  BankTransactionStatus,
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type CreateBody = {
  bankStatementId?: string;
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
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as CreateBody;

    const bankStatementId =
      typeof body.bankStatementId === "string"
        ? body.bankStatementId.trim()
        : "";

    let bankAccountId = "";
    let statementDate: Date | null = null;
    let statementOpeningBalance: number | null = null;
    let statementClosingBalance: number | null = null;
    let notes: string | null = null;
    let matchedTransactionIds: string[] = [];

    if (bankStatementId) {
      const statement = await db.bankStatement.findUnique({
        where: {
          id: bankStatementId,
        },
        select: {
          id: true,
          bankAccountId: true,
          statementDate: true,
          openingBalance: true,
          closingBalance: true,
          notes: true,
          status: true,
          lines: {
            where: {
              matchStatus: BankStatementLineMatchStatus.MATCHED,
            },
            select: {
              matchedBankTransaction: {
                select: {
                  id: true,
                  bankAccountId: true,
                  status: true,
                  reconciliationId: true,
                },
              },
            },
          },
        },
      });

      if (!statement) {
        return NextResponse.json(
          { error: "Bank statement not found." },
          { status: 404 },
        );
      }

      if (statement.status !== BankStatementStatus.REVIEWED) {
        return NextResponse.json(
          {
            error:
              "The bank statement must be reviewed before reconciliation can start.",
          },
          { status: 409 },
        );
      }

      if (
        statement.openingBalance === null ||
        statement.closingBalance === null
      ) {
        return NextResponse.json(
          {
            error:
              "The bank statement must have opening and closing balances before reconciliation can start.",
          },
          { status: 409 },
        );
      }

      const invalidMatchedTransaction =
        statement.lines.find(
          (line) =>
            !line.matchedBankTransaction ||
            line.matchedBankTransaction.bankAccountId !==
              statement.bankAccountId ||
            line.matchedBankTransaction.status !==
              BankTransactionStatus.POSTED ||
            Boolean(line.matchedBankTransaction.reconciliationId),
        );

      if (invalidMatchedTransaction) {
        return NextResponse.json(
          {
            error:
              "One or more matched statement transactions are no longer eligible for reconciliation. Review the statement matches before continuing.",
          },
          { status: 409 },
        );
      }

      bankAccountId = statement.bankAccountId;
      statementDate = statement.statementDate;
      statementOpeningBalance = Number(statement.openingBalance);
      statementClosingBalance = Number(statement.closingBalance);
      notes = statement.notes;

      matchedTransactionIds = statement.lines
        .map((line) => line.matchedBankTransaction?.id)
        .filter((value): value is string => Boolean(value));
    } else {
      bankAccountId =
        typeof body.bankAccountId === "string"
          ? body.bankAccountId.trim()
          : "";

      statementDate =
        typeof body.statementDate === "string"
          ? new Date(`${body.statementDate}T23:59:59.999Z`)
          : null;

      statementOpeningBalance = asFiniteNumber(
        body.statementOpeningBalance,
      );

      statementClosingBalance = asFiniteNumber(
        body.statementClosingBalance,
      );

      notes =
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null;
    }

    if (!bankAccountId) {
      return NextResponse.json(
        { error: "Select a bank or cash account." },
        { status: 400 },
      );
    }

    if (
      !statementDate ||
      Number.isNaN(statementDate.getTime())
    ) {
      return NextResponse.json(
        { error: "Statement date is invalid." },
        { status: 400 },
      );
    }

    if (
      statementOpeningBalance === null ||
      statementClosingBalance === null
    ) {
      return NextResponse.json(
        { error: "Statement balances are invalid." },
        { status: 400 },
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
        { error: "Selected bank account is not available." },
        { status: 400 },
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
        { status: 409 },
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
        { status: 409 },
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

    const result = await db.$transaction(async (tx) => {
      let incoming = 0;
      let outgoing = 0;

      if (matchedTransactionIds.length > 0) {
        const matchedTransactions =
          await tx.bankTransaction.findMany({
            where: {
              id: {
                in: matchedTransactionIds,
              },
              bankAccountId,
              status: BankTransactionStatus.POSTED,
              reconciliationId: null,
            },
            select: {
              id: true,
              amount: true,
              direction: true,
            },
          });

        if (
          matchedTransactions.length !==
          matchedTransactionIds.length
        ) {
          throw new Error(
            "One or more statement matches are no longer available for reconciliation.",
          );
        }

        for (const transaction of matchedTransactions) {
          const amount = Number(transaction.amount);

          if (
            transaction.direction ===
            BankTransactionDirection.IN
          ) {
            incoming += amount;
          } else {
            outgoing += amount;
          }
        }
      }

      const ledgerClosingBalance =
        ledgerOpeningBalance + incoming - outgoing;

      const difference =
        statementClosingBalance - ledgerClosingBalance;

      const reconciliation =
        await tx.bankReconciliation.create({
          data: {
            bankAccountId,
            createdById: session.user.id,
            statementDate,
            statementOpeningBalance,
            statementClosingBalance,
            ledgerOpeningBalance,
            ledgerClosingBalance,
            difference,
            status:
              matchedTransactionIds.length > 0
                ? BankReconciliationStatus.IN_PROGRESS
                : BankReconciliationStatus.DRAFT,
            notes,
          },
          select: {
            id: true,
          },
        });

      if (matchedTransactionIds.length > 0) {
        await tx.bankTransaction.updateMany({
          where: {
            id: {
              in: matchedTransactionIds,
            },
            bankAccountId,
            status: BankTransactionStatus.POSTED,
            reconciliationId: null,
          },
          data: {
            reconciliationId: reconciliation.id,
            reconciledAt: new Date(),
          },
        });
      }

      return {
        id: reconciliation.id,
        attachedTransactions: matchedTransactionIds.length,
      };
    });

    return NextResponse.json(
      {
        success: true,
        reconciliation: result,
      },
      { status: 201 },
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
      { status: 500 },
    );
  }
}
