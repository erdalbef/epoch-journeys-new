import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  BankStatementLineMatchStatus,
  BankStatementStatus,
  BankTransactionDirection,
  Prisma,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type CsvRow = Record<string, string>;

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }

      continue;
    }

    if (character === '"') {
      quoted = true;
      continue;
    }

    if (character === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (character !== "\r") {
      field += character;
    }
  }

  row.push(field);

  if (row.some((value) => value.trim())) {
    rows.push(row);
  }

  return rows;
}

function toRows(text: string) {
  const parsed = parseCsv(text);

  if (parsed.length < 2) {
    throw new Error(
      "CSV must contain a header row and at least one transaction row.",
    );
  }

  const headers = parsed[0].map(normalizeHeader);

  return parsed
    .slice(1)
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => {
      const item: CsvRow = {};

      headers.forEach((header, index) => {
        if (header) {
          item[header] = (row[index] || "").trim();
        }
      });

      return item;
    });
}

function firstValue(row: CsvRow, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[alias];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function parseNumber(value: string) {
  const raw = value
    .trim()
    .replace(/\s/g, "")
    .replace(/[€£$]/g, "");

  if (!raw) {
    return null;
  }

  let normalized = raw;

  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");

  if (comma >= 0 && dot >= 0) {
    if (comma > dot) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (comma >= 0) {
    const decimals = raw.length - comma - 1;

    normalized =
      decimals === 2
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw.replace(/,/g, "");
  } else {
    normalized = raw.replace(/,/g, "");
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const iso = /^\d{4}-\d{2}-\d{2}/.exec(trimmed);

  if (iso) {
    const date = new Date(`${iso[0]}T12:00:00.000Z`);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const european =
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);

  if (european) {
    const [, day, month, year] = european;

    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day), 12),
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(trimmed);

  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseDirection(value: string) {
  const normalized = value.trim().toUpperCase();

  if (
    ["IN", "CREDIT", "CR", "C", "RECEIPT", "DEPOSIT"].includes(
      normalized,
    )
  ) {
    return BankTransactionDirection.IN;
  }

  if (
    ["OUT", "DEBIT", "DR", "D", "PAYMENT", "WITHDRAWAL"].includes(
      normalized,
    )
  ) {
    return BankTransactionDirection.OUT;
  }

  return null;
}

function parseStatementLine(row: CsvRow, currency: string) {
  const dateText = firstValue(row, [
    "date",
    "transactiondate",
    "bookingdate",
    "posteddate",
  ]);

  const transactionDate = parseDate(dateText);

  if (!transactionDate) {
    throw new Error(
      `Invalid or missing transaction date: "${dateText || "blank"}".`,
    );
  }

  const valueDateText = firstValue(row, [
    "valuedate",
    "valuedate",
  ]);

  const debit = parseNumber(
    firstValue(row, ["debit", "debitamount", "withdrawal"]),
  );

  const credit = parseNumber(
    firstValue(row, ["credit", "creditamount", "deposit"]),
  );

  const amountValue = parseNumber(
    firstValue(row, [
      "amount",
      "transactionamount",
      "value",
    ]),
  );

  const directionText = firstValue(row, [
    "direction",
    "drcr",
    "creditdebit",
    "type",
  ]);

  let direction: BankTransactionDirection | null = null;
  let amount: number | null = null;

  if (credit !== null && Math.abs(credit) > 0.000001) {
    direction = BankTransactionDirection.IN;
    amount = Math.abs(credit);
  } else if (debit !== null && Math.abs(debit) > 0.000001) {
    direction = BankTransactionDirection.OUT;
    amount = Math.abs(debit);
  } else if (amountValue !== null) {
    direction =
      parseDirection(directionText) ||
      (amountValue < 0
        ? BankTransactionDirection.OUT
        : BankTransactionDirection.IN);

    amount = Math.abs(amountValue);
  }

  if (!direction || amount === null || amount <= 0) {
    throw new Error(
      `Could not determine amount/direction for statement row dated ${dateText}.`,
    );
  }

  const description =
    firstValue(row, [
      "description",
      "details",
      "memo",
      "narrative",
      "transactiondescription",
    ]) || null;

  const reference =
    firstValue(row, [
      "reference",
      "ref",
      "transactionreference",
      "paymentreference",
    ]) || null;

  const balance = parseNumber(
    firstValue(row, [
      "balance",
      "runningbalance",
      "closingbalance",
    ]),
  );

  return {
    transactionDate,
    valueDate: valueDateText ? parseDate(valueDateText) : null,
    description,
    reference,
    amount: new Prisma.Decimal(amount),
    direction,
    currency,
    balance:
      balance === null ? null : new Prisma.Decimal(balance),
    matchStatus: BankStatementLineMatchStatus.UNMATCHED,
    rawData: row as Prisma.InputJsonObject,
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      session.user.role !== Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const formData = await request.formData();

    const bankAccountId = String(
      formData.get("bankAccountId") || "",
    ).trim();

    const statementDateValue = String(
      formData.get("statementDate") || "",
    ).trim();

    const currency = String(
      formData.get("currency") || "EUR",
    )
      .trim()
      .toUpperCase();

    const openingBalanceRaw = String(
      formData.get("openingBalance") || "",
    ).trim();

    const closingBalanceRaw = String(
      formData.get("closingBalance") || "",
    ).trim();

    const notesValue = String(formData.get("notes") || "").trim();

    const file = formData.get("file");

    if (!bankAccountId) {
      return NextResponse.json(
        {
          error: "Select a bank or cash account.",
        },
        {
          status: 400,
        },
      );
    }

    if (currency.length !== 3) {
      return NextResponse.json(
        {
          error: "Currency must be a 3-letter code.",
        },
        {
          status: 400,
        },
      );
    }

    const statementDate = statementDateValue
      ? new Date(`${statementDateValue}T23:59:59.999Z`)
      : null;

    if (!statementDate || Number.isNaN(statementDate.getTime())) {
      return NextResponse.json(
        {
          error: "Statement date is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "CSV file is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        {
          error: "The selected CSV file is empty.",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "CSV file must be 5 MB or smaller.",
        },
        {
          status: 400,
        },
      );
    }

    const account = await db.bankAccount.findUnique({
      where: {
        id: bankAccountId,
      },
      select: {
        id: true,
        currency: true,
        isActive: true,
      },
    });

    if (!account || !account.isActive) {
      return NextResponse.json(
        {
          error: "Selected bank account is not available.",
        },
        {
          status: 400,
        },
      );
    }

    if (account.currency !== currency) {
      return NextResponse.json(
        {
          error:
            "Statement currency must match the bank account currency.",
        },
        {
          status: 400,
        },
      );
    }

    const duplicate = await db.bankStatement.findFirst({
      where: {
        bankAccountId,
        statementDate,
        fileName: file.name,
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "This statement file has already been imported for the selected account and statement date.",
        },
        {
          status: 409,
        },
      );
    }

    const text = await file.text();
    const rows = toRows(text);

    const parsedLines = rows.map((row) =>
      parseStatementLine(row, currency),
    );

    if (parsedLines.length === 0) {
      return NextResponse.json(
        {
          error: "No statement transactions were found in the CSV.",
        },
        {
          status: 400,
        },
      );
    }

    const openingBalance = openingBalanceRaw
      ? parseNumber(openingBalanceRaw)
      : null;

    const closingBalance = closingBalanceRaw
      ? parseNumber(closingBalanceRaw)
      : null;

    if (openingBalanceRaw && openingBalance === null) {
      return NextResponse.json(
        {
          error: "Opening balance is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    if (closingBalanceRaw && closingBalance === null) {
      return NextResponse.json(
        {
          error: "Closing balance is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const statement = await db.$transaction(async (tx) => {
      const created = await tx.bankStatement.create({
        data: {
          bankAccountId,
          uploadedById: session.user.id,
          fileName: file.name,
          fileType: file.type || "text/csv",
          statementDate,
          openingBalance:
            openingBalance === null
              ? null
              : new Prisma.Decimal(openingBalance),
          closingBalance:
            closingBalance === null
              ? null
              : new Prisma.Decimal(closingBalance),
          currency,
          status: BankStatementStatus.IMPORTED,
          notes: notesValue || null,
        },
        select: {
          id: true,
        },
      });

      await tx.bankStatementLine.createMany({
        data: parsedLines.map((line) => ({
          bankStatementId: created.id,
          ...line,
        })),
      });

      return created;
    });

    return NextResponse.json(
      {
        success: true,
        statement: {
          id: statement.id,
          importedLines: parsedLines.length,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("IMPORT_BANK_STATEMENT_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import bank statement.",
      },
      {
        status: 500,
      },
    );
  }
}
