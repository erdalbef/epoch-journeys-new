import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const booking = await db.booking.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      numberOfGuests: true,
      _count: { select: { passengers: true } },
    },
  });

  if (!booking || booking.userId !== session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking._count.passengers >= booking.numberOfGuests) {
    return NextResponse.json(
      {
        error: `This booking already has all ${booking.numberOfGuests} passenger records.`,
      },
      { status: 409 }
    );
  }

  if (!body.firstName?.trim() || !body.lastName?.trim()) {
    return NextResponse.json(
      { error: "First name and last name are required." },
      { status: 400 }
    );
  }

  if (body.isLeadPassenger) {
    await db.passenger.updateMany({
      where: { bookingId: booking.id },
      data: { isLeadPassenger: false },
    });
  }

  const passenger = await db.passenger.create({
    data: {
      bookingId: booking.id,
      title: body.title,
      firstName: body.firstName.trim(),
      middleName: body.middleName,
      lastName: body.lastName.trim(),
      gender: body.gender,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      nationality: body.nationality,
      email: body.email,
      phone: body.phone,
      passportNumber: body.passportNumber,
      passportExpiry: body.passportExpiry
        ? new Date(body.passportExpiry)
        : null,
      passportIssueDate: body.passportIssueDate
        ? new Date(body.passportIssueDate)
        : null,
      passportCountry: body.passportCountry,
      roomType: body.roomType,
      isLeadPassenger: Boolean(body.isLeadPassenger),
      specialRequests: body.specialRequests,
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      notes: body.notes,
    },
  });

  return NextResponse.json({ success: true, passenger });
}