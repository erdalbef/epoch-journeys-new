import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  QuoteActivityAction,
  QuoteStatus,
} from "@prisma/client";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type StatusUpdateBody = {
  status?: QuoteStatus;
  approve?: boolean;
};

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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
        {
          status: 400,
        }
      );
    }

    const existing = await db.quote.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        status: true,
        sentAt: true,
        approvedAt: true,
        convertedAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "Quote not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * APPROVAL WORKFLOW
     *
     * Approval is intentionally NOT a QuoteStatus.
     *
     * A quote remains SENT after approval and approvedAt
     * records the commercial acceptance.
     *
     * When converted to a booking its status becomes
     * CONVERTED.
     */

    if (body.approve === true) {
      if (existing.status !== QuoteStatus.SENT) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Only a SENT quote can be approved.",
          },
          {
            status: 400,
          }
        );
      }

      if (existing.approvedAt) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Quote has already been approved.",
          },
          {
            status: 400,
          }
        );
      }

      const now = new Date();

      const updated = await db.$transaction(
        async (tx) => {
          const quote = await tx.quote.update({
            where: {
              id,
            },

            data: {
              approvedAt: now,
              rejectedAt: null,
            },

            select: {
              id: true,
              status: true,
              sentAt: true,
              approvedAt: true,
              rejectedAt: true,
              convertedAt: true,
            },
          });

          await tx.quoteActivity.create({
            data: {
              quoteId: id,
              actorId,
              action:
                QuoteActivityAction.STATUS_CHANGED,

              fromStatus: existing.status,
              toStatus: existing.status,

              message:
                "Quote approved. Commercial offer accepted and ready for booking conversion.",
            },
          });

          return quote;
        }
      );

      return NextResponse.json({
        ok: true,
        quote: updated,
      });
    }

    /*
     * NORMAL STATUS CHANGES
     */

    if (!body.status) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Status or approval action is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (existing.status === body.status) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Quote already has this status.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Conversion must always go through the dedicated
     * Quote -> Booking conversion route.
     */

    if (body.status === QuoteStatus.CONVERTED) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Use the Quote → Booking conversion action.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Once converted we do not allow status changes.
     */

    if (existing.status === QuoteStatus.CONVERTED) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A converted quote cannot be changed.",
        },
        {
          status: 400,
        }
      );
    }

    const now = new Date();

    const updated = await db.$transaction(
      async (tx) => {
        const quote = await tx.quote.update({
          where: {
            id,
          },

          data: {
            status: body.status,

            sentAt:
              body.status === QuoteStatus.SENT
                ? now
                : existing.status ===
                    QuoteStatus.SENT
                  ? null
                  : undefined,

            /*
             * If a quote leaves SENT status,
             * clear any previous approval.
             */

            approvedAt:
              existing.status ===
                QuoteStatus.SENT &&
              body.status !== QuoteStatus.SENT
                ? null
                : undefined,

            rejectedAt:
              existing.status ===
                QuoteStatus.SENT &&
              body.status !== QuoteStatus.SENT
                ? null
                : undefined,
          },

          select: {
            id: true,
            status: true,
            sentAt: true,
            approvedAt: true,
            rejectedAt: true,
            expiresAt: true,
            convertedAt: true,
          },
        });

        await tx.quoteActivity.create({
          data: {
            quoteId: id,
            actorId,

            action:
              QuoteActivityAction.STATUS_CHANGED,

            fromStatus: existing.status,
            toStatus: body.status,

            message:
              `Quote status changed from ${existing.status} to ${body.status}.`,
          },
        });

        return quote;
      }
    );

    return NextResponse.json({
      ok: true,
      quote: updated,
    });
  } catch (error) {
    console.error(
      "PATCH /api/quotes/[id]/status error",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Failed to update quote status.",
      },
      {
        status: 500,
      }
    );
  }
}