import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import CustomerPaymentForm from "@/components/admin/payments/CustomerPaymentForm";

export default async function AdminNewPaymentPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const [tours, bookings, bankAccounts] = await Promise.all([
    db.tour.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        tourCode: true,
        currency: true,
      },
    }),

    db.booking.findMany({
      where: {
        status: { not: "CANCELLED" },
        amountDue: { gt: 0 },
      },
      orderBy: [{ paymentDueDate: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        tourId: true,
        tourTitleSnapshot: true,
        agencyNameSnapshot: true,
        agentNameSnapshot: true,
        groupName: true,
        customerName: true,
        currency: true,
        totalPrice: true,
        amountPaid: true,
        amountDue: true,
      },
    }),

    db.bankAccount.findMany({
      where: { isActive: true },
      orderBy: [{ currency: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        currency: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Finance
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#001F3F]">
            Record Customer Payment
          </h1>

          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Record customer income directly. Booking is optional; Tour /
            Package and Agency / Parish / Group can be linked independently.
          </p>
        </div>

        <Link
          href="/admin/payments"
          className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Payments
        </Link>
      </div>

      <CustomerPaymentForm
        tours={tours}
        bookings={bookings}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
