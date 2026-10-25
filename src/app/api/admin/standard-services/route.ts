import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { parseStandardServiceInput, standardServiceLookupKey, toStandardServiceDto } from "@/lib/per-person-services/catalogue";

export const dynamic = "force-dynamic";
async function authorized() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === Role.ADMIN;
}
export async function GET(request: Request) {
  if (!(await authorized())) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const q = (params.get("q") || "").trim().slice(0, 120);
    const category = (params.get("category") || "").trim().toUpperCase();
    const activeOnly = params.get("active") === "true";
    const services = await db.standardPerPersonService.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(category ? { category } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }], take: 1000,
    });
    return NextResponse.json({ ok: true, services: services.map(toStandardServiceDto) });
  } catch (error) {
    console.error("STANDARD_PER_PERSON_GET_ERROR", error);
    return NextResponse.json({ ok: false, error: "Could not load standard services." }, { status: 500 });
  }
}
export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    const parsed = parseStandardServiceInput(await request.json());
    if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    const input = parsed.data;
    const created = await db.standardPerPersonService.create({
      data: { ...input, lookupKey: standardServiceLookupKey(input.category, input.unit, input.name) },
    });
    return NextResponse.json({ ok: true, service: toStandardServiceDto(created) }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "This category, service name and unit already exist." }, { status: 409 });
    }
    console.error("STANDARD_PER_PERSON_POST_ERROR", error);
    return NextResponse.json({ ok: false, error: "Could not save standard service." }, { status: 500 });
  }
}
