import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import BankTransferForm from "./BankTransferForm";

function formatCurrency(
  value: number,
  currency: string,
) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(
  value: Date,
) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function BankTransfersPage() {
  const session = await getServerSession(authOptions);

  if (
    !session?.user ||
    session.user.role !== Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const [bankAccounts, transferRows] =
    await Promise.all([
      db.bankAccount.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          currency: true,
        },
      }),

      db.bankTransaction.findMany({
        where: {
          type: "TRANSFER_OUT",
        },
        orderBy: {
          transactionDate: "desc",
        },
        take: 25,
        select: {
          id: true,
          transferGroupId: true,
          amount: true,
          currency: true,
          transactionDate: true,
          reference: true,
          description: true,
          notes: true,
          bankAccount: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

  const transferGroupIds = transferRows
    .map((item) => item.transferGroupId)
    .filter(
      (value): value is string =>
        Boolean(value),
    );

  const incomingTransfers =
    transferGroupIds.length > 0
      ? await db.bankTransaction.findMany({
          where: {
            type: "TRANSFER_IN",
            transferGroupId: {
              in: transferGroupIds,
            },
          },
          select: {
            transferGroupId: true,
            bankAccount: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : [];

  const incomingByGroup = new Map(
    incomingTransfers.map((item) => [
      item.transferGroupId,
      item.bankAccount,
    ]),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
          Finance
        </p>

        <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
          Bank Transfers
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Move funds between Epoch Journeys bank or cash accounts without
          recording false income or expense.
        </p>
      </div>

      <BankTransferForm
        bankAccounts={bankAccounts}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-[#001F3F]">
            Recent Transfers
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Each transfer contains one outgoing and one incoming ledger entry
            linked by the same transfer group.
          </p>
        </div>

        {transferRows.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            No bank transfers recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    From
                  </th>

                  <th className="px-4 py-3">
                    To
                  </th>

                  <th className="px-4 py-3 text-right">
                    Amount
                  </th>

                  <th className="px-4 py-3">
                    Reference
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {transferRows.map((transfer) => {
                  const destination =
                    transfer.transferGroupId
                      ? incomingByGroup.get(
                          transfer.transferGroupId,
                        )
                      : null;

                  return (
                    <tr
                      key={transfer.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(
                          transfer.transactionDate,
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-900">
                        {transfer.bankAccount.name}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-900">
                        {destination?.name || "-"}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(
                          Number(transfer.amount),
                          transfer.currency,
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {transfer.reference || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}