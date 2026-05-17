import { NextRequest, NextResponse } from "next/server"
import { QuoteActivityAction } from "@prisma/client"

import { db } from "@/lib/db"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const PIXEL_BASE64 =
  "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const quote = await db.quote.findUnique({
      where: { id },
      select: {
        id: true,
      },
    })

    if (!quote) {
      return new NextResponse(Buffer.from(PIXEL_BASE64, "base64"), {
        status: 200,
        headers: {
          "Content-Type": "image/gif",
          "Content-Length": String(Buffer.from(PIXEL_BASE64, "base64").length),
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    }

    await db.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id },
        data: {
          emailOpenCount: {
            increment: 1,
          },
        },
      })

      await tx.quoteActivity.create({
        data: {
          quoteId: id,
          action: QuoteActivityAction.EMAIL_OPENED,
          message: "Quote email opened.",
        },
      })
    })

    const pixelBuffer = Buffer.from(PIXEL_BASE64, "base64")

    return new NextResponse(pixelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": String(pixelBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("GET /api/quotes/[id]/track-email-open error", error)

    const pixelBuffer = Buffer.from(PIXEL_BASE64, "base64")

    return new NextResponse(pixelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": String(pixelBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  }
}