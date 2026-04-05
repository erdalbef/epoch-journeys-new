import { NextRequest, NextResponse } from "next/server"
import { QuoteActivityAction, QuoteStatus } from "@prisma/client"
import { db } from "@/lib/db"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await req.json()) as { status?: QuoteStatus }

    if (!body.status) {
      return NextResponse.json(
        { message: "Status is required." },
        { status: 400 }
      )
    }

    const existing = await db.quote.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { message: "Quote not found." },
        { status: 404 }
      )
    }

    const now = new Date()

    const updated = await db.$transaction(async (tx) => {
      const quote = await tx.quote.update({
        where: { id },
        data: {
          status: body.status,
          sentAt:
            body.status === QuoteStatus.SENT
              ? existing.status === QuoteStatus.SENT
                ? undefined
                : now
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
          approvedAt: true,
          rejectedAt: true,
          expiredAt: true,
          convertedAt: true,
        },
      })

      await tx.quoteActivity.create({
        data: {
          quoteId: id,
          action: QuoteActivityAction.STATUS_CHANGED,
          fromStatus: existing.status,
          toStatus: body.status,
          message: `Quote status changed from ${existing.status} to ${body.status}.`,
        },
      })

      return quote
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/quotes/[id]/status error", error)
    return NextResponse.json(
      { message: "Failed to update quote status." },
      { status: 500 }
    )
  }
}