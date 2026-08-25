import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  ExpenseApprovalStatus,
  ExpenseCategory,
  ExpenseCostType,
  ExpensePaymentSource,
  ExpensePaymentStatus,
  ExpenseReimbursementStatus,
  FinanceDirection,
  FinanceSourceType,
  FinanceTaxType,
  Role,
} from "@prisma/client";
import fs from "fs/promises";
import path from "path";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function isValidEnum<T extends Record<string, string>>(
  source: T,
  value: string,
): value is T[keyof T] {
  return Object.values(source).includes(value);
}

function optionalNumber(
  value: FormDataEntryValue | null,
) {
  const raw = String(value || "").trim();

  if (!raw) {
    return null;
  }

  const number = Number(raw);

  return Number.isFinite(number)
    ? number
    : null;
}

export async function POST(
  request: Request,
) {
  try {
    const session =
      await getServerSession(
        authOptions,
      );

    if (
      !session?.user ||
      session.user.role !==
        Role.ADMIN
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const formData =
      await request.formData();

    const requestedDirection =
      String(
        formData.get(
          "direction",
        ) ||
          FinanceDirection.EXPENSE,
      ).trim();

    if (
      requestedDirection !==
      FinanceDirection.EXPENSE
    ) {
      return NextResponse.json(
        {
          error:
            "Manual income entry is disabled. Customer income must be recorded through bookings, payment schedules, and customer payments.",
        },
        {
          status: 400,
        },
      );
    }

    const title = String(
      formData.get("title") ||
        "",
    ).trim();

    const description = String(
      formData.get(
        "description",
      ) || "",
    ).trim();

    const amount = Number(
      formData.get("amount") ||
        0,
    );

    const currency = "EUR";

    const category = String(
      formData.get(
        "category",
      ) || "",
    ).trim();

    const paymentStatus =
      String(
        formData.get(
          "paymentStatus",
        ) ||
          ExpensePaymentStatus.PENDING,
      ).trim();

    const paymentSource =
      String(
        formData.get(
          "paymentSource",
        ) ||
          ExpensePaymentSource.COMPANY_BANK,
      ).trim();

    const reimbursementStatus =
      String(
        formData.get(
          "reimbursementStatus",
        ) ||
          ExpenseReimbursementStatus.NOT_APPLICABLE,
      ).trim();

    const sourceType = String(
      formData.get(
        "sourceType",
      ) ||
        FinanceSourceType.INTERNAL,
    ).trim();

    const taxType = String(
      formData.get(
        "taxType",
      ) ||
        FinanceTaxType.NONE,
    ).trim();

    const costType = String(
      formData.get(
        "costType",
      ) ||
        ExpenseCostType.OVERHEAD,
    ).trim();

    const approvalStatus =
      String(
        formData.get(
          "approvalStatus",
        ) ||
          ExpenseApprovalStatus.DRAFT,
      ).trim();

    const vendorName = String(
      formData.get(
        "vendorName",
      ) || "",
    ).trim();

    const expenseDateValue =
      String(
        formData.get(
          "expenseDate",
        ) || "",
      ).trim();

    const paidAtValue = String(
      formData.get(
        "paidAt",
      ) || "",
    ).trim();

    const notes = String(
      formData.get("notes") ||
        "",
    ).trim();

    const requestedBankAccountId =
      String(
        formData.get(
          "bankAccountId",
        ) || "",
      ).trim();

    const reimbursable =
      String(
        formData.get(
          "reimbursable",
        ) || "false",
      ) === "true";

    const reimbursedAmount =
      optionalNumber(
        formData.get(
          "reimbursedAmount",
        ),
      ) ?? 0;

    const reimbursedAtValue =
      String(
        formData.get(
          "reimbursedAt",
        ) || "",
      ).trim();

    const reimbursementReference =
      String(
        formData.get(
          "reimbursementReference",
        ) || "",
      ).trim();

    let receiptUrl = String(
      formData.get(
        "receiptUrl",
      ) || "",
    ).trim();

    const receiptFile =
      formData.get("receipt");

    if (
      receiptFile &&
      typeof receiptFile !==
        "string" &&
      receiptFile.size > 0
    ) {
      const allowedTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          receiptFile.type,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Only PDF, JPG, PNG, and WEBP files are allowed.",
          },
          {
            status: 400,
          },
        );
      }

      const maxSize =
        10 * 1024 * 1024;

      if (
        receiptFile.size >
        maxSize
      ) {
        return NextResponse.json(
          {
            error:
              "Receipt file must be smaller than 10MB.",
          },
          {
            status: 400,
          },
        );
      }

      const bytes =
        await receiptFile.arrayBuffer();

      const buffer =
        Buffer.from(bytes);

      const uploadDir =
        path.join(
          process.cwd(),
          "public",
          "uploads",
          "expenses",
        );

      await fs.mkdir(
        uploadDir,
        {
          recursive: true,
        },
      );

      const safeFileName =
        `${Date.now()}-${receiptFile.name}`
          .replace(
            /\s+/g,
            "-",
          )
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "",
          );

      await fs.writeFile(
        path.join(
          uploadDir,
          safeFileName,
        ),
        buffer,
      );

      receiptUrl =
        `/uploads/expenses/${safeFileName}`;
    }

    const bookingIdRaw =
      String(
        formData.get(
          "bookingId",
        ) || "",
      ).trim();

    const tourIdRaw =
      String(
        formData.get(
          "tourId",
        ) || "",
      ).trim();

    const departureDateIdRaw =
      String(
        formData.get(
          "departureDateId",
        ) || "",
      ).trim();

    const agentNameSnapshot =
      String(
        formData.get(
          "agentNameSnapshot",
        ) || "",
      ).trim();

    const partnerCompanyName =
      String(
        formData.get(
          "partnerCompanyName",
        ) || "",
      ).trim();

    const tourLeaderName =
      String(
        formData.get(
          "tourLeaderName",
        ) || "",
      ).trim();

    const customPackageName =
      String(
        formData.get(
          "customPackageName",
        ) || "",
      ).trim();

    const groupName =
      String(
        formData.get(
          "groupName",
        ) || "",
      ).trim();

    const clientCompanyName =
      String(
        formData.get(
          "clientCompanyName",
        ) || "",
      ).trim();

    const spenderName =
      String(
        formData.get(
          "spenderName",
        ) || "",
      ).trim();

    const tourCategoryName =
      String(
        formData.get(
          "tourCategoryName",
        ) || "",
      ).trim();

    const partnerCompanyIdRaw =
      String(
        formData.get(
          "partnerCompanyId",
        ) || "",
      ).trim();

    const taxRateValue =
      String(
        formData.get(
          "taxRate",
        ) || "",
      ).trim();

    const taxAmountValue =
      String(
        formData.get(
          "taxAmount",
        ) || "",
      ).trim();

    const grossAmountValue =
      String(
        formData.get(
          "grossAmount",
        ) || "",
      ).trim();

    const netAmountValue =
      String(
        formData.get(
          "netAmount",
        ) || "",
      ).trim();

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Title is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !amount ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Amount must be greater than zero.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidEnum(
        ExpenseCategory,
        category,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid category.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidEnum(
        ExpensePaymentStatus,
        paymentStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment status.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidEnum(
        ExpensePaymentSource,
        paymentSource,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment source.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidEnum(
        ExpenseReimbursementStatus,
        reimbursementStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid reimbursement status.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidEnum(
        FinanceSourceType,
        sourceType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid source type.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidEnum(
        FinanceTaxType,
        taxType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid tax type.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidEnum(
        ExpenseCostType,
        costType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid cost type.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isValidEnum(
        ExpenseApprovalStatus,
        approvalStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid approval status.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      costType ===
        ExpenseCostType.DIRECT_TOUR_COST &&
      !departureDateIdRaw
    ) {
      return NextResponse.json(
        {
          error:
            "Direct tour costs must be linked to a departure so Profitability can include them correctly.",
        },
        {
          status: 400,
        },
      );
    }

    const isCompanyBank =
      paymentSource ===
      ExpensePaymentSource.COMPANY_BANK;

    const isPersonallyPaid =
      paymentSource ===
        ExpensePaymentSource.EMPLOYEE_PERSONAL ||
      paymentSource ===
        ExpensePaymentSource.OWNER_PERSONAL;

    const resolvedPaymentStatus =
      isPersonallyPaid
        ? ExpensePaymentStatus.PAID
        : paymentStatus;

    const isPaid =
      resolvedPaymentStatus ===
      ExpensePaymentStatus.PAID;

    if (
      isCompanyBank &&
      isPaid &&
      !requestedBankAccountId
    ) {
      return NextResponse.json(
        {
          error:
            "Select the company bank account used to pay this expense.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      isPersonallyPaid &&
      !spenderName
    ) {
      return NextResponse.json(
        {
          error:
            "Enter the employee, accountable person, or owner who paid this expense.",
        },
        {
          status: 400,
        },
      );
    }

    const bankAccountId =
      isCompanyBank
        ? requestedBankAccountId
        : "";

    let bankAccount:
      | {
          id: string;
          name: string;
          currency: string;
          isActive: boolean;
        }
      | null = null;

    if (bankAccountId) {
      bankAccount =
        await db.bankAccount.findUnique(
          {
            where: {
              id: bankAccountId,
            },

            select: {
              id: true,
              name: true,
              currency: true,
              isActive: true,
            },
          },
        );

      if (!bankAccount) {
        return NextResponse.json(
          {
            error:
              "Selected bank account was not found.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !bankAccount.isActive
      ) {
        return NextResponse.json(
          {
            error:
              "Selected bank account is inactive.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        bankAccount.currency !==
        currency
      ) {
        return NextResponse.json(
          {
            error: `Expense currency ${currency} does not match bank account currency ${bankAccount.currency}.`,
          },
          {
            status: 400,
          },
        );
      }
    }

    const expenseDate =
      expenseDateValue
        ? new Date(
            `${expenseDateValue}T00:00:00.000Z`,
          )
        : new Date();

    if (
      Number.isNaN(
        expenseDate.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid expense date.",
        },
        {
          status: 400,
        },
      );
    }

    const resolvedPaidAt =
      isPaid
        ? paidAtValue
          ? new Date(
              `${paidAtValue}T00:00:00.000Z`,
            )
          : expenseDate
        : null;

    if (
      resolvedPaidAt &&
      Number.isNaN(
        resolvedPaidAt.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid paid date.",
        },
        {
          status: 400,
        },
      );
    }

    const reimbursedAt =
      reimbursedAtValue
        ? new Date(
            `${reimbursedAtValue}T00:00:00.000Z`,
          )
        : null;

    if (
      reimbursedAt &&
      Number.isNaN(
        reimbursedAt.getTime(),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid reimbursement date.",
        },
        {
          status: 400,
        },
      );
    }

    const resolvedReimbursable =
      isPersonallyPaid
        ? true
        : reimbursable;

    const resolvedReimbursementStatus =
      isPersonallyPaid
        ? reimbursementStatus ===
          ExpenseReimbursementStatus.NOT_APPLICABLE
          ? ExpenseReimbursementStatus.PENDING
          : reimbursementStatus
        : ExpenseReimbursementStatus.NOT_APPLICABLE;

    if (
      reimbursedAmount < 0 ||
      reimbursedAmount >
        amount
    ) {
      return NextResponse.json(
        {
          error:
            "Reimbursed amount must be between zero and the expense amount.",
        },
        {
          status: 400,
        },
      );
    }

    const ledgerPosted =
      isCompanyBank &&
      isPaid &&
      Boolean(
        bankAccountId,
      ) &&
      Boolean(
        resolvedPaidAt,
      );

    const createdExpense =
      await db.$transaction(
        async (tx) => {
          const expense =
            await tx.expense.create(
              {
                data: {
                  title,

                  description:
                    description ||
                    null,

                  amount,
                  currency,

                  originalAmount:
                    amount,

                  originalCurrency:
                    "EUR",

                  exchangeRateToBase:
                    1,

                  baseCurrency:
                    "EUR",

                  baseAmount:
                    amount,

                  category,

                  paymentStatus:
                    resolvedPaymentStatus,

                  paymentSource,

                  reimbursementStatus:
                    resolvedReimbursementStatus,

                  reimbursable:
                    resolvedReimbursable,

                  reimbursedAmount,

                  reimbursedAt:
                    resolvedReimbursementStatus ===
                    ExpenseReimbursementStatus.REIMBURSED
                      ? reimbursedAt ||
                        new Date()
                      : reimbursedAt,

                  reimbursementReference:
                    reimbursementReference ||
                    null,

                  direction:
                    FinanceDirection.EXPENSE,

                  sourceType,

                  costType,

                  approvalStatus,

                  vendorName:
                    vendorName ||
                    null,

                  expenseDate,

                  paidAt:
                    resolvedPaidAt,

                  receiptUrl:
                    receiptUrl ||
                    null,

                  notes:
                    notes ||
                    null,

                  bookingId:
                    bookingIdRaw ||
                    null,

                  tourId:
                    tourIdRaw ||
                    null,

                  departureDateId:
                    departureDateIdRaw ||
                    null,

                  bankAccountId:
                    bankAccountId ||
                    null,

                  createdById:
                    session.user.id,

                  taxType,

                  taxRate:
                    taxRateValue
                      ? Number(
                          taxRateValue,
                        )
                      : null,

                  taxAmount:
                    taxAmountValue
                      ? Number(
                          taxAmountValue,
                        )
                      : 0,

                  grossAmount:
                    grossAmountValue
                      ? Number(
                          grossAmountValue,
                        )
                      : null,

                  netAmount:
                    netAmountValue
                      ? Number(
                          netAmountValue,
                        )
                      : null,

                  agentNameSnapshot:
                    agentNameSnapshot ||
                    null,

                  partnerCompanyName:
                    partnerCompanyName ||
                    null,

                  tourLeaderName:
                    tourLeaderName ||
                    null,

                  customPackageName:
                    customPackageName ||
                    null,

                  groupName:
                    groupName ||
                    null,

                  clientCompanyName:
                    clientCompanyName ||
                    null,

                  spenderName:
                    spenderName ||
                    null,

                  tourCategoryName:
                    tourCategoryName ||
                    null,

                  partnerCompanyId:
                    partnerCompanyIdRaw ||
                    null,
                },
              },
            );

          /*
           * Only COMPANY_BANK payments affect the
           * company's bank ledger immediately.
           *
           * Employee/owner-paid expenses remain company
           * expenses but create no company-bank movement
           * until a separate reimbursement is actually made.
           */
          if (
            ledgerPosted &&
            bankAccountId &&
            resolvedPaidAt
          ) {
            await tx.bankTransaction.create(
              {
                data: {
                  bankAccountId,

                  createdById:
                    session.user.id,

                  type:
                    BankTransactionType.EXPENSE_PAYMENT,

                  direction:
                    BankTransactionDirection.OUT,

                  status:
                    BankTransactionStatus.POSTED,

                  amount,
                  currency,

                  transactionDate:
                    resolvedPaidAt,

                  valueDate:
                    resolvedPaidAt,

                  reference:
                    null,

                  description:
                    title,

                  notes:
                    notes ||
                    null,

                  bookingId:
                    bookingIdRaw ||
                    null,

                  expenseId:
                    expense.id,

                  tourId:
                    tourIdRaw ||
                    null,

                  departureDateId:
                    departureDateIdRaw ||
                    null,
                },
              },
            );

            await tx.bankAccount.update(
              {
                where: {
                  id: bankAccountId,
                },

                data: {
                  currentBalance: {
                    decrement:
                      amount,
                  },
                },
              },
            );
          }

          return expense;
        },
      );

    return NextResponse.json({
      success: true,

      expenseId:
        createdExpense.id,

      ledgerPosted,

      paymentSource:
        createdExpense.paymentSource,

      reimbursementStatus:
        createdExpense.reimbursementStatus,
    });
  } catch (error) {
    console.error(
      "CREATE_ADDITIONAL_EXPENSE_ERROR",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to save expense.",
      },
      {
        status: 500,
      },
    );
  }
}
