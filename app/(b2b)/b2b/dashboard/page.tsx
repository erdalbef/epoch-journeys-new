import Link from "next/link";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default async function B2BDashboardPage() {
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
    where: { userId: user.id },
    select: {
      id: true,
      numberOfGuests: true,
      commissionAmount: true,
      status: true,
      departureDateSnapshot: true,
      tourTitleSnapshot: true,
      bookingReference: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  const allBookings = await db.booking.findMany({
    where: { userId: user.id },
    select: {
      numberOfGuests: true,
      commissionAmount: true,
      status: true,
      departureDateSnapshot: true,
    },
  });

  const publishedToursCount = await db.tour.count({
    where: {
      isPublished: true,
    },
  });

  const totalBookings = allBookings.length;

  const totalGuests = allBookings.reduce(
    (sum, booking) => sum + booking.numberOfGuests,
    0
  );

  const totalCommission = allBookings.reduce(
    (sum, booking) => sum + booking.commissionAmount,
    0
  );

  const pendingBookings = allBookings.filter(
    (b) => b.status === "PENDING"
  ).length;

  const confirmedBookings = allBookings.filter(
    (b) => b.status === "CONFIRMED"
  ).length;

  const upcomingDepartures = allBookings.filter(
    (b) => new Date(b.departureDateSnapshot) > new Date()
  ).length;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#001F3F]">
              Welcome, {user.fullName || "Partner"}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage your bookings, track commissions, and explore new tours.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Agency: {user.travelAgency || "Not provided"}
              </div>

              <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Status: Active
              </div>

              <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                Approved Partner
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/b2b/tours"
              className="rounded-xl bg-[#8B0000] px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              Browse Tours
            </Link>

            <Link
              href="/b2b/bookings"
              className="rounded-xl border px-5 py-3 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              View My Bookings
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Bookings
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {totalBookings}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Guests
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {totalGuests}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Commission
          </div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(totalCommission)}
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
            Confirmed
          </div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {confirmedBookings}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Upcoming Tours
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {upcomingDepartures}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Quick Actions
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link
              href="/b2b/tours"
              className="rounded-xl border p-4 transition hover:border-[#8B0000]"
            >
              <h3 className="font-semibold text-[#001F3F]">Browse Tours</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                View available tours, itineraries, and departures.
              </p>
            </Link>

            <Link
              href="/b2b/bookings"
              className="rounded-xl border p-4 transition hover:border-[#8B0000]"
            >
              <h3 className="font-semibold text-[#001F3F]">My Bookings</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Review your booking history and current requests.
              </p>
            </Link>

            <Link
              href="/b2b/commissions"
              className="rounded-xl border p-4 transition hover:border-[#8B0000]"
            >
              <h3 className="font-semibold text-[#001F3F]">Commissions</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Track your earnings and booking-related commission totals.
              </p>
            </Link>

            <Link
              href="/b2b/resources"
              className="rounded-xl border p-4 transition hover:border-[#8B0000]"
            >
              <h3 className="font-semibold text-[#001F3F]">
                Marketing Resources
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Download brochures and sales materials for your clients.
              </p>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Account Summary
          </h2>

          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Partner Name</span>
              <span className="font-medium text-[#001F3F]">
                {user.fullName || "-"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Travel Agency</span>
              <span className="font-medium text-[#001F3F]">
                {user.travelAgency || "-"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Published Tours</span>
              <span className="font-medium text-[#001F3F]">
                {publishedToursCount}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Account Status</span>
              <span className="font-medium text-green-700">Active</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Recent Bookings
          </h2>

          {bookings.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              You do not have any bookings yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Reference</th>
                    <th className="pb-3 pr-4 font-medium">Tour</th>
                    <th className="pb-3 pr-4 font-medium">Guests</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Departure</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium text-[#001F3F]">
                        {booking.bookingReference}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {booking.tourTitleSnapshot}
                      </td>
                      <td className="py-3 pr-4">{booking.numberOfGuests}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={
                            booking.status === "CONFIRMED"
                              ? "font-medium text-green-700"
                              : booking.status === "PENDING"
                              ? "font-medium text-amber-600"
                              : "font-medium text-[#001F3F]"
                          }
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(booking.departureDateSnapshot).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Next Steps
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl border bg-slate-50 p-4">
              Review available departures and new tour options.
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              Track pending bookings and follow up on confirmations.
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              Download brochures and resources for your clients.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}