import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { attractionLookupKey, parseAttractionInput, toAttractionDto } from "@/lib/attractions/catalogue";

export const dynamic = "force-dynamic";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user && session.user.role === Role.ADMIN);
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const search = new URL(request.url).searchParams;
    const q = (search.get("q") ?? "").trim().slice(0, 120);
    const country = (search.get("country") ?? "").trim().slice(0, 100);
    const activeOnly = search.get("active") === "true";
    const attractions = await db.attractionEntranceFee.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(country ? { country: { equals: country, mode: "insensitive" as const } } : {}),
        ...(q ? { OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { city: { contains: q, mode: "insensitive" as const } },
          { country: { contains: q, mode: "insensitive" as const } },
        ] } : {}),
      },
      orderBy: [{ country: "asc" }, { city: "asc" }, { name: "asc" }],
      take: 1000,
    });
    return NextResponse.json({ ok: true, attractions: attractions.map(toAttractionDto) });
  } catch (error) {
    console.error("LIST_ATTRACTIONS_ERROR", error);
    return NextResponse.json({ ok: false, error: "Could not load attractions catalogue." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const parsed = parseAttractionInput(await request.json());
    if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    const data = parsed.data;
    const created = await db.attractionEntranceFee.create({
      data: {
        ...data,
        lookupKey: attractionLookupKey(data.name, data.country, data.city),
      },
    });
    return NextResponse.json({ ok: true, attraction: toAttractionDto(created) }, { status: 201 });
  } catch (error) {
    // Prisma P2002: catalogue key already exists (same attraction and location).
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "This attraction already exists for the same city and country." }, { status: 409 });
    }
    console.error("CREATE_ATTRACTION_ERROR", error);
    return NextResponse.json({ ok: false, error: "Could not create attraction." }, { status: 500 });
  }
}
