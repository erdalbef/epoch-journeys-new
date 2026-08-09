import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  BankStatementLineMatchStatus,
  BankStatementStatus,
  BankTransactionStatus,
  BankTransactionType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PatchBody = {
  lineId?: string;
  action?: "match" | "unmatch" | "ignore" | "restore";
  bankTransactionId?: string;
};

function cents(value: number) {
  return Math.round(value * 100);
}

function dateDistanceDays(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
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
    const body = (await request.json()) as PatchBody;

    const lineId =
      typeof body.lineId === "string" ? body.lineId.trim() : "";

    if (!lineId || !body.action) {
      return NextResponse.json(
        {
          error: "Invalid statement line request.",
        },
        {
          status: 400,
        },
      );
    }

    const statement = await db.bankStatement.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        bankAccountId: true,
        status: true,
      },
    });

    if (!statement) {
      return NextResponse.json(
        {
          error: "Bank statement not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (statement.status === BankStatementStatus.ARCHIVED) {
      return NextResponse.json(
        {
          error: "Archived bank statements cannot be changed.",
        },
        {
          status: 409,
        },
      );
    }

    const line = await db.bankStatementLine.findUnique({
      where: {
        id: lineId,
      },
      select: {
        id: true,
        bankStatementId: true,
        transactionDate: true,
        amount: true,
        direction: true,
        currency: true,
        matchStatus: true,
        matchedBankTransactionId: true,
      },
    });

    if (!line || line.bankStatementId !== statement.id) {
      return NextResponse.json(
        {
          error: "Statement line not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (body.action === "match") {
      const bankTransactionId =
        typeof body.bankTransactionId === "string"
          ? body.bankTransactionId.trim()
          : "";

      if (!bankTransactionId) {
        return NextResponse.json(
          {
            error: "Select a Bank Ledger transaction.",
          },
          {
            status: 400,
          },
        );
      }

      const transaction = await db.bankTransaction.findUnique({
        where: {
          id: bankTransactionId,
        },
        select: {
          id: true,
          bankAccountId: true,
          status: true,
          type: true,
          amount: true,
          direction: true,
          currency: true,
          statementLine: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!transaction) {
        return NextResponse.json(
          {
            error: "Bank Ledger transaction not found.",
          },
          {
            status: 404,
          },
        );
      }

      if (transaction.bankAccountId !== statement.bankAccountId) {
        return NextResponse.json(
          {
            error:
              "The selected ledger transaction belongs to a different bank account.",
          },
          {
            status: 409,
          },
        );
      }

      if (transaction.status !== BankTransactionStatus.POSTED) {
        return NextResponse.json(
          {
            error: "Only posted Bank Ledger transactions can be matched.",
          },
          {
            status: 409,
          },
        );
      }

      if (transaction.type === BankTransactionType.OPENING_BALANCE) {
        return NextResponse.json(
          {
            error:
              "Opening-balance ledger transactions cannot be matched to statement lines.",
          },
          {
            status: 409,
          },
        );
      }

      if (
        transaction.statementLine &&
        transaction.statementLine.id !== line.id
      ) {
        return NextResponse.json(
          {
            error:
              "This Bank Ledger transaction is already matched to another statement line.",
          },
          {
            status: 409,
          },
        );
      }

      if (
        transaction.direction !== line.direction ||
        transaction.currency !== line.currency ||
        cents(Number(transaction.amount)) !== cents(Number(line.amount))
      ) {
        return NextResponse.json(
          {
            error:
              "Statement line and ledger transaction amount, direction and currency must match.",
          },
          {
            status: 409,
          },
        );
      }

      await db.bankStatementLine.update({
        where: {
          id: line.id,
        },
        data: {
          matchedBankTransactionId: transaction.id,
          matchStatus: BankStatementLineMatchStatus.MATCHED,
          matchedAt: new Date(),
        },
      });

      if (statement.status === BankStatementStatus.REVIEWED) {
        await db.bankStatement.update({
          where: {
            id: statement.id,
          },
          data: {
            status: BankStatementStatus.IMPORTED,
          },
        });
      }

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "unmatch") {
      await db.bankStatementLine.update({
        where: {
          id: line.id,
        },
        data: {
          matchedBankTransactionId: null,
          matchStatus: BankStatementLineMatchStatus.UNMATCHED,
          matchedAt: null,
        },
      });

      if (statement.status !== BankStatementStatus.IMPORTED) {
        await db.bankStatement.update({
          where: {
            id: statement.id,
          },
          data: {
            status: BankStatementStatus.IMPORTED,
          },
        });
      }

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "ignore") {
      await db.bankStatementLine.update({
        where: {
          id: line.id,
        },
        data: {
          matchedBankTransactionId: null,
          matchStatus: BankStatementLineMatchStatus.IGNORED,
          matchedAt: null,
        },
      });

      if (statement.status === BankStatementStatus.REVIEWED) {
        await db.bankStatement.update({
          where: {
            id: statement.id,
          },
          data: {
            status: BankStatementStatus.IMPORTED,
          },
        });
      }

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "restore") {
      await db.bankStatementLine.update({
        where: {
          id: line.id,
        },
        data: {
          matchedBankTransactionId: null,
          matchStatus: BankStatementLineMatchStatus.UNMATCHED,
          matchedAt: null,
        },
      });

      if (statement.status !== BankStatementStatus.IMPORTED) {
        await db.bankStatement.update({
          where: {
            id: statement.id,
          },
          data: {
            status: BankStatementStatus.IMPORTED,
          },
        });
      }

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        error: "Invalid statement line action.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error("UPDATE_BANK_STATEMENT_LINE_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update statement line.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  _request: Request,
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

    const statement = await db.bankStatement.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        bankAccountId: true,
        statementDate: true,
        status: true,
        lines: {
          where: {
            matchStatus: BankStatementLineMatchStatus.UNMATCHED,
          },
          orderBy: {
            transactionDate: "asc",
          },
          select: {
            id: true,
            transactionDate: true,
            amount: true,
            direction: true,
            currency: true,
            reference: true,
          },
        },
      },
    });

    if (!statement) {
      return NextResponse.json(
        {
          error: "Bank statement not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (statement.status === BankStatementStatus.ARCHIVED) {
      return NextResponse.json(
        {
          error: "Archived bank statements cannot be changed.",
        },
        {
          status: 409,
        },
      );
    }

    const previousStatement = await db.bankStatement.findFirst({
      where: {
        bankAccountId: statement.bankAccountId,
        id: {
          not: statement.id,
        },
        statementDate: {
          lt: statement.statementDate,
        },
        status: {
          not: BankStatementStatus.ARCHIVED,
        },
      },
      orderBy: {
        statementDate: "desc",
      },
      select: {
        statementDate: true,
      },
    });

    const candidates = await db.bankTransaction.findMany({
      where: {
        bankAccountId: statement.bankAccountId,
        status: BankTransactionStatus.POSTED,
        type: {
          not: BankTransactionType.OPENING_BALANCE,
        },
        statementLine: null,
        transactionDate: {
          ...(previousStatement
            ? {
                gt: previousStatement.statementDate,
              }
            : {}),
          lte: statement.statementDate,
        },
      },
      select: {
        id: true,
        transactionDate: true,
        amount: true,
        direction: true,
        currency: true,
        reference: true,
      },
    });

    const used = new Set<string>();
    const matches: Array<{
      lineId: string;
      transactionId: string;
    }> = [];

    for (const line of statement.lines) {
      const exactCandidates = candidates.filter((candidate) => {
        if (used.has(candidate.id)) {
          return false;
        }

        const coreMatch =
          candidate.direction === line.direction &&
          candidate.currency === line.currency &&
          cents(Number(candidate.amount)) === cents(Number(line.amount)) &&
          dateDistanceDays(
            candidate.transactionDate,
            line.transactionDate,
          ) <= 3;

        if (!coreMatch) {
          return false;
        }

        if (line.reference && candidate.reference) {
          return (
            line.reference.trim().toLowerCase() ===
            candidate.reference.trim().toLowerCase()
          );
        }

        return true;
      });

      if (exactCandidates.length === 1) {
        const candidate = exactCandidates[0];

        used.add(candidate.id);

        matches.push({
          lineId: line.id,
          transactionId: candidate.id,
        });
      }
    }

    if (matches.length > 0) {
      await db.$transaction(
        matches.map((match) =>
          db.bankStatementLine.update({
            where: {
              id: match.lineId,
            },
            data: {
              matchedBankTransactionId: match.transactionId,
              matchStatus: BankStatementLineMatchStatus.MATCHED,
              matchedAt: new Date(),
            },
          }),
        ),
      );
    }

    if (
      statement.status === BankStatementStatus.REVIEWED &&
      matches.length > 0
    ) {
      await db.bankStatement.update({
        where: {
          id: statement.id,
        },
        data: {
          status: BankStatementStatus.IMPORTED,
        },
      });
    }

    return NextResponse.json({
      success: true,
      matched: matches.length,
    });
  } catch (error) {
    console.error("AUTO_MATCH_BANK_STATEMENT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to automatically match statement lines.",
      },
      {
        status: 500,
      },
    );
  }
}
