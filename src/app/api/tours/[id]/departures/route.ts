import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id: tourId } = await params;

    const departures = await db.departureDate.findMany({
      where: { tourId },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        price: true,
        priceDouble: true,
        singleSupplement: true,
        tripleReduction: true,
        capacity: true,
        bookedSeats: true,
        status: true,
        season: true,
      },
    });

    return NextResponse.json({ ok: true, departures });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch departures.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}