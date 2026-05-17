import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  ExpenseCategory,
  ExpensePaymentStatus,
  FinanceDirection,
  FinanceSourceType,
  FinanceTaxType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const formData = await request.formData();

    const direction = String(
      formData.get("direction") || "EXPENSE"
    ).trim();

    const sourceType = String(
      formData.get("sourceType") || "INTERNAL"
    ).trim();

    const title = String(
      formData.get("title") || ""
    ).trim();

    const description = String(
      formData.get("description") || ""
    ).trim();

    const amount = Number(
      formData.get("amount") || 0
    );

    const currency = String(
      formData.get("currency") || "EUR"
    ).trim();

    const category = String(
      formData.get("category") || ""
    ).trim();

    const paymentStatus = String(
      formData.get("paymentStatus") || "PENDING"
    ).trim();

    const vendorName = String(
      formData.get("vendorName") || ""
    ).trim();

    const expenseDateValue = String(
      formData.get("expenseDate") || ""
    ).trim();

    const paidAtValue = String(
      formData.get("paidAt") || ""
    ).trim();

    const receiptUrl = String(
      formData.get("receiptUrl") || ""
    ).trim();

    const notes = String(
      formData.get("notes") || ""
    ).trim();

    const bookingIdRaw = String(
      formData.get("bookingId") || ""
    ).trim();

    const tourIdRaw = String(
      formData.get("tourId") || ""
    ).trim();

    const departureDateIdRaw = String(
      formData.get("departureDateId") || ""
    ).trim();

    const partnerCompanyIdRaw = String(
      formData.get("partnerCompanyId") || ""
    ).trim();

    const taxType = String(
      formData.get("taxType") || "NONE"
    ).trim();

    const taxRate = Number(
      formData.get("taxRate") || 0
    );

    const taxAmount = Number(
      formData.get("taxAmount") || 0
    );

    const netAmount = Number(
      formData.get("netAmount") || 0
    );

    const grossAmount = Number(
      formData.get("grossAmount") || 0
    );

    const agentNameSnapshot = String(
      formData.get("agentNameSnapshot") || ""
    ).trim();

    const partnerCompanyName = String(
      formData.get("partnerCompanyName") || ""
    ).trim();

    const tourLeaderName = String(
      formData.get("tourLeaderName") || ""
    ).trim();

    const customPackageName = String(
      formData.get("customPackageName") || ""
    ).trim();

    const groupName = String(
      formData.get("groupName") || ""
    ).trim();

    if (!title) {
      return NextResponse.json(
        {
          error: "Title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          error: "Amount must be greater than zero.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Object.values(FinanceDirection).includes(
        direction as FinanceDirection
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid direction.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Object.values(FinanceSourceType).includes(
        sourceType as FinanceSourceType
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid source type.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Object.values(ExpenseCategory).includes(
        category as ExpenseCategory
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid category.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Object.values(ExpensePaymentStatus).includes(
        paymentStatus as ExpensePaymentStatus
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid payment status.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Object.values(FinanceTaxType).includes(
        taxType as FinanceTaxType
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid tax type.",
        },
        {
          status: 400,
        }
      );
    }

    await db.expense.update({
      where: {
        id,
      },

      data: {
        direction:
          direction as FinanceDirection,

        sourceType:
          sourceType as FinanceSourceType,

        title,

        description:
          description || null,

        amount,

        currency,

        category:
          category as ExpenseCategory,

        paymentStatus:
          paymentStatus as ExpensePaymentStatus,

        vendorName:
          vendorName || null,

        expenseDate:
          expenseDateValue
            ? new Date(
                `${expenseDateValue}T00:00:00.000Z`
              )
            : new Date(),

        paidAt:
          paidAtValue
            ? new Date(
                `${paidAtValue}T00:00:00.000Z`
              )
            : null,

        receiptUrl:
          receiptUrl || null,

        notes:
          notes || null,

        bookingId:
          bookingIdRaw &&
          bookingIdRaw !== "NONE"
            ? bookingIdRaw
            : null,

        tourId:
          tourIdRaw &&
          tourIdRaw !== "NONE"
            ? tourIdRaw
            : null,

        departureDateId:
          departureDateIdRaw &&
          departureDateIdRaw !== "NONE"
            ? departureDateIdRaw
            : null,

        partnerCompanyId:
          partnerCompanyIdRaw &&
          partnerCompanyIdRaw !== "NONE"
            ? partnerCompanyIdRaw
            : null,

        taxType:
          taxType as FinanceTaxType,

        taxRate,

        taxAmount,

        netAmount,

        grossAmount,

        agentNameSnapshot:
          agentNameSnapshot || null,

        partnerCompanyName:
          partnerCompanyName || null,

        tourLeaderName:
          tourLeaderName || null,

        customPackageName:
          customPackageName || null,

        groupName:
          groupName || null,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "UPDATE_FINANCE_ENTRY_ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update finance entry.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    await db.expense.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE_FINANCE_ENTRY_ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete finance entry.",
      },
      {
        status: 500,
      }
    );
  }
}