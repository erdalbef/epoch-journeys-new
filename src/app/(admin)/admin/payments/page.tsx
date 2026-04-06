import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import AdminPaymentReviewActions from "@/components/admin/payments/AdminPaymentReviewActions";

export default async function AdminPaymentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const submissions = await db.paymentSubmission.findMany({
    include: {
      booking: {
        select: {
          id: true,
          bookingReference: true,
          bookingDisplayCode: true,
          amountPaid: true,
          amountDue: true,
          totalPrice: true,
          currency: true,
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment Review
        </h1>
        <p className="text-sm text-muted-foreground">
          Review and approve incoming payment submissions.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Booking</th>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Balance</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Submitted</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No payment submissions found.
                </td>
              </tr>
            ) : (
              submissions.map((submission) => {
                const bookingRef =
                  submission.booking.bookingDisplayCode ||
                  submission.booking.bookingReference;

                return (
                  <tr key={submission.id} className="border-b last:border-0">
                    {/* Booking */}
                    <td className="px-4 py-3">
                      <div className="font-medium">{bookingRef}</div>
                    </td>

                    {/* Agent */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span>{submission.user?.fullName || "-"}</span>
                        <span className="text-xs text-slate-500">
                          {submission.user?.email || "-"}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3">
                      {submission.amount} {submission.currency}
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div>
                          Paid: {submission.booking.amountPaid}
                        </div>
                        <div>
                          Due: {submission.booking.amountDue}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold">
                        {submission.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {submission.createdAt.toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <AdminPaymentReviewActions
                        submissionId={submission.id}
                        bookingId={submission.booking.id}
                        bookingAmountPaid={submission.booking.amountPaid}
                        bookingAmountDue={submission.booking.amountDue}
                        submissionAmount={submission.amount}
                        currentStatus={submission.status}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}