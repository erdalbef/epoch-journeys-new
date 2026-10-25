import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { attractionLookupKey, parseAttractionInput, toAttractionDto } from "@/lib/attractions/catalogue";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    if (!id) return NextResponse.json({ ok: false, error: "Missing attraction ID." }, { status: 400 });
    const parsed = parseAttractionInput(await request.json());
    if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    const data = parsed.data;
    const updated = await db.attractionEntranceFee.update({
      where: { id },
      data: { ...data, lookupKey: attractionLookupKey(data.name, data.country, data.city) },
    });
    return NextResponse.json({ ok: true, attraction: toAttractionDto(updated) });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      if (error.code === "P2002") {
        return NextResponse.json({ ok: false, error: "Another attraction already uses this name and location." }, { status: 409 });
      }
      if (error.code === "P2025") {
        return NextResponse.json({ ok: false, error: "Attraction not found." }, { status: 404 });
      }
    }
    console.error("UPDATE_ATTRACTION_ERROR", error);
    return NextResponse.json({ ok: false, error: "Could not update attraction." }, { status: 500 });
  }
}
