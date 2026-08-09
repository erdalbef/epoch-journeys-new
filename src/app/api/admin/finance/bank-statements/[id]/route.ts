import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  BankStatementLineMatchStatus,
  BankStatementStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type Body = {
  action?: "review" | "reconcile" | "archive";
};

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
    const body = (await request.json()) as Body;

    const statement = await db.bankStatement.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        status: true,
        lines: {
          select: {
            matchStatus: true,
            matchedBankTransaction: {
              select: {
                reconciliationId: true,
              },
            },
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

    if (body.action === "review") {
      const unresolved = statement.lines.some(
        (line) =>
          line.matchStatus ===
          BankStatementLineMatchStatus.UNMATCHED,
      );

      if (unresolved) {
        return NextResponse.json(
          {
            error:
              "All statement lines must be matched or ignored before the statement can be marked reviewed.",
          },
          {
            status: 409,
          },
        );
      }

      await db.bankStatement.update({
        where: {
          id,
        },
        data: {
          status: BankStatementStatus.REVIEWED,
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "reconcile") {
      if (statement.status !== BankStatementStatus.REVIEWED) {
        return NextResponse.json(
          {
            error:
              "The statement must be reviewed before it can be marked reconciled.",
          },
          {
            status: 409,
          },
        );
      }

      const unresolved = statement.lines.some(
        (line) =>
          line.matchStatus ===
          BankStatementLineMatchStatus.UNMATCHED,
      );

      if (unresolved) {
        return NextResponse.json(
          {
            error:
              "All statement lines must be resolved before reconciliation.",
          },
          {
            status: 409,
          },
        );
      }

      const matchedWithoutReconciliation = statement.lines.some(
        (line) =>
          line.matchStatus === BankStatementLineMatchStatus.MATCHED &&
          !line.matchedBankTransaction?.reconciliationId,
      );

      if (matchedWithoutReconciliation) {
        return NextResponse.json(
          {
            error:
              "Matched Bank Ledger transactions must be included in a Bank Reconciliation before the statement can be marked reconciled.",
          },
          {
            status: 409,
          },
        );
      }

      await db.bankStatement.update({
        where: {
          id,
        },
        data: {
          status: BankStatementStatus.RECONCILED,
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "archive") {
      if (statement.status !== BankStatementStatus.RECONCILED) {
        return NextResponse.json(
          {
            error:
              "Only reconciled bank statements can be archived.",
          },
          {
            status: 409,
          },
        );
      }

      await db.bankStatement.update({
        where: {
          id,
        },
        data: {
          status: BankStatementStatus.ARCHIVED,
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        error: "Invalid bank statement action.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error("UPDATE_BANK_STATEMENT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update bank statement.",
      },
      {
        status: 500,
      },
    );
  }
}
