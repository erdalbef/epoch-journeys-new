import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const name = String(formData.get("name") || "").trim();
    const currency = String(formData.get("currency") || "EUR")
      .trim()
      .toUpperCase();
    const openingBalance = Number(formData.get("openingBalance") || 0);
    const currentBalance = Number(formData.get("currentBalance") || 0);
    const notes = String(formData.get("notes") || "").trim();
    const isActive = formData.get("isActive") === "on";

    if (!name) {
      return NextResponse.json(
        { error: "Account name is required." },
        { status: 400 }
      );
    }

    if (isActive) {
      await db.bankAccount.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    await db.bankAccount.create({
      data: {
        name,
        currency,
        openingBalance,
        currentBalance,
        notes: notes || null,
        isActive,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CREATE_BANK_ACCOUNT_ERROR", error);

    return NextResponse.json(
      { error: "Failed to create bank account." },
      { status: 500 }
    );
  }
}