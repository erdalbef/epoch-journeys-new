import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { parseStandardServiceInput, standardServiceLookupKey, toStandardServiceDto } from "@/lib/per-person-services/catalogue";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    if (!id || id.length > 150) return NextResponse.json({ ok: false, error: "Invalid service ID." }, { status: 400 });
    const parsed = parseStandardServiceInput(await request.json());
    if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    const data = parsed.data;
    const updated = await db.standardPerPersonService.update({
      where: { id }, data: { ...data, lookupKey: standardServiceLookupKey(data.category, data.unit, data.name) },
    });
    return NextResponse.json({ ok: true, service: toStandardServiceDto(updated) });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error) {
      if (error.code === "P2025") return NextResponse.json({ ok: false, error: "Service not found." }, { status: 404 });
      if (error.code === "P2002") return NextResponse.json({ ok: false, error: "Duplicate service name and unit." }, { status: 409 });
    }
    console.error("STANDARD_PER_PERSON_PATCH_ERROR", error);
    return NextResponse.json({ ok: false, error: "Could not update standard service." }, { status: 500 });
  }
}
