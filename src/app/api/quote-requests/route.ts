import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Role } from "@prisma/client"
import { getCurrentApiActor } from "@/lib/security/getCurrentApiActor"
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
  const access = await getCurrentApiActor()
  if (access.response) return access.response

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

    // A travel agency can submit a request only under its own account.
    // Admin may explicitly select an existing account when assisting an agency.
    const targetUserId =
      access.actor.role === Role.ADMIN &&
      typeof body.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : access.actor.id

    if (access.actor.role === Role.ADMIN && targetUserId !== access.actor.id) {
      const target = await db.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true },
      })
      if (!target || target.role !== Role.AGENT) {
        return NextResponse.json(
          { success: false, message: "Selected agency account not found." },
          { status: 400 },
        )
      }
    }

    const request = await db.customTourRequest.create({
      data: {
        requestReference: generateRequestReference(),
        userId: targetUserId,

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