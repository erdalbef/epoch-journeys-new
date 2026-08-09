import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BankReconciliationStatus,
  BankTransactionStatus,
  BankTransactionType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

import ReconciliationManager from "./ReconciliationManager";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BankReconciliationDetailPage({
  params,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const { id } = await params;

  const reconciliation = await db.bankReconciliation.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      statementDate: true,
      statementOpeningBalance: true,
      statementClosingBalance: true,
      ledgerOpeningBalance: true,
      ledgerClosingBalance: true,
      difference: true,
      status: true,
      reconciledAt: true,
      lockedAt: true,
      notes: true,
      createdAt: true,
      updatedAt: true,

      bankAccount: {
        select: {
          id: true,
          name: true,
          currency: true,
          openingBalance: true,
          isActive: true,
        },
      },

      createdBy: {
        select: {
          fullName: true,
          email: true,
        },
      },

      transactions: {
        orderBy: [
          {
            transactionDate: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        select: {
          id: true,
          type: true,
          direction: true,
          status: true,
          amount: true,
          currency: true,
          transactionDate: true,
          valueDate: true,
          reference: true,
          description: true,
          reconciledAt: true,

          booking: {
            select: {
              id: true,
              bookingReference: true,
              bookingDisplayCode: true,
            },
          },

          supplierPayablePayment: {
            select: {
              id: true,
              payable: {
                select: {
                  title: true,
                  supplierNameSnapshot: true,
                },
              },
            },
          },

          expense: {
            select: {
              id: true,
              title: true,
              vendorName: true,
            },
          },

          refund: {
            select: {
              id: true,
              booking: {
                select: {
                  bookingReference: true,
                  bookingDisplayCode: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!reconciliation) {
    notFound();
  }

  const previousReconciliation = await db.bankReconciliation.findFirst({
    where: {
      bankAccountId: reconciliation.bankAccount.id,
      id: {
        not: reconciliation.id,
      },
      statementDate: {
        lt: reconciliation.statementDate,
      },
      status: {
        in: [
          BankReconciliationStatus.RECONCILED,
          BankReconciliationStatus.LOCKED,
        ],
      },
    },
    orderBy: {
      statementDate: "desc",
    },
    select: {
      id: true,
      statementDate: true,
    },
  });

  const availableTransactions = await db.bankTransaction.findMany({
    where: {
      bankAccountId: reconciliation.bankAccount.id,

      status: BankTransactionStatus.POSTED,

      type: {
        not: BankTransactionType.OPENING_BALANCE,
      },

      transactionDate: {
        ...(previousReconciliation
          ? {
              gt: previousReconciliation.statementDate,
            }
          : {}),
        lte: reconciliation.statementDate,
      },

      OR: [
        {
          reconciliationId: null,
        },
        {
          reconciliationId: reconciliation.id,
        },
      ],
    },
    orderBy: [
      {
        transactionDate: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      type: true,
      direction: true,
      status: true,
      amount: true,
      currency: true,
      transactionDate: true,
      valueDate: true,
      reference: true,
      description: true,
      reconciliationId: true,
      reconciledAt: true,

      booking: {
        select: {
          id: true,
          bookingReference: true,
          bookingDisplayCode: true,
        },
      },

      supplierPayablePayment: {
        select: {
          id: true,
          payable: {
            select: {
              title: true,
              supplierNameSnapshot: true,
            },
          },
        },
      },

      expense: {
        select: {
          id: true,
          title: true,
          vendorName: true,
        },
      },

      refund: {
        select: {
          id: true,
          booking: {
            select: {
              bookingReference: true,
              bookingDisplayCode: true,
            },
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Bank Reconciliation
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            {reconciliation.bankAccount.name}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Statement date:{" "}
            {reconciliation.statementDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance/reconciliation"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            ← Reconciliation List
          </Link>

          <Link
            href="/admin/finance/documents"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Finance Documents
          </Link>
        </div>
      </div>

      <ReconciliationManager
        reconciliation={{
          id: reconciliation.id,
          statementDate: reconciliation.statementDate.toISOString(),
          statementOpeningBalance: Number(
            reconciliation.statementOpeningBalance,
          ),
          statementClosingBalance: Number(
            reconciliation.statementClosingBalance,
          ),
          ledgerOpeningBalance: Number(reconciliation.ledgerOpeningBalance),
          ledgerClosingBalance: Number(reconciliation.ledgerClosingBalance),
          difference: Number(reconciliation.difference),
          status: reconciliation.status,
          reconciledAt: reconciliation.reconciledAt?.toISOString() ?? null,
          lockedAt: reconciliation.lockedAt?.toISOString() ?? null,
          notes: reconciliation.notes,
          createdAt: reconciliation.createdAt.toISOString(),
          updatedAt: reconciliation.updatedAt.toISOString(),
          createdBy:
            reconciliation.createdBy?.fullName ||
            reconciliation.createdBy?.email ||
            "Admin",
          bankAccount: {
            id: reconciliation.bankAccount.id,
            name: reconciliation.bankAccount.name,
            currency: reconciliation.bankAccount.currency,
            openingBalance: reconciliation.bankAccount.openingBalance,
            isActive: reconciliation.bankAccount.isActive,
          },
        }}
        previousStatementDate={
          previousReconciliation?.statementDate.toISOString() ?? null
        }
        matchedTransactions={reconciliation.transactions.map(
          (transaction) => ({
            ...transaction,
            amount: Number(transaction.amount),
            transactionDate: transaction.transactionDate.toISOString(),
            valueDate: transaction.valueDate?.toISOString() ?? null,
            reconciledAt: transaction.reconciledAt?.toISOString() ?? null,
          }),
        )}
        availableTransactions={availableTransactions.map((transaction) => ({
          ...transaction,
          amount: Number(transaction.amount),
          transactionDate: transaction.transactionDate.toISOString(),
          valueDate: transaction.valueDate?.toISOString() ?? null,
          reconciledAt: transaction.reconciledAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
