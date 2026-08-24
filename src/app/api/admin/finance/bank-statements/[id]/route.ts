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
  action?:
    | "update-details"
    | "review"
    | "reconcile"
    | "archive";
  statementDate?: string;
  openingBalance?: number | null;
  closingBalance?: number | null;
  notes?: string;
};

function asNullableFiniteNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
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
    const body = (await request.json()) as Body;

    const statement =
      await db.bankStatement.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          status: true,
          bankAccountId: true,
          statementDate: true,
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

    /*
     * Archived statements are final historical records.
     * No PATCH operation is allowed after archiving.
     */
    if (
      statement.status ===
      BankStatementStatus.ARCHIVED
    ) {
      return NextResponse.json(
        {
          error:
            "Archived bank statements cannot be changed.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * UPDATE STATEMENT DETAILS
     * -------------------------------------------------------
     *
     * Allows us to correct:
     * - Statement Date
     * - Opening Balance
     * - Closing Balance
     * - Notes
     *
     * Imported lines and transaction matches are untouched.
     */
    if (body.action === "update-details") {
      if (
        statement.status ===
        BankStatementStatus.RECONCILED
      ) {
        return NextResponse.json(
          {
            error:
              "Reconciled bank statements cannot be edited.",
          },
          {
            status: 409,
          },
        );
      }

      const statementDate =
        typeof body.statementDate === "string" &&
        body.statementDate.trim()
          ? new Date(
              `${body.statementDate.trim()}T23:59:59.999Z`,
            )
          : null;

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

      const openingBalance =
        asNullableFiniteNumber(
          body.openingBalance,
        );

      const closingBalance =
        asNullableFiniteNumber(
          body.closingBalance,
        );

      if (openingBalance === undefined) {
        return NextResponse.json(
          {
            error: "Opening balance is invalid.",
          },
          {
            status: 400,
          },
        );
      }

      if (closingBalance === undefined) {
        return NextResponse.json(
          {
            error: "Closing balance is invalid.",
          },
          {
            status: 400,
          },
        );
      }

      /*
       * Prevent duplicate statements for the same
       * account and statement date.
       */
      const duplicate =
        await db.bankStatement.findFirst({
          where: {
            id: {
              not: statement.id,
            },
            bankAccountId:
              statement.bankAccountId,
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
              "Another bank statement already exists for this account and statement date.",
          },
          {
            status: 409,
          },
        );
      }

      const notes =
        typeof body.notes === "string" &&
        body.notes.trim()
          ? body.notes.trim()
          : null;

      await db.bankStatement.update({
        where: {
          id: statement.id,
        },
        data: {
          statementDate,
          openingBalance,
          closingBalance,
          notes,
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    /*
     * -------------------------------------------------------
     * REVIEW STATEMENT
     * -------------------------------------------------------
     */
    if (body.action === "review") {
      const unresolved =
        statement.lines.some(
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
          status:
            BankStatementStatus.REVIEWED,
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    /*
     * -------------------------------------------------------
     * MARK STATEMENT RECONCILED
     * -------------------------------------------------------
     */
    if (body.action === "reconcile") {
      if (
        statement.status !==
        BankStatementStatus.REVIEWED
      ) {
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

      const unresolved =
        statement.lines.some(
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

      /*
       * Every matched ledger transaction must also
       * belong to a Bank Reconciliation.
       */
      const matchedWithoutReconciliation =
        statement.lines.some(
          (line) =>
            line.matchStatus ===
              BankStatementLineMatchStatus.MATCHED &&
            !line.matchedBankTransaction
              ?.reconciliationId,
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
          status:
            BankStatementStatus.RECONCILED,
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    /*
     * -------------------------------------------------------
     * ARCHIVE STATEMENT
     * -------------------------------------------------------
     */
    if (body.action === "archive") {
      if (
        statement.status !==
        BankStatementStatus.RECONCILED
      ) {
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
          status:
            BankStatementStatus.ARCHIVED,
        },
      });

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid bank statement action.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error(
      "UPDATE_BANK_STATEMENT_ERROR",
      error,
    );

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

/*
 * ==========================================================
 * DELETE BANK STATEMENT
 * ==========================================================
 *
 * Rules:
 * - ADMIN only
 * - RECONCILED statements cannot be deleted
 * - ARCHIVED statements cannot be deleted
 * - A statement cannot be deleted if one of its matched
 *   ledger transactions is already part of reconciliation
 * - Finance Ledger transactions themselves are NOT deleted
 */
export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(authOptions);

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

    const statement =
      await db.bankStatement.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (!statement) {
      return NextResponse.json(
        {
          error:
            "Bank statement not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      statement.status ===
        BankStatementStatus.RECONCILED ||
      statement.status ===
        BankStatementStatus.ARCHIVED
    ) {
      return NextResponse.json(
        {
          error:
            "Reconciled or archived bank statements cannot be deleted.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Check directly in Prisma instead of using
     * statement.lines.some(...).
     *
     * This also avoids the implicit-any TypeScript
     * problem we encountered earlier.
     */
    const linkedToReconciliation =
      await db.bankStatementLine.findFirst({
        where: {
          bankStatementId: statement.id,
          matchedBankTransaction: {
            reconciliationId: {
              not: null,
            },
          },
        },
        select: {
          id: true,
        },
      });

    if (linkedToReconciliation) {
      return NextResponse.json(
        {
          error:
            "This statement contains ledger transactions already included in a bank reconciliation. Remove or unlock the reconciliation first.",
        },
        {
          status: 409,
        },
      );
    }

    await db.bankStatement.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE_BANK_STATEMENT_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete bank statement.",
      },
      {
        status: 500,
      },
    );
  }
}