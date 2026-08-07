import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Context = {
  params: Promise<{ id: string }>;
};

type Action = "submit" | "approve" | "reject" | "cancel";

function paymentStatusFor(
  balance: Prisma.Decimal,
  dueDate: Date | null,
) {
  if (balance.lte(0)) return "PAID" as const;
  if (dueDate && dueDate.getTime() < Date.now()) return "OVERDUE" as const;
  return "UNPAID" as const;
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { action?: Action };

    const payable = await db.supplierPayable.findUnique({
      where: { id },
      select: {
        id: true,
        approvalStatus: true,
        paymentStatus: true,
        balance: true,
        dueDate: true,
        amountPaid: true,
      },
    });

    if (!payable) {
      return NextResponse.json({ error: "Payable not found." }, { status: 404 });
    }

    const action = body.action;

    if (action === "submit") {
      if (payable.approvalStatus !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft payables can be submitted." },
          { status: 400 },
        );
      }

      await db.supplierPayable.update({
        where: { id },
        data: { approvalStatus: "PENDING_APPROVAL" },
      });
    } else if (action === "approve") {
      if (payable.approvalStatus !== "PENDING_APPROVAL") {
        return NextResponse.json(
          { error: "Only payables awaiting approval can be approved." },
          { status: 400 },
        );
      }

      await db.supplierPayable.update({
        where: { id },
        data: {
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
          approvedById: session.user.id,
          paymentStatus: paymentStatusFor(payable.balance, payable.dueDate),
        },
      });
    } else if (action === "reject") {
      if (payable.approvalStatus !== "PENDING_APPROVAL") {
        return NextResponse.json(
          { error: "Only payables awaiting approval can be rejected." },
          { status: 400 },
        );
      }

      await db.supplierPayable.update({
        where: { id },
        data: { approvalStatus: "REJECTED" },
      });
    } else if (action === "cancel") {
      if (payable.amountPaid.gt(0)) {
        return NextResponse.json(
          {
            error:
              "A payable with recorded supplier payments cannot be cancelled. Record a credit/refund workflow instead.",
          },
          { status: 409 },
        );
      }

      await db.supplierPayable.update({
        where: { id },
        data: {
          approvalStatus: "CANCELLED",
          paymentStatus: "CANCELLED",
          cancelledAt: new Date(),
        },
      });
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    revalidatePath(`/admin/supplier-payables/${id}`);
    revalidatePath("/admin/supplier-payables");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UPDATE_SUPPLIER_PAYABLE_ERROR", error);

    return NextResponse.json(
      { error: "Failed to update supplier payable." },
      { status: 500 },
    );
  }
}
