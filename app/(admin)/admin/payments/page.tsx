import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  Role,
  Prisma,
  PaymentSubmissionStatus,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

import { formatCurrency } from "@/lib/payments/formatCurrency";
import { getSubmissionStatusClass } from "@/lib/payments/paymentBadges";
import { getSubmissionStatusLabel } from "@/lib/payments/paymentStatus";

import AdminPaymentReviewActions from "@/components/admin/payments/AdminPaymentReviewActions";

type SearchParams = {
  status?: string;
  from?: string;
  to?: string;
  agent?: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = (await searchParams) ?? {};

  const status = params.status?.trim() ?? "";
  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";
  const agent = params.agent?.trim() ?? "";

  const validStatuses: PaymentSubmissionStatus[] = [
    "PENDING",
    "APPROVED",
    "REJECTED",
  ];

  const safeStatus: PaymentSubmissionStatus | undefined =
    validStatuses.includes(status as PaymentSubmissionStatus)
      ? (status as PaymentSubmissionStatus)
      : undefined;

  const where: Prisma.PaymentSubmissionWhereInput = {
    ...(safeStatus ? { status: safeStatus } : {}),

    ...(from || to
      ? {
          createdAt: {
            ...(from
              ? { gte: new Date(`${from}T00:00:00.000Z`) }
              : {}),
            ...(to
              ? { lte: new Date(`${to}T23:59:59.999Z`) }
              : {}),
          },
        }
      : {}),

    ...(agent
      ? {
          user: {
            OR: [
              {
                fullName: {
                  contains: agent,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: agent,
                  mode: "insensitive",
                },
              },
            ],
          },
        }
      : {}),
  };

  const submissions = await db.paymentSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      booking: {
        select: {
          id: true,
          bookingReference: true,
          bookingDisplayCode: true,
          amountDue: true,
          amountPaid: true,
          currency: true,
          tourTitleSnapshot: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  const pendingSubmissions = submissions.filter(
    (s) => s.status === "PENDING"
  );

  const approvedSubmissions = submissions.filter(
    (s) => s.status === "APPROVED"
  );

  const rejectedSubmissions = submissions.filter(
    (s) => s.status === "REJECTED"
  );

  const totalPendingAmount = pendingSubmissions.reduce(
    (sum, s) => sum + s.amount,
    0
  );

  const totalApprovedAmount = approvedSubmissions.reduce(
    (sum, s) => sum + s.amount,
    0
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const approvedToday = approvedSubmissions.filter(
    (s) => new Date(s.createdAt) >= today
  ).length;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-[#001F3F]">
          Payment Submissions
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review and approve agent-submitted payments.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <DashboardCard
          title="Pending Amount"
          value={formatCurrency(totalPendingAmount)}
          color="amber"
        />
        <DashboardCard
          title="Pending Count"
          value={pendingSubmissions.length}
          color="amber"
        />
        <DashboardCard
          title="Approved Today"
          value={approvedToday}
          color="green"
        />
        <DashboardCard
          title="Total Approved"
          value={formatCurrency(totalApprovedAmount)}
          color="green"
        />
        <DashboardCard
          title="Rejected"
          value={rejectedSubmissions.length}
          color="red"
        />
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Filters
        </h2>

        <form className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border px-4 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              From
            </label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="w-full rounded-xl border px-4 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              To
            </label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="w-full rounded-xl border px-4 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Agent
            </label>
            <input
              name="agent"
              defaultValue={agent}
              placeholder="Name or email"
              className="w-full rounded-xl border px-4 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-4 flex gap-3">
            <button className="rounded-xl bg-[#001F3F] px-4 py-2 text-sm text-white">
              Apply Filters
            </button>

            <a
              href="/admin/payments"
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Reset
            </a>
          </div>
        </form>
      </section>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Booking</th>
              <th className="p-3 text-left">Agent</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Method</th>
              <th className="p-3 text-left">Proof</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">PDF</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-500">
                  No payment submissions found.
                </td>
              </tr>
            ) : (
              submissions.map((item) => (
                <tr
                  key={item.id}
                  className={`border-t ${
                    item.status === "PENDING" ? "bg-amber-50" : ""
                  }`}
                >
                  <td className="p-3">
                    <div className="font-medium text-[#001F3F]">
                      {item.booking.bookingDisplayCode ||
                        item.booking.bookingReference}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.booking.tourTitleSnapshot}
                    </div>
                    <div className="text-xs text-slate-400">
                      Due:{" "}
                      {formatCurrency(
                        item.booking.amountDue,
                        item.booking.currency
                      )}
                    </div>
                  </td>

                  <td className="p-3">
                    <div>{item.user.fullName || "-"}</div>
                    <div className="text-xs text-slate-500">
                      {item.user.email}
                    </div>
                  </td>

                  <td className="p-3 font-medium">
                    {formatCurrency(item.amount, item.currency)}
                  </td>

                  <td className="p-3">{item.method}</td>

                  <td className="p-3">
                    {item.proofUrl ? (
                      <a
                        href={item.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#8B0000] hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-slate-400">No proof</span>
                    )}
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getSubmissionStatusClass(
                        item.status
                      )}`}
                    >
                      {getSubmissionStatusLabel(item.status)}
                    </span>
                  </td>

                  <td className="p-3">{formatDate(item.createdAt)}</td>

                  <td className="p-3">
                    {item.status === "APPROVED" ? (
                      <a
                        href={`/api/admin/payments/${item.id}/receipt`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold text-[#001F3F] transition hover:border-[#8B0000] hover:text-[#8B0000]"
                      >
                        Open PDF
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  <td className="p-3">
                    <AdminPaymentReviewActions
                      submissionId={item.id}
                      bookingId={item.booking.id}
                      bookingAmountPaid={item.booking.amountPaid}
                      bookingAmountDue={item.booking.amountDue}
                      submissionAmount={item.amount}
                      currentStatus={item.status}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string | number;
  color?: "green" | "red" | "amber";
}) {
  const colorClass =
    color === "green"
      ? "text-green-700"
      : color === "red"
      ? "text-red-700"
      : color === "amber"
      ? "text-amber-700"
      : "text-slate-900";

  const bgClass =
    color === "green"
      ? "bg-green-50"
      : color === "red"
      ? "bg-red-50"
      : color === "amber"
      ? "bg-amber-50"
      : "bg-white";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${bgClass}`}>
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className={`mt-2 text-2xl font-bold ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}