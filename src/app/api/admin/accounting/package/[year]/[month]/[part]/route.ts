import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import {
  AccountingPackagePart,
  buildAccountingPackage,
} from "@/lib/accounting/buildAccountingPackage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    year: string;
    month: string;
    part: string;
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
      part: partRaw,
    } = await context.params;

    const year =
      Number(yearRaw);

    const month =
      Number(monthRaw);

    const part =
      Number(partRaw);

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      (part !== 1 &&
        part !== 2)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid accounting package request.",
        },
        {
          status: 400,
        }
      );
    }

    const accountingPart =
      part as AccountingPackagePart;

    const packageResult =
      await buildAccountingPackage({
        year,
        month,
        part:
          accountingPart,
        strict: false,
      });

    return new Response(
      new Uint8Array(
        packageResult.buffer
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
                .buffer.length
            ),

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "GET accounting ZIP package error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate accounting ZIP package.";

    const status =
      message ===
      "Accounting period not found."
        ? 404
        : message.includes(
              "has no documents"
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
      }
    );
  }
}