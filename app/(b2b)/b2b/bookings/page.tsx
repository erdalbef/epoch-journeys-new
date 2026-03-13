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

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "ON_REQUEST":
      return "bg-blue-100 text-blue-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getPaymentBadgeClass(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "PARTIALLY_PAID":
      return "bg-amber-100 text-amber-700";
    case "UNPAID":
      return "bg-slate-100 text-slate-700";
    case "REFUNDED":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function AgentBookingsPage() {
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
      status: true,
      paymentStatus: true,
      grossAmount: true,
      createdAt: true,
    },
  });

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((booking) => booking.status === "CONFIRMED").length;
  const pendingBookings = bookings.filter((booking) => booking.status === "PENDING").length;
  const totalValue = bookings.reduce((sum, booking) => sum + booking.grossAmount, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#001F3F]">
              My Bookings
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              View and manage your tour bookings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/b2b/tours"
              className="rounded-lg bg-[#8B0000] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              Book a Tour
            </Link>

            <Link
              href="/b2b/dashboard"
              className="rounded-lg border px-5 py-3 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Total Bookings
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {totalBookings}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Confirmed
          </div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {confirmedBookings}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Pending
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {pendingBookings}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Total Booking Value
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {formatCurrency(totalValue)}
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-gray-50 text-left">
            <tr className="border-b">
              <th className="p-4 font-medium text-muted-foreground">Reference</th>
              <th className="p-4 font-medium text-muted-foreground">Tour</th>
              <th className="p-4 font-medium text-muted-foreground">Departure</th>
              <th className="p-4 font-medium text-muted-foreground">Guests</th>
              <th className="p-4 font-medium text-muted-foreground">Amount</th>
              <th className="p-4 font-medium text-muted-foreground">Status</th>
              <th className="p-4 font-medium text-muted-foreground">Payment</th>
              <th className="p-4 font-medium text-muted-foreground">Booked</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center">
                  <div className="mx-auto max-w-md space-y-3">
                    <p className="text-base font-medium text-[#001F3F]">
                      No bookings yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You have not created any bookings yet. Browse available
                      tours and departures to get started.
                    </p>
                    <div className="pt-2">
                      <Link
                        href="/b2b/tours"
                        className="inline-flex rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
                      >
                        Browse Tours
                      </Link>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-t align-middle">
                  <td className="p-4 font-medium">
                    <Link
                      href={`/b2b/bookings/${booking.id}`}
                      className="text-[#8B0000] hover:underline"
                    >
                      {booking.bookingReference}
                    </Link>
                  </td>

                  <td className="p-4 text-[#001F3F]">
                    {booking.tourTitleSnapshot}
                  </td>

                  <td className="p-4 text-muted-foreground">
                    {formatDate(booking.departureDateSnapshot)}
                  </td>

                  <td className="p-4">{booking.numberOfGuests}</td>

                  <td className="p-4 font-medium">
                    {formatCurrency(booking.grossAmount)}
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentBadgeClass(
                        booking.paymentStatus
                      )}`}
                    >
                      {booking.paymentStatus}
                    </span>
                  </td>

                  <td className="p-4 text-muted-foreground">
                    {formatDate(booking.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}