import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role, SupplierContractStatus } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };
const text = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
const date = (v: unknown) => text(v) ? new Date(String(v)) : null;

export async function POST(request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id: supplierId } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const title = text(body.title); const rawStatus = text(body.status);
  if (!title) return NextResponse.json({ error: "Contract title is required." }, { status: 400 });
  const status = rawStatus && Object.values(SupplierContractStatus).includes(rawStatus as SupplierContractStatus) ? rawStatus as SupplierContractStatus : SupplierContractStatus.ACTIVE;
  const contract = await db.supplierContract.create({ data: {
    supplierId, title, reference: text(body.reference), status,
    validFrom: date(body.validFrom), validTo: date(body.validTo), currency: text(body.currency),
    documentUrl: text(body.documentUrl), paymentTerms: text(body.paymentTerms),
    cancellationTerms: text(body.cancellationTerms), notes: text(body.notes),
  }});
  return NextResponse.json({ success: true, contract }, { status: 201 });
}
