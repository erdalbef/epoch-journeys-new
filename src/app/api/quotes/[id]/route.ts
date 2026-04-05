import { NextRequest, NextResponse } from "next/server"
import { Prisma, QuoteStatus, QuoteItemType, QuoteActivityAction } from "@prisma/client"
import { db } from "@/lib/db"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type QuoteItemInput = {
  id?: string | null
  itemType: QuoteItemType
  title: string
  description?: string | null
  quantity: number
  unitPrice: number
  discountAmount?: number
  taxRate?: number | null
  taxAmount?: number
  total?: number
  currency: string
  optional?: boolean
  sortOrder: number
}

type QuoteUpdateBody = {
  status?: QuoteStatus
  currency?: string
  title?: string | null
  clientMessage?: string | null
  internalNotes?: string | null
  termsAndNotes?: string | null
  validityNotes?: string | null
  expiresAt?: string | null
  items?: QuoteItemInput[]
}

function parseNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function recalculateItems(items: QuoteItemInput[], currency: string) {
  let subtotal = 0
  let discountTotal = 0
  let taxTotal = 0

  const normalizedItems = items.map((item, index) => {
    const quantity = parseNumber(item.quantity, 0)
    const unitPrice = parseNumber(item.unitPrice, 0)
    const discountAmount = parseNumber(item.discountAmount, 0)

    const parsedTaxRate =
      item.taxRate === null || item.taxRate === undefined
        ? null
        : parseNumber(item.taxRate, 0)

    const baseAmount = quantity * unitPrice
    const taxableAmount = Math.max(baseAmount - discountAmount, 0)
    const taxAmount =
      parsedTaxRate !== null ? (taxableAmount * parsedTaxRate) / 100 : 0
    const total = taxableAmount + taxAmount

    subtotal += baseAmount
    discountTotal += discountAmount
    taxTotal += taxAmount

    return {
      id: item.id ?? null,
      itemType: item.itemType,
      title: item.title.trim(),
      description: item.description?.trim() || null,
      quantity,
      unitPrice,
      discountAmount,
      taxRate: parsedTaxRate,
      taxAmount,
      total,
      currency,
      optional: Boolean(item.optional),
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
    }
  })

  return {
    items: normalizedItems,
    subtotal,
    discountTotal,
    taxTotal,
    totalAmount: subtotal - discountTotal + taxTotal,
  }
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
    },
  })
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const quote = await getQuoteOrNull(id)

    if (!quote) {
      return NextResponse.json(
        { message: "Quote not found." },
        { status: 404 }
      )
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error("GET /api/quotes/[id] error", error)
    return NextResponse.json(
      { message: "Failed to load quote." },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await req.json()) as QuoteUpdateBody

    const existingQuote = await db.quote.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        currency: true,
      },
    })

    if (!existingQuote) {
      return NextResponse.json(
        { message: "Quote not found." },
        { status: 404 }
      )
    }

    const nextCurrency = (body.currency || existingQuote.currency || "EUR")
      .trim()
      .toUpperCase()

    const inputItems = Array.isArray(body.items) ? body.items : []
    const hasItems = Array.isArray(body.items)

    if (hasItems) {
      const emptyTitle = inputItems.find((item) => !item.title?.trim())
      if (emptyTitle) {
        return NextResponse.json(
          { message: "Every quote item must have a title." },
          { status: 400 }
        )
      }
    }

    const totals = hasItems
      ? recalculateItems(inputItems, nextCurrency)
      : null

    const updated = await db.$transaction(async (tx) => {
      const quote = await tx.quote.update({
        where: { id },
        data: {
          status: body.status ?? undefined,
          currency: nextCurrency,
          title: body.title?.trim() || null,
          clientMessage: body.clientMessage?.trim() || null,
          internalNotes: body.internalNotes?.trim() || null,
          termsAndNotes: body.termsAndNotes?.trim() || null,
          validityNotes: body.validityNotes?.trim() || null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          subtotal: totals?.subtotal,
          discountTotal: totals?.discountTotal,
          taxTotal: totals?.taxTotal,
          totalAmount: totals?.totalAmount,
          sentAt:
            body.status === QuoteStatus.SENT && existingQuote.status !== QuoteStatus.SENT
              ? new Date()
              : undefined,
          convertedAt:
            body.status === QuoteStatus.CONVERTED && existingQuote.status !== QuoteStatus.CONVERTED
              ? new Date()
              : body.status && body.status !== QuoteStatus.CONVERTED
                ? null
                : undefined,
        },
      })

      if (totals) {
        await tx.quoteItem.deleteMany({
          where: { quoteId: id },
        })

        if (totals.items.length > 0) {
          await tx.quoteItem.createMany({
            data: totals.items.map((item) => ({
              quoteId: id,
              itemType: item.itemType,
              title: item.title,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              total: item.total,
              currency: item.currency,
              optional: item.optional,
              sortOrder: item.sortOrder,
            })),
          })
        }
      }

      await tx.quoteActivity.create({
        data: {
          quoteId: id,
          action: QuoteActivityAction.UPDATED,
          fromStatus:
            body.status && body.status !== existingQuote.status
              ? existingQuote.status
              : null,
          toStatus:
            body.status && body.status !== existingQuote.status
              ? body.status
              : null,
          message: "Quote updated from admin editor.",
          meta: {
            updatedFields: {
              status: body.status ?? null,
              currency: body.currency ?? null,
              title: body.title ?? null,
              expiresAt: body.expiresAt ?? null,
              itemsReplaced: hasItems,
            },
          } satisfies Prisma.InputJsonValue,
        },
      })

      return getQuoteOrNull(quote.id)
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/quotes/[id] error", error)
    return NextResponse.json(
      { message: "Failed to update quote." },
      { status: 500 }
    )
  }
}