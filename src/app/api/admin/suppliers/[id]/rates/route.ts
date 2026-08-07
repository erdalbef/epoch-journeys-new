import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role, RoomType, SupplierRateUnit } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };
const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;

export async function POST(request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id: supplierId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const name = text(body.name); const unit = text(body.unit); const amount = Number(body.amount);
  const validFrom = new Date(String(body.validFrom || "")); const validTo = new Date(String(body.validTo || ""));
  if (!name || !unit || !Object.values(SupplierRateUnit).includes(unit as SupplierRateUnit) || !Number.isFinite(amount) || amount < 0 || Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime()) || validTo < validFrom) {
    return NextResponse.json({ error: "Rate name, valid dates, non-negative amount and valid unit are required." }, { status: 400 });
  }
  const roomType = text(body.roomType);
  const serviceId = text(body.serviceId);
  if (serviceId) {
    const service = await db.supplierService.findFirst({ where: { id: serviceId, supplierId }, select: { id: true } });
    if (!service) return NextResponse.json({ error: "Selected service does not belong to this supplier." }, { status: 400 });
  }
  const rate = await db.supplierRate.create({ data: {
    supplierId, serviceId, name, description: text(body.description), validFrom, validTo,
    currency: text(body.currency) || "EUR", amount, unit: unit as SupplierRateUnit,
    roomType: roomType && Object.values(RoomType).includes(roomType as RoomType) ? roomType as RoomType : null,
    mealBasis: text(body.mealBasis),
    minPax: Number.isFinite(Number(body.minPax)) && body.minPax !== null ? Number(body.minPax) : null,
    maxPax: Number.isFinite(Number(body.maxPax)) && body.maxPax !== null ? Number(body.maxPax) : null,
    isActive: true,
  }});
  return NextResponse.json({ success: true, rate: { ...rate, amount: Number(rate.amount) } }, { status: 201 });
}
