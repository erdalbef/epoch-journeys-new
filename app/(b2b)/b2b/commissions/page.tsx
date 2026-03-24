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
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function CommissionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const agent = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      commissionRate: true,
      payoutPerPax: true,
      bookings: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          bookingReference: true,
          createdAt: true,
          status: true,
          paymentStatus: true,
          numberOfGuests: true,
          grossAmount: true,
          commissionAmount: true,
          netAmount: true,
          currency: true,
          commissionRateSnapshot: true,
          payoutPerPaxSnapshot: true,
          tourTitleSnapshot: true,
          departureDateSnapshot: true,
        },
      },
    },
  });

  if (!agent) {
    redirect("/agent-login");
  }

  const totalBookings = agent.bookings.length;

  const confirmedBookings = agent.bookings.filter(
    (booking) => booking.status === "CONFIRMED"
  );

  const totalGrossSales = confirmedBookings.reduce(
    (sum, booking) => sum + booking.grossAmount,
    0
  );

  const totalCommissionEarned = confirmedBookings.reduce(
    (sum, booking) => sum + booking.commissionAmount,
    0
  );

  const totalNetAmount = confirmedBookings.reduce(
    (sum, booking) => sum + booking.netAmount,
    0
  );

  const upcomingBookings = agent.bookings.filter(
    (booking) => new Date(booking.departureDateSnapshot) >= new Date()
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#001F3F]">
            Commissions Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your booking performance, gross sales, and earned commission.
          </p>
        </div>

        <Link
          href="/b2b/bookings"
          className="inline-flex w-fit rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
        >
          View All Bookings
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Bookings</p>
          <p className="mt-2 text-3xl font-semibold text-[#001F3F]">
            {totalBookings}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            All bookings created under your account
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Confirmed Sales</p>
          <p className="mt-2 text-3xl font-semibold text-[#001F3F]">
            {formatCurrency(totalGrossSales)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Gross amount from confirmed bookings
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Commission Earned</p>
          <p className="mt-2 text-3xl font-semibold text-green-700">
            {formatCurrency(totalCommissionEarned)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Total commission from confirmed bookings
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Upcoming Departures</p>
          <p className="mt-2 text-3xl font-semibold text-[#001F3F]">
            {upcomingBookings}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Bookings with future departure dates
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_2fr]">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Commission Settings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your current commercial terms used in booking calculations
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">Partner</p>
              <p className="font-medium text-[#001F3F]">
                {agent.fullName || agent.email}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Commission Rate</p>
              <p className="font-medium text-[#001F3F]">
                {agent.commissionRate !== null && agent.commissionRate !== undefined
                  ? `${agent.commissionRate}%`
                  : "Not set"}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Payout Per Pax</p>
              <p className="font-medium text-[#001F3F]">
                {agent.payoutPerPax !== null && agent.payoutPerPax !== undefined
                  ? formatCurrency(agent.payoutPerPax)
                  : "Not set"}
              </p>
            </div>

            <div className="rounded-lg border border-[#8B0000]/15 bg-[#faf7f4] p-4 text-sm text-gray-700">
              Commission is calculated automatically from the booking snapshot,
              so historical bookings keep their original commercial terms even
              if your settings change later.
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#001F3F]">
                Recent Commission Activity
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest bookings and commission values
              </p>
            </div>
          </div>

          {agent.bookings.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No bookings yet. Once bookings are created, your commission
              activity will appear here.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-205 text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Booking</th>
                    <th className="pb-3 font-medium">Tour</th>
                    <th className="pb-3 font-medium">Departure</th>
                    <th className="pb-3 font-medium">Pax</th>
                    <th className="pb-3 font-medium">Gross</th>
                    <th className="pb-3 font-medium">Commission</th>
                    <th className="pb-3 font-medium">Rate</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {agent.bookings.map((booking) => (
                    <tr key={booking.id} className="border-b align-top">
                      <td className="py-4">
                        <div className="font-medium text-[#001F3F]">
                          {booking.bookingReference}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(booking.createdAt)}
                        </div>
                      </td>

                      <td className="py-4">
                        <div className="font-medium">{booking.tourTitleSnapshot}</div>
                      </td>

                      <td className="py-4">
                        {formatDate(booking.departureDateSnapshot)}
                      </td>

                      <td className="py-4">{booking.numberOfGuests}</td>

                      <td className="py-4">
                        {formatCurrency(booking.grossAmount)}
                      </td>

                      <td className="py-4 font-medium text-green-700">
                        {formatCurrency(booking.commissionAmount)}
                      </td>

                      <td className="py-4">
                        {booking.commissionRateSnapshot !== null &&
                        booking.commissionRateSnapshot !== undefined
                          ? `${booking.commissionRateSnapshot}%`
                          : booking.payoutPerPaxSnapshot !== null &&
                              booking.payoutPerPaxSnapshot !== undefined
                            ? `${formatCurrency(booking.payoutPerPaxSnapshot)} / pax`
                            : "-"}
                      </td>

                      <td className="py-4">
                        <div className="font-medium">{booking.status}</div>
                        <div className="text-xs text-muted-foreground">
                          {booking.paymentStatus}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#001F3F]">
          Summary
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-muted-foreground">Confirmed Bookings</p>
            <p className="mt-1 text-2xl font-semibold text-[#001F3F]">
              {confirmedBookings.length}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-muted-foreground">Net Amount</p>
            <p className="mt-1 text-2xl font-semibold text-[#001F3F]">
              {formatCurrency(totalNetAmount)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-muted-foreground">Average Commission</p>
            <p className="mt-1 text-2xl font-semibold text-[#001F3F]">
              {confirmedBookings.length > 0
                ? formatCurrency(totalCommissionEarned / confirmedBookings.length)
                : formatCurrency(0)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}