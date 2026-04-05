import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { ExpenseCategory, ExpensePaymentStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function parseOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseRequiredString(value: FormDataEntryValue | null, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
  return value.trim();
}

function parsePositiveNumber(value: FormDataEntryValue | null, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive number.`);
  }

  return parsed;
}

function parseDate(value: FormDataEntryValue | null, fieldName: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return parsed;
}

function isExpenseCategory(value: string): value is ExpenseCategory {
  return Object.values(ExpenseCategory).includes(value as ExpenseCategory);
}

function isExpensePaymentStatus(value: string): value is ExpensePaymentStatus {
  return Object.values(ExpensePaymentStatus).includes(
    value as ExpensePaymentStatus
  );
}

async function saveReceiptFile(file: File) {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error("Only PDF, JPG, PNG, and WEBP files are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size must be 10MB or less.");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads", "expenses");
  await fs.mkdir(uploadDir, { recursive: true });

  const safeOriginalName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9.\-_]/g, "");
  const fileName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;
  const filePath = path.join(uploadDir, fileName);

  await fs.writeFile(filePath, buffer);

  return `/uploads/expenses/${fileName}`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();

    const title = parseRequiredString(formData.get("title"), "Title");
    const amount = parsePositiveNumber(formData.get("amount"), "Amount");
    const expenseDate = parseDate(formData.get("expenseDate"), "Expense date");

    const currency =
      parseOptionalString(formData.get("currency"))?.toUpperCase() || "EUR";

    const categoryValue = parseRequiredString(formData.get("category"), "Category");
    if (!isExpenseCategory(categoryValue)) {
      return NextResponse.json({ error: "Invalid expense category." }, { status: 400 });
    }

    const paymentStatusValue =
      parseOptionalString(formData.get("paymentStatus")) || "PENDING";

    if (!isExpensePaymentStatus(paymentStatusValue)) {
      return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
    }

    const description = parseOptionalString(formData.get("description"));
    const vendorName = parseOptionalString(formData.get("vendorName"));
    const notes = parseOptionalString(formData.get("notes"));
    const bookingId = parseOptionalString(formData.get("bookingId"));
    const tourId = parseOptionalString(formData.get("tourId"));
    const departureDateId = parseOptionalString(formData.get("departureDateId"));

    const paidAtRaw = parseOptionalString(formData.get("paidAt"));
    const paidAt = paidAtRaw ? new Date(paidAtRaw) : null;

    if (paidAt && Number.isNaN(paidAt.getTime())) {
      return NextResponse.json({ error: "Paid date is invalid." }, { status: 400 });
    }

    let receiptUrl: string | null = null;
    const receiptFile = formData.get("receipt");

    if (receiptFile instanceof File && receiptFile.size > 0) {
      receiptUrl = await saveReceiptFile(receiptFile);
    }

    const expense = await db.expense.create({
      data: {
        title,
        description,
        amount,
        currency,
        category: categoryValue,
        paymentStatus: paymentStatusValue,
        vendorName,
        expenseDate,
        paidAt,
        receiptUrl,
        notes,
        bookingId,
        tourId,
        departureDateId,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, expenseId: expense.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create expense.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}