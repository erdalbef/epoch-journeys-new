import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role, SupplierServiceType } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };
const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;

export async function POST(request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id: supplierId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const name = text(body.name); const type = text(body.type);
  if (!name || !type || !Object.values(SupplierServiceType).includes(type as SupplierServiceType)) return NextResponse.json({ error: "Valid service name and type are required." }, { status: 400 });
  const service = await db.supplierService.create({ data: {
    supplierId, name, type: type as SupplierServiceType, description: text(body.description),
    country: text(body.country), city: text(body.city), isActive: true, notes: text(body.notes),
  }});
  return NextResponse.json({ success: true, service }, { status: 201 });
}
