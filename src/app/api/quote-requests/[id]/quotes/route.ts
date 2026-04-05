import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { QuoteStatus, QuoteActivityAction } from "@prisma/client"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const request = await db.customTourRequest.findUnique({
      where: { id },
      include: {
        quotes: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    })

    if (!request) {
      return NextResponse.json(
        { message: "Request not found." },
        { status: 404 }
      )
    }

    // 🔢 determine version
    const latestQuote = request.quotes[0]
    const nextVersion = latestQuote ? latestQuote.version + 1 : 1

    // 🔢 quote number (global)
    const count = await db.quote.count()
    const quoteNumber = count + 1

    const quoteReference = `QT-${String(quoteNumber).padStart(6, "0")}`

    const quote = await db.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          requestId: request.id,

          quoteNumber,
          quoteReference,
          version: nextVersion,

          status: QuoteStatus.DRAFT,
          currency: request.currency || "EUR",

          title:
            request.title ||
            request.requestName ||
            request.destination ||
            "Custom Tour Quote",

          clientMessage: null,
          internalNotes: request.internalNotes,

          subtotal: 0,
          discountTotal: 0,
          taxTotal: 0,
          totalAmount: 0,

          items: {
            create: [
              {
                itemType: "SERVICE",
                title: "Base package",
                description: "Initial pricing placeholder",
                quantity: 1,
                unitPrice: 0,
                discountAmount: 0,
                taxRate: null,
                taxAmount: 0,
                total: 0,
                currency: request.currency || "EUR",
                optional: false,
                sortOrder: 0,
              },
            ],
          },
        },
      })

      await tx.quoteActivity.create({
        data: {
          quoteId: created.id,
          action: QuoteActivityAction.CREATED,
          message: `Quote ${quoteReference} created.`,
        },
      })

      return created
    })

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      quoteReference: quote.quoteReference,
    })
  } catch (error) {
    console.error("POST /api/quote-requests/[id]/quotes error", error)

    return NextResponse.json(
      { message: "Failed to create quote." },
      { status: 500 }
    )
  }
}