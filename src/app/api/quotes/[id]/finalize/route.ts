import { NextRequest, NextResponse } from "next/server"
import { QuoteActivityAction, QuoteStatus } from "@prisma/client"
import { db } from "@/lib/db"
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

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const actorId = body?.actorId ?? null

    if (!actorId) {
      return NextResponse.json(
        { message: "actorId is required." },
        { status: 400 }
      )
    }

    const existingQuote = await db.quote.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        recipientEmail: true,
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

    if (!existingQuote.recipientEmail) {
      return NextResponse.json(
        { message: "Recipient email is required before finalizing." },
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error("POST /api/quotes/[id]/finalize error", error)

    const message =
      error instanceof Error ? error.message : "Failed to finalize quote."

    return NextResponse.json(
      { message },
      { status: 500 }
    )
  }
}