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
import fs from "fs/promises";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const amount = Number(formData.get("amount") || 0);
    const currency = "EUR";

    const category = String(formData.get("category") || "").trim();
    const paymentStatus = String(
      formData.get("paymentStatus") || "PENDING"
    ).trim();

    const direction = String(formData.get("direction") || "EXPENSE").trim();
    const sourceType = String(formData.get("sourceType") || "INTERNAL").trim();
    const taxType = String(formData.get("taxType") || "NONE").trim();

    const vendorName = String(formData.get("vendorName") || "").trim();
    const expenseDateValue = String(formData.get("expenseDate") || "").trim();
    const paidAtValue = String(formData.get("paidAt") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    let receiptUrl = String(formData.get("receiptUrl") || "").trim();

    const receiptFile = formData.get("receipt");

    if (
      receiptFile &&
      typeof receiptFile !== "string" &&
      receiptFile.size > 0
    ) {
      const allowedTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
      ];

      if (!allowedTypes.includes(receiptFile.type)) {
        return NextResponse.json(
          { error: "Only PDF, JPG, PNG, and WEBP files are allowed." },
          { status: 400 }
        );
      }

      const maxSize = 10 * 1024 * 1024;

      if (receiptFile.size > maxSize) {
        return NextResponse.json(
          { error: "Receipt file must be smaller than 10MB." },
          { status: 400 }
        );
      }

      const bytes = await receiptFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "expenses"
      );

      await fs.mkdir(uploadDir, { recursive: true });

      const safeFileName = `${Date.now()}-${receiptFile.name}`
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      await fs.writeFile(path.join(uploadDir, safeFileName), buffer);

      receiptUrl = `/uploads/expenses/${safeFileName}`;
    }

    const bookingIdRaw = String(formData.get("bookingId") || "").trim();
    const tourIdRaw = String(formData.get("tourId") || "").trim();
    const departureDateIdRaw = String(
      formData.get("departureDateId") || ""
    ).trim();

    const agentNameSnapshot = String(
      formData.get("agentNameSnapshot") || ""
    ).trim();

    const partnerCompanyName = String(
      formData.get("partnerCompanyName") || ""
    ).trim();

    const tourLeaderName = String(formData.get("tourLeaderName") || "").trim();

    const customPackageName = String(
      formData.get("customPackageName") || ""
    ).trim();

    const groupName = String(formData.get("groupName") || "").trim();

    const clientCompanyName = String(
      formData.get("clientCompanyName") || ""
    ).trim();

    const spenderName = String(
      formData.get("spenderName") || ""
    ).trim();

    const tourCategoryName = String(
      formData.get("tourCategoryName") || ""
    ) .trim();



    const partnerCompanyIdRaw = String(
      formData.get("partnerCompanyId") || ""
    ).trim();

    const taxRateValue = String(formData.get("taxRate") || "").trim();
    const taxAmountValue = String(formData.get("taxAmount") || "").trim();
    const grossAmountValue = String(formData.get("grossAmount") || "").trim();
    const netAmountValue = String(formData.get("netAmount") || "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero." },
        { status: 400 }
      );
    }

    if (!Object.values(ExpenseCategory).includes(category as ExpenseCategory)) {
      return NextResponse.json(
        { error: "Invalid category." },
        { status: 400 }
      );
    }

    if (
      !Object.values(ExpensePaymentStatus).includes(
        paymentStatus as ExpensePaymentStatus
      )
    ) {
      return NextResponse.json(
        { error: "Invalid payment status." },
        { status: 400 }
      );
    }

    if (
      !Object.values(FinanceDirection).includes(direction as FinanceDirection)
    ) {
      return NextResponse.json(
        { error: "Invalid finance direction." },
        { status: 400 }
      );
    }

    if (
      !Object.values(FinanceSourceType).includes(
        sourceType as FinanceSourceType
      )
    ) {
      return NextResponse.json(
        { error: "Invalid source type." },
        { status: 400 }
      );
    }

    if (!Object.values(FinanceTaxType).includes(taxType as FinanceTaxType)) {
      return NextResponse.json(
        { error: "Invalid tax type." },
        { status: 400 }
      );
    }

    await db.expense.create({
      data: {
        title,
        description: description || null,
        amount,
        currency,

        originalAmount: amount,
        originalCurrency: "EUR",
        exchangeRateToBase: 1,
        baseCurrency: "EUR",
        baseAmount: amount,

        category: category as ExpenseCategory,
        paymentStatus: paymentStatus as ExpensePaymentStatus,
        direction: direction as FinanceDirection,
        sourceType: sourceType as FinanceSourceType,

        vendorName: vendorName || null,
        expenseDate: expenseDateValue
          ? new Date(`${expenseDateValue}T00:00:00.000Z`)
          : new Date(),
        paidAt: paidAtValue ? new Date(`${paidAtValue}T00:00:00.000Z`) : null,

        receiptUrl: receiptUrl || null,
        notes: notes || null,

        bookingId: bookingIdRaw || null,
        tourId: tourIdRaw || null,
        departureDateId: departureDateIdRaw || null,
        createdById: session.user.id,

        taxType: taxType as FinanceTaxType,
        taxRate: taxRateValue ? Number(taxRateValue) : null,
        taxAmount: taxAmountValue ? Number(taxAmountValue) : 0,
        grossAmount: grossAmountValue ? Number(grossAmountValue) : null,
        netAmount: netAmountValue ? Number(netAmountValue) : null,

        agentNameSnapshot: agentNameSnapshot || null,
        partnerCompanyName: partnerCompanyName || null,
        tourLeaderName: tourLeaderName || null,
        customPackageName: customPackageName || null,
        groupName: groupName || null,

        clientCompanyName: clientCompanyName || null,
        spenderName: spenderName || null,
        tourCategoryName: tourCategoryName || null,

        partnerCompanyId: partnerCompanyIdRaw || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CREATE_EXPENSE_ERROR", error);

    return NextResponse.json(
      { error: "Failed to save finance entry." },
      { status: 500 }
    );
  }
}