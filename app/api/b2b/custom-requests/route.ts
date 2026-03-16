import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const reference =
    "CR-" + Date.now().toString().slice(-6);

  const request = await prisma.customTourRequest.create({
    data: {
      userId: session.user.id,
      requestReference: reference,
      title: body.title,
      destination: body.destination,
      estimatedPax: Number(body.estimatedPax),
      durationDays: Number(body.durationDays),
      budgetPerPerson: Number(body.budgetPerPerson),
      notes: body.notes,
      startDate: body.startDate ? new Date(body.startDate) : null,
    },
  });

  return NextResponse.json(request);
}