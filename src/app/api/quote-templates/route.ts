import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/authOptions"
import { db } from "@/lib/db"

import { QuoteItemType, QuotePurpose } from "@prisma/client"

type TemplateItemInput = {
  title: string
  description?: string | null
  itemType?: QuoteItemType
  quantity: number
  unitPrice: number
  discountAmount?: number
  taxRate?: number | null
  taxAmount?: number
  total?: number
  currency?: string
  optional?: boolean
  sortOrder?: number
}

type CreateQuoteTemplateBody = {
  title?: string
  name?: string
  description?: string | null
  isDefault?: boolean
  currency?: string
  purpose?: QuotePurpose | null
  items?: TemplateItemInput[]
}

function parseNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET() {
  try {
    const templates = await db.quoteTemplate.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("GET templates error", error)

    return NextResponse.json(
      { message: "Failed to fetch templates." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      )
    }

    const body = (await req.json()) as CreateQuoteTemplateBody

    const title = body.title?.trim()
    const description = body.description?.trim() || null
    const currency = body.currency?.trim().toUpperCase() || "EUR"
    const isDefault = Boolean(body.isDefault)

    const inputItems = body.items ?? []

    if (!title) {
      return NextResponse.json(
        { message: "Template title is required." },
        { status: 400 }
      )
    }

    if (inputItems.length === 0) {
      return NextResponse.json(
        { message: "At least one template item is required." },
        { status: 400 }
      )
    }

    const invalidItem = inputItems.find((item) => !item.title?.trim())

    if (invalidItem) {
      return NextResponse.json(
        { message: "Every template item must have a title." },
        { status: 400 }
      )
    }

    const normalizedItems = inputItems.map((item, index) => {
      const quantity = parseNumber(item.quantity, 1)
      const unitPrice = parseNumber(item.unitPrice, 0)
      const discountAmount = parseNumber(item.discountAmount, 0)

      const taxRate =
        item.taxRate === null || item.taxRate === undefined
          ? null
          : parseNumber(item.taxRate, 0)

      const base = quantity * unitPrice
      const taxable = Math.max(base - discountAmount, 0)
      const taxAmount = taxRate != null ? (taxable * taxRate) / 100 : 0
      const total = taxable + taxAmount

      return {
        itemType: item.itemType ?? QuoteItemType.SERVICE,
        title: item.title.trim(),
        description: item.description?.trim() || null,
        quantity,
        unitPrice,
        discountAmount,
        taxRate,
        taxAmount,
        total,
        currency,
        optional: Boolean(item.optional),
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
      }
    })

    const summary = normalizedItems.reduce(
      (acc, item) => {
        const base = item.quantity * item.unitPrice

        return {
          subtotal: acc.subtotal + base,
          discountTotal: acc.discountTotal + item.discountAmount,
          taxTotal: acc.taxTotal + item.taxAmount,
        }
      },
      {
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
      }
    )

    const totalAmount =
      summary.subtotal - summary.discountTotal + summary.taxTotal

    const generatedName =
      body.name?.trim() || slugify(title) || `template-${Date.now()}`

    const template = await db.quoteTemplate.create({
      data: {
        title,
        name: generatedName,
        description,
        isDefault,
        currency,
        purpose: body.purpose ?? null,
        calculationVersion: "v1",
        createdById: session.user.id,

        payload: {
          title,
          description,
          currency,
          isDefault,
          purpose: body.purpose ?? null,
          items: normalizedItems,
        },

        summary: {
          subtotal: summary.subtotal,
          discountTotal: summary.discountTotal,
          taxTotal: summary.taxTotal,
          totalAmount,
          itemsCount: normalizedItems.length,
        },

        items: {
          create: normalizedItems.map((item) => ({
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
        },
      },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error("POST template error", error)

    return NextResponse.json(
      { message: "Failed to create template." },
      { status: 500 }
    )
  }
}