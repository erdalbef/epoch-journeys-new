import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string; serviceId: string }> };

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, context: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: supplierId, serviceId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const allowed = ["name", "description", "country", "city", "notes", "isActive"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) {
    return NextResponse.json({ error: "Unsupported service field." }, { status: 400 });
  }
  if (Object.keys(input).length === 0) {
    return NextResponse.json({ error: "No changes supplied." }, { status: 400 });
  }

  const changes: {
    name?: string;
    description?: string | null;
    country?: string | null;
    city?: string | null;
    notes?: string | null;
    isActive?: boolean;
  } = {};

  if ("name" in input) {
    const name = optionalText(input.name);
    if (!name) return NextResponse.json({ error: "Service name is required." }, { status: 400 });
    changes.name = name;
  }
  for (const key of ["description", "country", "city", "notes"] as const) {
    if (key in input) {
      if (input[key] !== null && typeof input[key] !== "string") {
        return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
      }
      changes[key] = optionalText(input[key]);
    }
  }
  if ("isActive" in input) {
    if (typeof input.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean." }, { status: 400 });
    }
    changes.isActive = input.isActive;
  }

  const existing = await db.supplierService.findFirst({
    where: { id: serviceId, supplierId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  const service = await db.supplierService.update({
    where: { id: existing.id },
    data: changes,
  });
  return NextResponse.json({ success: true, service });
}
