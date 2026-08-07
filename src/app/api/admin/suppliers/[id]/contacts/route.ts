import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };
const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;

export async function POST(request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id: supplierId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  if (!text(body.firstName) && !text(body.lastName)) return NextResponse.json({ error: "Contact name is required." }, { status: 400 });

  if (body.isPrimary) await db.supplierContact.updateMany({ where: { supplierId }, data: { isPrimary: false } });

  const contact = await db.supplierContact.create({ data: {
    supplierId, firstName: text(body.firstName), lastName: text(body.lastName), jobTitle: text(body.jobTitle),
    department: text(body.department), email: text(body.email), phone: text(body.phone), mobile: text(body.mobile),
    isPrimary: Boolean(body.isPrimary), isEmergency: Boolean(body.isEmergency), notes: text(body.notes),
  }});
  return NextResponse.json({ success: true, contact }, { status: 201 });
}
