import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;

    if (!user || user.role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" +
            encodeURIComponent("Unauthorized action."),
          req.url
        )
      );
    }

    const { id } = await context.params;

    const existingTour = await db.tour.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
      },
    });

    if (!existingTour) {
      return NextResponse.redirect(
        new URL(
          "/admin/tours?error=" + encodeURIComponent("Tour not found."),
          req.url
        )
      );
    }

    await db.tour.update({
      where: { id },
      data: {
        isPublished: true,
      },
    });

    return NextResponse.redirect(
      new URL(
        "/admin/tours?success=" +
          encodeURIComponent(`"${existingTour.title}" republished.`),
        req.url
      )
    );
  } catch (error) {
    console.error("REPUBLISH_TOUR_ERROR", error);

    return NextResponse.redirect(
      new URL(
        "/admin/tours?error=" +
          encodeURIComponent("Failed to republish tour."),
        req.url
      )
    );
  }
}