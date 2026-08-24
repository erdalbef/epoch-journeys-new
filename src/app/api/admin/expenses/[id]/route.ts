import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  BankTransactionDirection,
  BankTransactionStatus,
  BankTransactionType,
  ExpenseApprovalStatus,
  ExpenseCategory,
  ExpenseCostType,
  ExpensePaymentStatus,
  FinanceDirection,
  FinanceSourceType,
  FinanceTaxType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const existing = await db.expense.findUnique({
      where: { id },
      select: {
        id: true,
        direction: true,
        paymentStatus: true,
        amount: true,
        currency: true,
        bankAccountId: true,
        paidAt: true,
        expenseDate: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Expense not found." },
        { status: 404 },
      );
    }

    if (existing.direction !== FinanceDirection.EXPENSE) {
      return NextResponse.json(
        {
          error:
            "Historical manual income records are read-only in Additional Expenses.",
        },
        { status: 400 },
      );
    }

    const formData = await request.formData();

    const requestedDirection = String(
      formData.get("direction") || FinanceDirection.EXPENSE,
    ).trim();

    if (requestedDirection !== FinanceDirection.EXPENSE) {
      return NextResponse.json(
        {
          error:
            "Manual income entry is disabled. Customer income must be recorded through bookings, payment schedules, and customer payments.",
        },
        { status: 400 },
      );
    }

    const sourceType = String(
      formData.get("sourceType") || FinanceSourceType.INTERNAL,
    ).trim();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const amount = Number(formData.get("amount") || 0);
    const currency = "EUR";
    const category = String(formData.get("category") || "").trim();
    const paymentStatus = String(
      formData.get("paymentStatus") || ExpensePaymentStatus.PENDING,
    ).trim();
    const costType = String(
      formData.get("costType") || ExpenseCostType.OVERHEAD,
    ).trim();
    const approvalStatus = String(
      formData.get("approvalStatus") || ExpenseApprovalStatus.DRAFT,
    ).trim();

    const vendorName = String(formData.get("vendorName") || "").trim();
    const expenseDateValue = String(formData.get("expenseDate") || "").trim();
    const paidAtValue = String(formData.get("paidAt") || "").trim();
    const receiptUrl = String(formData.get("receiptUrl") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    const bookingIdRaw = String(formData.get("bookingId") || "").trim();
    const tourIdRaw = String(formData.get("tourId") || "").trim();
    const departureDateIdRaw = String(
      formData.get("departureDateId") || "",
    ).trim();
    const partnerCompanyIdRaw = String(
      formData.get("partnerCompanyId") || "",
    ).trim();

    const bankAccountIdRaw = String(
      formData.get("bankAccountId") || "",
    ).trim();

    const taxType = String(
      formData.get("taxType") || FinanceTaxType.NONE,
    ).trim();
    const taxRate = Number(formData.get("taxRate") || 0);
    const taxAmount = Number(formData.get("taxAmount") || 0);
    const netAmount = Number(formData.get("netAmount") || 0);
    const grossAmount = Number(formData.get("grossAmount") || 0);

    const agentNameSnapshot = String(
      formData.get("agentNameSnapshot") || "",
    ).trim();
    const partnerCompanyName = String(
      formData.get("partnerCompanyName") || "",
    ).trim();
    const tourLeaderName = String(
      formData.get("tourLeaderName") || "",
    ).trim();
    const customPackageName = String(
      formData.get("customPackageName") || "",
    ).trim();
    const groupName = String(formData.get("groupName") || "").trim();
    const clientCompanyName = String(
      formData.get("clientCompanyName") || "",
    ).trim();
    const spenderName = String(formData.get("spenderName") || "").trim();
    const tourCategoryName = String(
      formData.get("tourCategoryName") || "",
    ).trim();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 },
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero." },
        { status: 400 },
      );
    }

    if (
      !Object.values(FinanceSourceType).includes(
        sourceType as FinanceSourceType,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid source type." },
        { status: 400 },
      );
    }

    if (!Object.values(ExpenseCategory).includes(category as ExpenseCategory)) {
      return NextResponse.json(
        { error: "Invalid category." },
        { status: 400 },
      );
    }

    if (
      !Object.values(ExpensePaymentStatus).includes(
        paymentStatus as ExpensePaymentStatus,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid payment status." },
        { status: 400 },
      );
    }

    if (!Object.values(FinanceTaxType).includes(taxType as FinanceTaxType)) {
      return NextResponse.json(
        { error: "Invalid tax type." },
        { status: 400 },
      );
    }

    if (!Object.values(ExpenseCostType).includes(costType as ExpenseCostType)) {
      return NextResponse.json(
        { error: "Invalid cost type." },
        { status: 400 },
      );
    }

    if (
      !Object.values(ExpenseApprovalStatus).includes(
        approvalStatus as ExpenseApprovalStatus,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid approval status." },
        { status: 400 },
      );
    }

    if (
      costType === ExpenseCostType.DIRECT_TOUR_COST &&
      !departureDateIdRaw
    ) {
      return NextResponse.json(
        {
          error:
            "Direct tour costs must be linked to a departure so Profitability can include them correctly.",
        },
        { status: 400 },
      );
    }

    const expenseDate = expenseDateValue
      ? new Date(`${expenseDateValue}T00:00:00.000Z`)
      : existing.expenseDate;

    const isPaid = paymentStatus === ExpensePaymentStatus.PAID;

    const existingPostedTransaction = await db.bankTransaction.findFirst({
      where: {
        expenseId: id,
        type: BankTransactionType.EXPENSE_PAYMENT,
        status: BankTransactionStatus.POSTED,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        bankAccountId: true,
        amount: true,
        notes: true,
      },
    });

    const resolvedBankAccountId = isPaid
      ? bankAccountIdRaw ||
        existing.bankAccountId ||
        existingPostedTransaction?.bankAccountId ||
        ""
      : "";

    let selectedBankAccount:
      | {
          id: string;
          currency: string;
          isActive: boolean;
        }
      | null = null;

    if (isPaid) {
      if (!resolvedBankAccountId) {
        return NextResponse.json(
          {
            error:
              "Select the bank account used to pay this expense before marking it PAID.",
          },
          { status: 400 },
        );
      }

      selectedBankAccount = await db.bankAccount.findUnique({
        where: {
          id: resolvedBankAccountId,
        },
        select: {
          id: true,
          currency: true,
          isActive: true,
        },
      });

      if (!selectedBankAccount) {
        return NextResponse.json(
          { error: "Selected bank account was not found." },
          { status: 400 },
        );
      }

      if (!selectedBankAccount.isActive) {
        return NextResponse.json(
          { error: "Selected bank account is inactive." },
          { status: 400 },
        );
      }

      if (selectedBankAccount.currency !== currency) {
        return NextResponse.json(
          {
            error: `Expense currency ${currency} does not match bank account currency ${selectedBankAccount.currency}.`,
          },
          { status: 400 },
        );
      }
    }

    const resolvedPaidAt = isPaid
      ? paidAtValue
        ? new Date(`${paidAtValue}T00:00:00.000Z`)
        : existing.paidAt || expenseDate
      : null;

    await db.$transaction(async (tx) => {
      /*
       * If there is an active posted expense payment, first restore the old
       * bank balance. We then either repost the updated payment or void it.
       * This keeps amount/account changes mathematically correct.
       */
      if (existingPostedTransaction) {
        await tx.bankAccount.update({
          where: {
            id: existingPostedTransaction.bankAccountId,
          },
          data: {
            currentBalance: {
              increment: Number(existingPostedTransaction.amount),
            },
          },
        });

        if (isPaid && resolvedBankAccountId && resolvedPaidAt) {
          await tx.bankAccount.update({
            where: {
              id: resolvedBankAccountId,
            },
            data: {
              currentBalance: {
                decrement: amount,
              },
            },
          });

          await tx.bankTransaction.update({
            where: {
              id: existingPostedTransaction.id,
            },
            data: {
              bankAccountId: resolvedBankAccountId,
              createdById: session.user.id,
              type: BankTransactionType.EXPENSE_PAYMENT,
              direction: BankTransactionDirection.OUT,
              status: BankTransactionStatus.POSTED,
              amount,
              currency,
              transactionDate: resolvedPaidAt,
              valueDate: resolvedPaidAt,
              reference: null,
              description: title,
              notes: notes || null,
              bookingId:
                bookingIdRaw && bookingIdRaw !== "NONE"
                  ? bookingIdRaw
                  : null,
              tourId:
                tourIdRaw && tourIdRaw !== "NONE"
                  ? tourIdRaw
                  : null,
              departureDateId:
                departureDateIdRaw && departureDateIdRaw !== "NONE"
                  ? departureDateIdRaw
                  : null,
              reversedAt: null,
            },
          });
        } else {
          await tx.bankTransaction.update({
            where: {
              id: existingPostedTransaction.id,
            },
            data: {
              status: BankTransactionStatus.VOIDED,
              reversedAt: new Date(),
              notes: [
                existingPostedTransaction.notes,
                "Voided because the Additional Expense payment status was changed from PAID.",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          });
        }
      } else if (isPaid && resolvedBankAccountId && resolvedPaidAt) {
        /*
         * This covers PENDING -> PAID and also older PAID expenses that were
         * created before automatic ledger posting existed.
         */
        await tx.bankTransaction.create({
          data: {
            bankAccountId: resolvedBankAccountId,
            createdById: session.user.id,
            type: BankTransactionType.EXPENSE_PAYMENT,
            direction: BankTransactionDirection.OUT,
            status: BankTransactionStatus.POSTED,
            amount,
            currency,
            transactionDate: resolvedPaidAt,
            valueDate: resolvedPaidAt,
            reference: null,
            description: title,
            notes: notes || null,
            bookingId:
              bookingIdRaw && bookingIdRaw !== "NONE"
                ? bookingIdRaw
                : null,
            expenseId: id,
            tourId:
              tourIdRaw && tourIdRaw !== "NONE"
                ? tourIdRaw
                : null,
            departureDateId:
              departureDateIdRaw && departureDateIdRaw !== "NONE"
                ? departureDateIdRaw
                : null,
          },
        });

        await tx.bankAccount.update({
          where: {
            id: resolvedBankAccountId,
          },
          data: {
            currentBalance: {
              decrement: amount,
            },
          },
        });
      }

      await tx.expense.update({
        where: { id },
        data: {
          direction: FinanceDirection.EXPENSE,
          sourceType: sourceType as FinanceSourceType,
          title,
          description: description || null,
          amount,
          currency,
          category: category as ExpenseCategory,
          paymentStatus: paymentStatus as ExpensePaymentStatus,
          costType: costType as ExpenseCostType,
          approvalStatus: approvalStatus as ExpenseApprovalStatus,
          vendorName: vendorName || null,
          expenseDate,
          paidAt: resolvedPaidAt,
          receiptUrl: receiptUrl || null,
          notes: notes || null,
          bookingId:
            bookingIdRaw && bookingIdRaw !== "NONE" ? bookingIdRaw : null,
          tourId:
            tourIdRaw && tourIdRaw !== "NONE" ? tourIdRaw : null,
          departureDateId:
            departureDateIdRaw && departureDateIdRaw !== "NONE"
              ? departureDateIdRaw
              : null,
          partnerCompanyId:
            partnerCompanyIdRaw && partnerCompanyIdRaw !== "NONE"
              ? partnerCompanyIdRaw
              : null,
          bankAccountId: isPaid ? resolvedBankAccountId : null,
          taxType: taxType as FinanceTaxType,
          taxRate,
          taxAmount,
          netAmount,
          grossAmount,
          agentNameSnapshot: agentNameSnapshot || null,
          partnerCompanyName: partnerCompanyName || null,
          tourLeaderName: tourLeaderName || null,
          customPackageName: customPackageName || null,
          groupName: groupName || null,
          clientCompanyName: clientCompanyName || null,
          spenderName: spenderName || null,
          tourCategoryName: tourCategoryName || null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      ledgerPosted: isPaid,
      ledgerVoided: !isPaid && Boolean(existingPostedTransaction),
    });
  } catch (error) {
    console.error("UPDATE_ADDITIONAL_EXPENSE_ERROR", error);

    return NextResponse.json(
      { error: "Failed to update expense." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const postedTransaction = await db.bankTransaction.findFirst({
      where: {
        expenseId: id,
        type: BankTransactionType.EXPENSE_PAYMENT,
        status: BankTransactionStatus.POSTED,
      },
      select: {
        id: true,
      },
    });

    if (postedTransaction) {
      return NextResponse.json(
        {
          error:
            "This expense has a posted bank payment. Change the expense to PENDING or CANCELLED first so the bank movement can be voided safely.",
        },
        { status: 400 },
      );
    }

    await db.$transaction(async (tx) => {
      /*
       * Preserve historical VOIDED ledger rows, but detach them from the
       * expense so the Expense record can be removed without a relation error.
       */
      await tx.bankTransaction.updateMany({
        where: {
          expenseId: id,
        },
        data: {
          expenseId: null,
        },
      });

      await tx.expense.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_ADDITIONAL_EXPENSE_ERROR", error);

    return NextResponse.json(
      { error: "Failed to delete expense." },
      { status: 500 },
    );
  }
}
