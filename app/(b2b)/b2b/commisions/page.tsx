import { db } from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default async function AgentCommissionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      approved: true,
      status: true,
      fullName: true,
      travelAgency: true,
    },
  });

  if (!user || user.role !== "AGENT" || !user.approved || user.status !== "ACTIVE") {
    redirect("/agent-login");
  }

  const bookings = await db.booking.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      bookingReference: true,
      tourTitleSnapshot: true,
      departureDateSnapshot: true,
      numberOfGuests: true,
      grossAmount: true,
      commissionAmount: true,
      netAmount: true,
      status: true,
      paymentStatus: true,
      createdAt: true,
    },
  });

  const totalBookings = bookings.length;
  const totalGuests = bookings.reduce((sum, booking) => sum + booking.numberOfGuests, 0);
  const totalCommission = bookings.reduce(
    (sum, booking) => sum + booking.commissionAmount,
    0
  );

  const pendingCommission = bookings
    .filter((booking) => booking.status === "PENDING" || booking.status === "ON_REQUEST")
    .reduce((sum, booking) => sum + booking.commissionAmount, 0);

  const confirmedCommission = bookings
    .filter((booking) => booking.status === "CONFIRMED")
    .reduce((sum, booking) => sum + booking.commissionAmount, 0);

  const unpaidCommission = bookings
    .filter((booking) => booking.paymentStatus === "UNPAID")
    .reduce((sum, booking) => sum + booking.commissionAmount, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#001F3F]">Commissions</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Track your bookings, earnings, and commission totals.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            {user.travelAgency || user.fullName || "Agent Account"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Total Bookings
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {totalBookings}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Total Guests
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {totalGuests}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Total Commission
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {formatCurrency(totalCommission)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Pending Commission
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(pendingCommission)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Confirmed Commission
          </div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(confirmedCommission)}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-[#001F3F]">
            Unpaid Commission
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatCurrency(unpaidCommission)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Based on bookings where payment status is still unpaid.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-[#001F3F]">
            Average Commission Per Booking
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatCurrency(totalBookings > 0 ? totalCommission / totalBookings : 0)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Average commission generated per booking.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-[#001F3F]">
            Average Commission Per Guest
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatCurrency(totalGuests > 0 ? totalCommission / totalGuests : 0)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Average commission generated per traveler.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Commission by Booking
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review each booking’s revenue and commission amount.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Reference</th>
                <th className="p-3">Tour</th>
                <th className="p-3">Departure</th>
                <th className="p-3">Guests</th>
                <th className="p-3">Gross</th>
                <th className="p-3">Commission</th>
                <th className="p-3">Net</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Booked</th>
              </tr>
            </thead>

            <tbody>
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-muted-foreground">
                    No commission records yet.
                  </td>
                </tr>
              )}

              {bookings.map((booking) => (
                <tr key={booking.id} className="border-t">
                  <td className="p-3 font-medium">
                    <Link
                      href={`/b2b/bookings/${booking.id}`}
                      className="text-red-700 hover:underline"
                    >
                      {booking.bookingReference}
                    </Link>
                  </td>
                  <td className="p-3">{booking.tourTitleSnapshot}</td>
                  <td className="p-3">{formatDate(booking.departureDateSnapshot)}</td>
                  <td className="p-3">{booking.numberOfGuests}</td>
                  <td className="p-3">{formatCurrency(booking.grossAmount)}</td>
                  <td className="p-3 font-medium text-green-700">
                    {formatCurrency(booking.commissionAmount)}
                  </td>
                  <td className="p-3">{formatCurrency(booking.netAmount)}</td>
                  <td className="p-3">{booking.status}</td>
                  <td className="p-3">{booking.paymentStatus}</td>
                  <td className="p-3">{formatDate(booking.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}