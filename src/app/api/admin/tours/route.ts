import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db} from "@/lib/db";
import { generateTourCode } from "@/lib/codes/generateTourCode";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      title,
      category,
      duration,
      shortDescription,
      overview,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Title is required." },
        { status: 400 }
      );
    }

    const tourCode = await generateTourCode(title);

    const tour = await db.tour.create({
      data: {
        title,
        tourCode,
        category,
        duration,
        shortDescription,
        overview,
      },
    });

    return NextResponse.json({
      success: true,
      tour,
    });
  } catch (error) {
    console.error("CREATE_TOUR_ERROR", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, message: "Tour code already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create tour." },
      { status: 500 }
    );
  }
}