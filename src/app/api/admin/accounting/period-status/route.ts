import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getServerSession,
} from "next-auth";

import {
  AccountingPeriodStatus,
  CashTransactionStatus,
  Role,
} from "@prisma/client";

import {
  authOptions,
} from "@/lib/authOptions";

import {
  db,
} from "@/lib/db";

type RequestBody = {
  year?: number;
  month?: number;
  action?:
    | "START_REVIEW"
    | "MARK_READY"
    | "CLOSE"
    | "REOPEN";
};

export async function POST(
  request: NextRequest,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user ||
      session.user.role !==
        Role.ADMIN
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      (await request.json()) as RequestBody;

    const year =
      Number(body.year);

    const month =
      Number(body.month);

    const action =
      body.action;

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      year < 2000 ||
      year > 2100 ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid accounting period.",
        },
        {
          status: 400,
        },
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Accounting period action is required.",
        },
        {
          status: 400,
        },
      );
    }

    const period =
      await db.accountingPeriod.findUnique({
        where: {
          year_month: {
            year,
            month,
          },
        },

        include: {
          documents: {
            select: {
              accountingCategory:
                true,
            },
          },

          bankStatements: {
            where: {
              currency: "EUR",
            },

            select: {
              id: true,
            },
          },

          cashTransactions: {
            where: {
              status:
                CashTransactionStatus.POSTED,
            },

            select: {
              id: true,
            },
          },
        },
      });

    if (!period) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Accounting period not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ======================================================
    // START REVIEW
    // ======================================================

    if (
      action ===
      "START_REVIEW"
    ) {
      if (
        period.status !==
        AccountingPeriodStatus.OPEN
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Only an open accounting period can be moved to review.",
          },
          {
            status: 409,
          },
        );
      }

      await db.accountingPeriod.update({
        where: {
          id: period.id,
        },

        data: {
          status:
            AccountingPeriodStatus.REVIEW,
        },
      });

      return NextResponse.json({
        ok: true,
        message:
          "Accounting period moved to review.",
      });
    }

    // ======================================================
    // MARK READY
    // ======================================================

    if (
      action ===
      "MARK_READY"
    ) {
      if (
        period.status !==
        AccountingPeriodStatus.REVIEW
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Only a period under review can be marked ready.",
          },
          {
            status: 409,
          },
        );
      }

      const uncategorizedCount =
        period.documents.filter(
          (document) =>
            !document.accountingCategory,
        ).length;

      const part1Categories =
        new Set([
          "BANK_STATEMENTS",
          "SALES_INCOME",
          "EXPENSES_PURCHASES",
          "CASH",
        ]);

      const part1FinanceDocumentCount =
        period.documents.filter(
          (document) =>
            document.accountingCategory !==
              null &&
            part1Categories.has(
              document.accountingCategory,
            ),
        ).length;

      const part1ItemCount =
        part1FinanceDocumentCount +
        period.bankStatements.length +
        period.cashTransactions.length;

      const hasEurBankStatement =
        period.bankStatements.length >
        0;

      const ready =
        hasEurBankStatement &&
        uncategorizedCount === 0 &&
        part1ItemCount > 0;

      if (!ready) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "This accounting month is not ready. Confirm that the EUR bank statement is uploaded, all documents are classified, and Part 1 contains documents or posted cash entries.",
          },
          {
            status: 409,
          },
        );
      }

      await db.accountingPeriod.update({
        where: {
          id: period.id,
        },

        data: {
          status:
            AccountingPeriodStatus.READY,
        },
      });

      return NextResponse.json({
        ok: true,
        message:
          "Accounting period marked Ready for Accountant.",
      });
    }

    // ======================================================
    // CLOSE
    // ======================================================

    if (
      action ===
      "CLOSE"
    ) {
      if (
        period.status !==
        AccountingPeriodStatus.SUBMITTED
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Only a submitted accounting period can be closed.",
          },
          {
            status: 409,
          },
        );
      }

      await db.accountingPeriod.update({
        where: {
          id: period.id,
        },

        data: {
          status:
            AccountingPeriodStatus.CLOSED,

          closedAt:
            new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        message:
          "Accounting period closed.",
      });
    }

    // ======================================================
    // RETURN / REOPEN TO OPEN
    //
    // REVIEW -> OPEN
    // CLOSED -> OPEN
    // ======================================================

    if (
      action ===
      "REOPEN"
    ) {
      if (
        period.status !==
          AccountingPeriodStatus.REVIEW &&
        period.status !==
          AccountingPeriodStatus.CLOSED
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Only a period under review or a closed period can be returned to open.",
          },
          {
            status: 409,
          },
        );
      }

      const wasClosed =
        period.status ===
        AccountingPeriodStatus.CLOSED;

      await db.accountingPeriod.update({
        where: {
          id: period.id,
        },

        data: {
          status:
            AccountingPeriodStatus.OPEN,

          closedAt:
            null,

          ...(wasClosed
            ? {
                submittedAt:
                  null,
              }
            : {}),
        },
      });

      return NextResponse.json({
        ok: true,

        message: wasClosed
          ? "Accounting period reopened."
          : "Accounting period returned to Open.",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unsupported accounting period action.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error(
      "POST accounting period status error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update accounting period.";

    return NextResponse.json(
      {
        ok: false,
        error:
          message,
      },
      {
        status: 500,
      },
    );
  }
}