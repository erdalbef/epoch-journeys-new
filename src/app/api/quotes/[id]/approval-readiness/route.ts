import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { checkQuoteApprovalReadiness } from "@/lib/quotes/approvalReadiness";

type RouteContext = { params: Promise<{ id: string }> };

/** A read-only preflight. Never updates saved prices or quote status. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Sign in again." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Quote ID is missing." },
        { status: 400 }
      );
    }

    const quote = await db.quote.findUnique({
      where: { id },
      select: {
        id: true,
        updatedAt: true,
        status: true,
        recipientEmail: true,
        quoteBuilderSummary: true,
      },
    });

    if (!quote) {
      return NextResponse.json(
        { ok: false, error: "Quote not found." },
        { status: 404 }
      );
    }

    const readiness = checkQuoteApprovalReadiness({
      quoteBuilderSummary: quote.quoteBuilderSummary,
      recipientEmail: quote.recipientEmail,
    });
    return NextResponse.json({
      ok: true,
      quoteId: quote.id,
      quoteStatus: quote.status,
      savedAt: quote.updatedAt,
      ...readiness,
    });
  } catch (error) {
    // Log details server-side; do not expose internal data in the response.
    console.error("[Epoch Journeys] Approval readiness API failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Approval readiness failed on the server. See the npm run dev terminal for the underlying error.",
      },
      { status: 500 }
    );
  }
}
