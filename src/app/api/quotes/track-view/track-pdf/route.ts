import { NextRequest, NextResponse } from "next/server"
import { QuoteActivityAction } from "@prisma/client"

import { db } from "@/lib/db"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const quote = await db.quote.findUnique({
      where: { id },
      select: {
        id: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { message: "Quote not found." },
        { status: 404 }
      )
    }

    await db.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          pdfDownloadCount: {
            increment: 1,
          },
        },
      })

      await tx.quoteActivity.create({
        data: {
          quoteId: id,
          action: QuoteActivityAction.PDF_VIEWED,
          message: "PDF opened/downloaded.",
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/quotes/[id]/track-pdf error", error)

    return NextResponse.json(
      { message: "Failed to track PDF view." },
      { status: 500 }
    )
  }
}