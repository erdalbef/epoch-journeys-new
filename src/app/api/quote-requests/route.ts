import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  customTourRequestSchema,
  type CustomTourRequestInput,
} from "@/schemas/customTourRequest"

function generateRequestReference() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const random = Math.floor(1000 + Math.random() * 9000)

  return `QR-${yyyy}${mm}${dd}-${random}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const parsed = customTourRequestSchema.safeParse(body)

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

    const data: CustomTourRequestInput = parsed.data

    if (!body.userId || typeof body.userId !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "userId is required",
        },
        { status: 400 }
      )
    }

    const request = await db.customTourRequest.create({
      data: {
        requestReference: generateRequestReference(),
        userId: body.userId,

        title: data.title,
        requestName: data.requestName,

        destination: data.destination,
        destinations: data.destinations,

        startDate: data.startDate,
        endDate: data.endDate,
        durationDays: data.durationDays,

        estimatedPax: data.estimatedPax,
        adults: data.adults,
        children: data.children,
        infants: data.infants,

        singleRooms: data.singleRooms,
        doubleRooms: data.doubleRooms,
        twinRooms: data.twinRooms,
        tripleRooms: data.tripleRooms,

        budgetPerPerson: data.budgetPerPerson,
        totalBudget: data.totalBudget,
        currency: data.currency,

        accommodationLevel: data.accommodationLevel,
        roomPreference: data.roomPreference,
        needsFlights: data.needsFlights,
        landOnly: data.landOnly,

        companyName: data.companyName,
        groupName: data.groupName,
        groupLeaderName: data.groupLeaderName,

        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,

        leadFirstName: data.leadFirstName,
        leadLastName: data.leadLastName,
        leadEmail: data.leadEmail,
        leadPhone: data.leadPhone,

        specialRequests: data.specialRequests,
        notes: data.notes,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: request,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Create quote request error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating the quote request",
      },
      { status: 500 }
    )
  }
}