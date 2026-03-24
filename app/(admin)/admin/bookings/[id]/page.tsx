import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import AddPaymentForm from "@/components/admin/bookings/AddPaymentForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminBookingDetailPage({
  params,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
  });

  if (!booking) {
    redirect("/admin/bookings");
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold mb-4">
        Booking #{booking.bookingNumber}
      </h1>

      <div className="mb-6 space-y-2">
        <p>Total: €{booking.totalPrice}</p>
        <p>Paid: €{booking.amountPaid}</p>
        <p>Due: €{booking.amountDue}</p>
        <p>Status: {booking.paymentStatus}</p>
      </div>

      <AddPaymentForm
        bookingId={booking.id}
        defaultCurrency={booking.currency}
        disabled={booking.paymentStatus === "PAID"}
      />
    </div>
  );
}