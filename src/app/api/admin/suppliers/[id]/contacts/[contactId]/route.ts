import { Prisma, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string; contactId: string }> };
const fields = ["firstName", "lastName", "jobTitle", "department", "email", "phone", "mobile", "notes"] as const;
const admin = async () => (await getServerSession(authOptions))?.user?.role === Role.ADMIN;

export async function PATCH(request: Request, context: Context) {
  if (!(await admin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id: supplierId, contactId } = await context.params;
  const existing = await db.supplierContact.findFirst({ where: { id: contactId, supplierId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  let input: Record<string, unknown>;
  try {
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw Error();
    input = payload as Record<string, unknown>;
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const allowed = [...fields, "isPrimary", "isEmergency"];
  if (!Object.keys(input).length || Object.keys(input).some((key) => !allowed.includes(key))) return NextResponse.json({ error: "Unsupported field." }, { status: 400 });
  const data: Record<string, unknown> = {};
  for (const field of fields) if (Object.prototype.hasOwnProperty.call(input, field)) {
    if (input[field] !== null && typeof input[field] !== "string") return NextResponse.json({ error: `Invalid ${field}.` }, { status: 400 });
    data[field] = typeof input[field] === "string" ? input[field].trim() || null : null;
  }
  for (const field of ["isPrimary", "isEmergency"] as const) if (Object.prototype.hasOwnProperty.call(input, field)) {
    if (typeof input[field] !== "boolean") return NextResponse.json({ error: `Invalid ${field}.` }, { status: 400 });
    data[field] = input[field];
  }
  const firstName = (data.firstName ?? undefined) as string | undefined;
  const lastName = (data.lastName ?? undefined) as string | undefined;
  if (firstName === null && lastName === null) return NextResponse.json({ error: "Contact requires a first or last name." }, { status: 400 });
  try {
    await db.$transaction(async (tx) => {
      if (data.isPrimary === true) await tx.supplierContact.updateMany({ where: { supplierId, id: { not: contactId } }, data: { isPrimary: false } });
      await tx.supplierContact.update({ where: { id: contactId }, data: data as unknown as Prisma.SupplierContactUncheckedUpdateInput });
    });
    return NextResponse.json({ success: true });
  } catch (error) { console.error("CONTACT_UPDATE_ERROR", error); return NextResponse.json({ error: "Could not update contact." }, { status: 500 }); }
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await admin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id: supplierId, contactId } = await context.params;
  const existing = await db.supplierContact.findFirst({ where: { id: contactId, supplierId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  try {
    await db.supplierContact.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) { console.error("CONTACT_DELETE_PROTECTED", error); return NextResponse.json({ error: "Contact is referenced elsewhere and cannot be deleted." }, { status: 409 }); }
}
