import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ tourId: string }>;
};

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { tourId } = await params;

    const departures = await prisma.departureDate.findMany({
      where: { tourId },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        price: true,
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