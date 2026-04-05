import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"

const updateQuoteRequestSchema = z.object({
  status: z
    .enum(["NEW", "IN_REVIEW", "QUOTED", "CONFIRMED", "CANCELLED"])
    .optional(),

  requestType: z.enum(["TAILOR_MADE", "BESPOKE_GROUP", "QUOTE_ONLY"]).optional(),

  bookingType: z.enum(["FIT", "GROUP"]).optional(),

  quotedAmount: z.number().positive().nullable().optional(),
  quotedCurrency: z.string().min(1).nullable().optional(),
  quotedAt: z.coerce.date().nullable().optional(),
  followUpDate: z.coerce.date().nullable().optional(),

  adminReply: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),

  convertedToBooking: z.boolean().optional(),
  convertedBookingId: z.string().nullable().optional(),
})

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    const request = await db.customTourRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            travelAgency: true,
            phone: true,
          },
        },
        requestNotes: {
          include: {
            author: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!request) {
      return NextResponse.json(
        {
          success: false,
          message: "Quote request not found",
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: request,
    })
  } catch (error) {
    console.error("Get quote request error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while fetching the quote request",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await req.json()

    const parsed = updateQuoteRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const data = parsed.data

    const existingRequest = await db.customTourRequest.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "Quote request not found",
        },
        { status: 404 }
      )
    }

    const updatedRequest = await db.customTourRequest.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.requestType !== undefined && { requestType: data.requestType }),
        ...(data.bookingType !== undefined && { bookingType: data.bookingType }),

        ...(data.quotedAmount !== undefined && { quotedAmount: data.quotedAmount }),
        ...(data.quotedCurrency !== undefined && {
          quotedCurrency: data.quotedCurrency,
        }),
        ...(data.quotedAt !== undefined && { quotedAt: data.quotedAt }),
        ...(data.followUpDate !== undefined && { followUpDate: data.followUpDate }),

        ...(data.adminReply !== undefined && { adminReply: data.adminReply }),
        ...(data.internalNotes !== undefined && {
          internalNotes: data.internalNotes,
        }),

        ...(data.convertedToBooking !== undefined && {
          convertedToBooking: data.convertedToBooking,
        }),
        ...(data.convertedBookingId !== undefined && {
          convertedBookingId: data.convertedBookingId,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedRequest,
    })
  } catch (error) {
    console.error("Update quote request error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating the quote request",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    const existingRequest = await db.customTourRequest.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingRequest) {
      return NextResponse.json(
        {
          success: false,
          message: "Quote request not found",
        },
        { status: 404 }
      )
    }

    await db.customTourRequest.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Quote request deleted successfully",
    })
  } catch (error) {
    console.error("Delete quote request error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while deleting the quote request",
      },
      { status: 500 }
    )
  }
}