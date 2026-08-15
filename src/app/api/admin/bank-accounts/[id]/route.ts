import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const formData = await request.formData();

    const setActiveOnly = String(formData.get("setActiveOnly") || "") === "true";
    const isActive = formData.get("isActive") === "on" || setActiveOnly;

    if (isActive) {
      await db.bankAccount.updateMany({
        where: {
          isActive: true,
          NOT: { id },
        },
        data: {
          isActive: false,
        },
      });
    }

    if (setActiveOnly) {
      await db.bankAccount.update({
        where: { id },
        data: { isActive: true },
      });

      return NextResponse.json({ success: true });
    }

    const name = String(formData.get("name") || "").trim();
    const currency = String(formData.get("currency") || "EUR")
      .trim()
      .toUpperCase();
    const openingBalance = Number(formData.get("openingBalance") || 0);
    const currentBalance = Number(formData.get("currentBalance") || 0);
    const notes = String(formData.get("notes") || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Account name is required." },
        { status: 400 }
      );
    }

    await db.bankAccount.update({
      where: { id },
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
    console.error("UPDATE_BANK_ACCOUNT_ERROR", error);

    return NextResponse.json(
      { error: "Failed to update bank account." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await db.bankAccount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_BANK_ACCOUNT_ERROR", error);

    return NextResponse.json(
      { error: "Failed to delete bank account." },
      { status: 500 }
    );
  }
}