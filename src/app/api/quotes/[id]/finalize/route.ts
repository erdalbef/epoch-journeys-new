import { NextRequest, NextResponse } from "next/server"
import { QuoteActivityAction, QuoteStatus } from "@prisma/client"
import { getServerSession } from "next-auth"

import { db } from "@/lib/db"
import { authOptions } from "@/lib/authOptions"
import { generateQuotePdfUrl } from "@/lib/pdf"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

async function getQuoteOrNull(id: string) {
  return db.quote.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      activities: {
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
      booking: {
        select: {
          id: true,
          bookingReference: true,
          bookingDisplayCode: true,
          status: true,
          paymentStatus: true,
        },
      },
      request: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              travelAgency: true,
              phone: true,
              agentCode: true,
            },
          },
        },
      },
      tour: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
      departureDate: {
        select: {
          id: true,
          date: true,
          price: true,
          status: true,
          season: true,
        },
      },
      finalizedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      sentBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  })
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      )
    }

    const actorId = session.user.id
    const { id } = await context.params

    const existingQuote = await db.quote.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        recipientEmail: true,
        quoteBuilderSummary: true,
      },
    })

    if (!existingQuote) {
      return NextResponse.json(
        { message: "Quote not found." },
        { status: 404 }
      )
    }

    if (existingQuote.status !== QuoteStatus.DRAFT) {
      return NextResponse.json(
        { message: "Only draft quotes can be finalized." },
        { status: 400 }
      )
    }

    if (!existingQuote.recipientEmail?.trim()) {
      return NextResponse.json(
        { message: "Recipient email is required before finalizing." },
        { status: 400 }
      )
    }

    const summary =
      existingQuote.quoteBuilderSummary &&
      typeof existingQuote.quoteBuilderSummary === "object" &&
      !Array.isArray(existingQuote.quoteBuilderSummary)
        ? (existingQuote.quoteBuilderSummary as Record<string, unknown>)
        : null

    const pricingRows = Array.isArray(summary?.paxPricingRows)
      ? summary.paxPricingRows
      : []

    if (pricingRows.length === 0) {
      return NextResponse.json(
        { message: "At least one NET group-rate tier is required before finalizing." },
        { status: 400 }
      )
    }

    const invalidTier = pricingRows.find((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return true
      const row = value as Record<string, unknown>
      const paxCount = Number(row.paxCount ?? 0)
      const single = Number(row.manualSinglePrice ?? 0)
      const doubleTwin = Number(row.manualDoubleTwinPrice ?? 0)
      const triple = Number(row.manualTriplePrice ?? 0)
      return paxCount <= 0 || single <= 0 || doubleTwin <= 0 || triple <= 0
    })

    if (invalidTier) {
      return NextResponse.json(
        {
          message:
            "Every group-size tier must have approved Final NET Single, Double/Twin, and Triple rates before finalizing.",
        },
        { status: 400 }
      )
    }

    const pdfUrl = await generateQuotePdfUrl(id)
    const now = new Date()

    await db.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          status: QuoteStatus.FINALIZED,
          pdfUrl,
          pdfGeneratedAt: now,
          finalizedAt: now,
          finalizedById: actorId,
        },
      })

      await tx.quoteActivity.createMany({
        data: [
          {
            quoteId: id,
            actorId,
            action: QuoteActivityAction.EXPORTED_PDF,
            fromStatus: QuoteStatus.DRAFT,
            toStatus: QuoteStatus.DRAFT,
            message: "Quote PDF generated during finalization.",
            meta: {
              pdfUrl,
            },
          },
          {
            quoteId: id,
            actorId,
            action: QuoteActivityAction.FINALIZED,
            fromStatus: QuoteStatus.DRAFT,
            toStatus: QuoteStatus.FINALIZED,
            message: "Quote finalized manually by admin.",
          },
        ],
      })
    })

    const updated = await getQuoteOrNull(id)

    if (!updated) {
      return NextResponse.json(
        { message: "Quote finalized but could not be reloaded." },
        { status: 500 }
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("POST /api/quotes/[id]/finalize error", error)

    const message =
      error instanceof Error ? error.message : "Failed to finalize quote."

    return NextResponse.json({ message }, { status: 500 })
  }
}