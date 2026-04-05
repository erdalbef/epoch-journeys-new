import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { ApprovePayoutButton } from "@/components/admin/ApprovePayoutButton";
import { ExportPayoutsButton } from "@/components/admin/ExportPayoutsButton";
import { MarkPayoutPaidButton } from "@/components/admin/MarkPayoutPaidButton";



function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function payoutBadge(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "APPROVED":
      return "bg-blue-100 text-blue-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

type SearchParams = {
  q?: string;
  partnerType?: string;
  payoutStatus?: string;
  createdFrom?: string;
  createdTo?: string;
};

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const params = (await searchParams) ?? {};

  const createdFrom = params.createdFrom
    ? new Date(params.createdFrom)
    : undefined;

  const createdTo = params.createdTo
    ? new Date(params.createdTo + "T23:59:59")
    : undefined;

  const payoutRecords = await db.partnerPayout.findMany({
    where: {
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      agentId: true,
      totalAmount: true,
      currency: true,
      status: true,
      paymentReference: true,
      paymentMethod: true,
      createdAt: true,
      paidAt: true,
      agent: {
        select: {
          fullName: true,
          email: true,
          travelAgency: true,
        },
      },
    },
  });

  return (
    <div className="space-y-8 p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">Payouts</h1>
          <p className="text-sm text-muted-foreground">
            Manage partner payouts and financial settlements.
          </p>
        </div>

        <div className="flex gap-3">
          <ExportPayoutsButton />

          <Link
            href="/admin/dashboard"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:text-[#8B0000]"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* FILTERS */}
      <form className="grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-4">
        <div>
          <label className="text-sm font-medium">From</label>
          <input
            type="date"
            name="createdFrom"
            defaultValue={params.createdFrom ?? ""}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">To</label>
          <input
            type="date"
            name="createdTo"
            defaultValue={params.createdTo ?? ""}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-[#8B0000] px-4 py-2 text-white"
          >
            Apply
          </button>

          <Link
            href="/admin/payouts"
            className="rounded-lg border px-4 py-2"
          >
            Reset
          </Link>
        </div>
      </form>

      {/* TABLE */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Partner</th>
              <th className="p-3 text-left">Agency</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Paid</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {payoutRecords.map((payout) => (
              <tr key={payout.id} className="border-t">
                <td className="p-3">
                  <Link
                    href={`/admin/payouts/${payout.id}`}
                    className="font-medium text-[#001F3F]"
                  >
                    {payout.agent.fullName || payout.agent.email}
                  </Link>
                </td>

                <td className="p-3">
                  {payout.agent.travelAgency || "—"}
                </td>

                <td className="p-3 font-semibold">
                  {formatCurrency(payout.totalAmount, payout.currency)}
                </td>

                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${payoutBadge(
                      payout.status
                    )}`}
                  >
                    {payout.status}
                  </span>
                </td>

                <td className="p-3">
                  {formatDateTime(payout.createdAt)}
                </td>

                <td className="p-3">
                  {formatDateTime(payout.paidAt)}
                </td>

                <td className="p-3 flex gap-2">
                  <ApprovePayoutButton
                    payoutId={payout.id}
                    status={payout.status}
                  />
                  <MarkPayoutPaidButton
                    payoutId={payout.id}
                    status={payout.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}