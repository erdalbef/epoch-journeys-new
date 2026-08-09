import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  BankStatementStatus,
  BankTransactionStatus,
  BankTransactionType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

import BankStatementManager from "./BankStatementManager";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BankStatementDetailPage({
  params,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const { id } = await params;

  const statement = await db.bankStatement.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      statementDate: true,
      openingBalance: true,
      closingBalance: true,
      currency: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,

      bankAccount: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },

      uploadedBy: {
        select: {
          fullName: true,
          email: true,
        },
      },

      lines: {
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
          transactionDate: true,
          valueDate: true,
          description: true,
          reference: true,
          amount: true,
          direction: true,
          currency: true,
          balance: true,
          matchStatus: true,
          matchedAt: true,
          matchedBankTransactionId: true,

          matchedBankTransaction: {
            select: {
              id: true,
              type: true,
              direction: true,
              status: true,
              amount: true,
              currency: true,
              transactionDate: true,
              reference: true,
              description: true,
              reconciliationId: true,
            },
          },
        },
      },
    },
  });

  if (!statement) {
    notFound();
  }

  const previousStatement = await db.bankStatement.findFirst({
    where: {
      bankAccountId: statement.bankAccount.id,
      id: {
        not: statement.id,
      },
      statementDate: {
        lt: statement.statementDate,
      },
      status: {
        not: BankStatementStatus.ARCHIVED,
      },
    },
    orderBy: {
      statementDate: "desc",
    },
    select: {
      statementDate: true,
    },
  });

  const candidateTransactions = await db.bankTransaction.findMany({
    where: {
      bankAccountId: statement.bankAccount.id,
      status: BankTransactionStatus.POSTED,
      type: {
        not: BankTransactionType.OPENING_BALANCE,
      },
      transactionDate: {
        ...(previousStatement
          ? {
              gt: previousStatement.statementDate,
            }
          : {}),
        lte: statement.statementDate,
      },
      OR: [
        {
          statementLine: null,
        },
        {
          statementLine: {
            bankStatementId: statement.id,
          },
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

      statementLine: {
        select: {
          id: true,
          bankStatementId: true,
        },
      },

      booking: {
        select: {
          bookingReference: true,
          bookingDisplayCode: true,
        },
      },

      supplierPayablePayment: {
        select: {
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
          title: true,
          vendorName: true,
        },
      },

      refund: {
        select: {
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
            Bank Statement
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            {statement.bankAccount.name}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {statement.fileName || "CSV import"} ·{" "}
            {statement.statementDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/finance/bank-statements"
            className={secondaryButton}
          >
            ← Statements
          </Link>

          <Link
            href="/admin/finance/reconciliation"
            className={secondaryButton}
          >
            Bank Reconciliation
          </Link>
        </div>
      </div>

      <BankStatementManager
        statement={{
          id: statement.id,
          fileName: statement.fileName,
          fileType: statement.fileType,
          statementDate: statement.statementDate.toISOString(),
          openingBalance:
            statement.openingBalance === null
              ? null
              : Number(statement.openingBalance),
          closingBalance:
            statement.closingBalance === null
              ? null
              : Number(statement.closingBalance),
          currency: statement.currency,
          status: statement.status,
          notes: statement.notes,
          createdAt: statement.createdAt.toISOString(),
          updatedAt: statement.updatedAt.toISOString(),
          uploadedBy:
            statement.uploadedBy?.fullName ||
            statement.uploadedBy?.email ||
            "Admin",
          bankAccount: statement.bankAccount,
        }}
        previousStatementDate={
          previousStatement?.statementDate.toISOString() ?? null
        }
        lines={statement.lines.map((line) => ({
          ...line,
          transactionDate: line.transactionDate.toISOString(),
          valueDate: line.valueDate?.toISOString() ?? null,
          amount: Number(line.amount),
          balance: line.balance === null ? null : Number(line.balance),
          matchedAt: line.matchedAt?.toISOString() ?? null,
          matchedBankTransaction: line.matchedBankTransaction
            ? {
                ...line.matchedBankTransaction,
                amount: Number(line.matchedBankTransaction.amount),
                transactionDate:
                  line.matchedBankTransaction.transactionDate.toISOString(),
              }
            : null,
        }))}
        candidates={candidateTransactions.map((transaction) => ({
          ...transaction,
          amount: Number(transaction.amount),
          transactionDate: transaction.transactionDate.toISOString(),
          valueDate: transaction.valueDate?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}

const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]";
