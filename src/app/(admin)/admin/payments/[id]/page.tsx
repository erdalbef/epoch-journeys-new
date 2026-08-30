import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import EditCustomerPaymentForm from "@/components/admin/payments/EditCustomerPaymentForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PaymentDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const { id } = await params;

  const [payment, tours, bookings, bankAccounts] = await Promise.all([
    db.payment.findUnique({
      where: { id },
      include: {
        bankTransactions: {
          where: { status: "POSTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            bankAccountId: true,
          },
        },
        financeDocument: {
          select: {
            storagePath: true,
          },
        },
      },
    }),
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
      },
      orderBy: { createdAt: "desc" },
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
      },
    }),
    db.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    }),
  ]);

  if (!payment) notFound();

  const ledger = payment.bankTransactions[0];

  if (!ledger) {
    throw new Error("This payment has no active posted Finance Ledger transaction.");
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Finance
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#001F3F]">
            Customer Payment
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View and update the customer receipt and its linked financial record.
          </p>
        </div>

        <Link href="/admin/payments" className="text-sm font-semibold text-blue-700 hover:underline">
          Back to Payments
        </Link>
      </div>

      <EditCustomerPaymentForm
        payment={{
          id: payment.id,
          bookingId: payment.bookingId,
          tourId: payment.tourId,
          agencyGroupName: payment.agencyGroupName,
          amount: payment.amount,
          currency: payment.currency,
          bankAccountId: ledger.bankAccountId,
          method: payment.method,
          paidAt: (payment.paidAt || payment.createdAt).toISOString().slice(0, 10),
          reference: payment.reference,
          notes: payment.notes,
          status: payment.status,
          proofUrl: payment.financeDocument?.storagePath ?? null,
        }}
        tours={tours}
        bookings={bookings}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
