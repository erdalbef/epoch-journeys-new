import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { QuoteActivityAction, QuoteStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type StatusUpdateBody = {
  status?: QuoteStatus;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const actorId = session.user.id;
    const { id } = await context.params;

    let body: StatusUpdateBody;

    try {
      body = (await req.json()) as StatusUpdateBody;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    if (!body.status) {
      return NextResponse.json(
        {
          ok: false,
          error: "Status is required.",
        },
        { status: 400 }
      );
    }

    const existing = await db.quote.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "Quote not found.",
        },
        { status: 404 }
      );
    }

    if (existing.status === body.status) {
      return NextResponse.json(
        {
          ok: false,
          error: "Quote already has this status.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await db.$transaction(async (tx) => {
      const quote = await tx.quote.update({
        where: { id },
        data: {
          status: body.status,
          sentAt:
            body.status === QuoteStatus.SENT
              ? now
              : existing.status === QuoteStatus.SENT
              ? null
              : undefined,
          convertedAt:
            body.status === QuoteStatus.CONVERTED
              ? now
              : existing.status === QuoteStatus.CONVERTED
              ? null
              : undefined,
        },
        select: {
          id: true,
          status: true,
          sentAt: true,
          expiresAt: true,
          convertedAt: true,
        },
      });

      await tx.quoteActivity.create({
        data: {
          quoteId: id,
          actorId,
          action: QuoteActivityAction.STATUS_CHANGED,
          fromStatus: existing.status,
          toStatus: body.status,
          message: `Quote status changed from ${existing.status} to ${body.status}.`,
        },
      });

      return quote;
    });

    return NextResponse.json({
      ok: true,
      quote: updated,
    });
  } catch (error) {
    console.error("PATCH /api/admin/quotes/[id]/status error", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to update quote status.",
      },
      { status: 500 }
    );
  }
}