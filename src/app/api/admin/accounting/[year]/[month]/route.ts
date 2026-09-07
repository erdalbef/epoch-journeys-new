import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    year: string;
    month: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const session =
      await getServerSession(
        authOptions
      );

    if (
      !session?.user?.id ||
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      year: yearRaw,
      month: monthRaw,
    } = await context.params;

    const year =
      Number(yearRaw);

    const month =
      Number(monthRaw);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
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
        }
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
            orderBy: [
              {
                documentDate: "desc",
              },
              {
                createdAt: "desc",
              },
            ],

            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },

              booking: {
                select: {
                  id: true,
                  bookingReference: true,
                  groupName: true,
                },
              },

              tour: {
                select: {
                  id: true,
                  title: true,
                },
              },

              bankAccount: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                },
              },

              uploadedBy: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },

          bankStatements: {
            where: {
              currency: "EUR",
            },

            orderBy: {
              statementDate: "desc",
            },

            include: {
              bankAccount: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                },
              },

              uploadedBy: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },

          cashTransactions: {
            orderBy: [
              {
                transactionDate:
                  "desc",
              },
              {
                createdAt:
                  "desc",
              },
            ],

            select: {
              id: true,
              direction: true,
              status: true,
              transactionDate: true,
              amount: true,
              currency: true,
              counterparty: true,
              description: true,
              reference: true,
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
        }
      );
    }

    return NextResponse.json({
      ok: true,
      period,
    });
  } catch (error) {
    console.error(
      "GET accounting period error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to load accounting period.",
      },
      {
        status: 500,
      }
    );
  }
}
