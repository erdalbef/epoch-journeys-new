import { NextRequest, NextResponse } from "next/server"
import { QuoteActivityAction, QuoteStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { sendQuoteEmail } from "@/lib/mailer"

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

    const quote = await db.quote.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        quoteNumber: true,
        quoteReference: true,
        recipientName: true,
        recipientEmail: true,
        pdfUrl: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { message: "Quote not found." },
        { status: 404 }
      )
    }

    if (quote.status !== QuoteStatus.FINALIZED) {
      return NextResponse.json(
        { message: "Only finalized quotes can be sent." },
        { status: 400 }
      )
    }

    if (!quote.recipientEmail) {
      return NextResponse.json(
        { message: "Recipient email is missing." },
        { status: 400 }
      )
    }

    if (!quote.pdfUrl) {
      return NextResponse.json(
        { message: "Quote PDF is missing. Finalize the quote again before sending." },
        { status: 400 }
      )
    }

    await sendQuoteEmail({
      to: quote.recipientEmail,
      subject: `Quote ${quote.quoteReference || quote.quoteNumber}`,
      html: `
        <p>Hello ${quote.recipientName || ""},</p>
        <p>Please find your quote attached or linked.</p>
        <p>Quote reference: ${quote.quoteReference || quote.quoteNumber}</p>
      `,
      pdfUrl: quote.pdfUrl,
    })

    const now = new Date()

    await db.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          status: QuoteStatus.SENT,
          sentAt: now,
          sentById: actorId,
        },
      })

      await tx.quoteActivity.create({
        data: {
          quoteId: id,
          actorId,
          action: QuoteActivityAction.SENT,
          fromStatus: QuoteStatus.FINALIZED,
          toStatus: QuoteStatus.SENT,
          message: "Quote sent manually by admin.",
          meta: {
            recipientEmail: quote.recipientEmail,
            pdfUrl: quote.pdfUrl,
          },
        },
      })
    })

    const updated = await getQuoteOrNull(id)

    return NextResponse.json(updated)
  } catch (error) {
    console.error("POST /api/quotes/[id]/send error", error)

    const message =
      error instanceof Error ? error.message : "Failed to send quote."

    return NextResponse.json(
      { message },
      { status: 500 }
    )
  }
}