import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  AccountingPeriodStatus,
  CashTransactionDirection,
  CashTransactionStatus,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function optionalString(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text || null;
}

function getDueDate(year: number, month: number) {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return new Date(
    Date.UTC(nextYear, nextMonth - 1, 5, 12, 0, 0),
  );
}

function isCashDirection(
  value: string,
): value is CashTransactionDirection {
  return Object.values(CashTransactionDirection).includes(
    value as CashTransactionDirection,
  );
}

function isCashStatus(
  value: string,
): value is CashTransactionStatus {
  return Object.values(CashTransactionStatus).includes(
    value as CashTransactionStatus,
  );
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const formData = await request.formData();

    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid accounting period.",
        },
        {
          status: 400,
        },
      );
    }

    const directionRaw =
      formData.get("direction")?.toString().trim() ?? "";

    if (!isCashDirection(directionRaw)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid cash transaction direction.",
        },
        {
          status: 400,
        },
      );
    }

    const statusRaw =
      formData.get("status")?.toString().trim() ||
      CashTransactionStatus.POSTED;

    if (!isCashStatus(statusRaw)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid cash transaction status.",
        },
        {
          status: 400,
        },
      );
    }

    const transactionDateRaw = optionalString(
      formData.get("transactionDate"),
    );

    if (!transactionDateRaw) {
      return NextResponse.json(
        {
          ok: false,
          error: "Transaction date is required.",
        },
        {
          status: 400,
        },
      );
    }

    const transactionDate = new Date(
      `${transactionDateRaw}T12:00:00.000Z`,
    );

    if (Number.isNaN(transactionDate.getTime())) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid transaction date.",
        },
        {
          status: 400,
        },
      );
    }

    const amount = Number(formData.get("amount"));

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Amount must be greater than zero.",
        },
        {
          status: 400,
        },
      );
    }

    const currency =
      formData.get("currency")?.toString().trim().toUpperCase() ||
      "EUR";

    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Currency must be a 3-letter code.",
        },
        {
          status: 400,
        },
      );
    }

    const description = optionalString(formData.get("description"));

    if (!description) {
      return NextResponse.json(
        {
          ok: false,
          error: "Description is required.",
        },
        {
          status: 400,
        },
      );
    }

    const counterparty = optionalString(formData.get("counterparty"));
    const reference = optionalString(formData.get("reference"));
    const notes = optionalString(formData.get("notes"));

    const supplierId = optionalString(formData.get("supplierId"));
    const bookingId = optionalString(formData.get("bookingId"));
    const tourId = optionalString(formData.get("tourId"));
    const departureDateId = optionalString(
      formData.get("departureDateId"),
    );

    const period = await db.accountingPeriod.upsert({
      where: {
        year_month: {
          year,
          month,
        },
      },
      update: {},
      create: {
        year,
        month,
        dueDate: getDueDate(year, month),
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (period.status === AccountingPeriodStatus.CLOSED) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This accounting period is closed. Reopen it before adding cash transactions.",
        },
        {
          status: 409,
        },
      );
    }

    const [supplier, booking, tour, departure] = await Promise.all([
      supplierId
        ? db.supplier.findUnique({
            where: { id: supplierId },
            select: { id: true },
          })
        : Promise.resolve(null),
      bookingId
        ? db.booking.findUnique({
            where: { id: bookingId },
            select: { id: true },
          })
        : Promise.resolve(null),
      tourId
        ? db.tour.findUnique({
            where: { id: tourId },
            select: { id: true },
          })
        : Promise.resolve(null),
      departureDateId
        ? db.departureDate.findUnique({
            where: { id: departureDateId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (supplierId && !supplier) {
      return NextResponse.json(
        { ok: false, error: "Selected supplier was not found." },
        { status: 400 },
      );
    }

    if (bookingId && !booking) {
      return NextResponse.json(
        { ok: false, error: "Selected booking was not found." },
        { status: 400 },
      );
    }

    if (tourId && !tour) {
      return NextResponse.json(
        { ok: false, error: "Selected tour was not found." },
        { status: 400 },
      );
    }

    if (departureDateId && !departure) {
      return NextResponse.json(
        { ok: false, error: "Selected departure was not found." },
        { status: 400 },
      );
    }

    await db.cashTransaction.create({
      data: {
        accountingPeriodId: period.id,
        createdById: session.user.id,
        direction: directionRaw,
        status: statusRaw,
        transactionDate,
        amount,
        currency,
        counterparty,
        description,
        reference,
        notes,
        supplierId,
        bookingId,
        tourId,
        departureDateId,
      },
    });

    const redirectUrl = new URL("/admin/accounting/cash", request.url);
    redirectUrl.searchParams.set("year", String(year));
    redirectUrl.searchParams.set("month", String(month));
    redirectUrl.searchParams.set("created", "1");

    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    console.error("POST /api/admin/accounting/cash error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to record cash transaction.",
      },
      {
        status: 500,
      },
    );
  }
}
