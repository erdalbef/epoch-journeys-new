import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { buildSalesInvoicesPackage } from "@/lib/accounting/buildSalesInvoicesPackage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    year: string;
    month: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user?.id ||
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
            "Invalid sales invoices ZIP request.",
        },
        {
          status: 400,
        },
      );
    }

    const packageResult =
      await buildSalesInvoicesPackage({
        year,
        month,
        strict: true,
      });

    return new Response(
      new Uint8Array(
        packageResult.buffer,
      ),
      {
        headers: {
          "Content-Type":
            "application/zip",

          "Content-Disposition":
            `attachment; filename="${packageResult.fileName}"`,

          "Content-Length":
            String(
              packageResult
                .buffer.length,
            ),

          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET sales invoices ZIP error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate sales invoices ZIP.";

    const status =
      message ===
      "Accounting period not found."
        ? 404
        : message.includes(
              "No issued sales invoices",
            ) ||
            message.includes(
              "No sales invoice PDFs",
            )
          ? 400
          : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status,
      },
    );
  }
}