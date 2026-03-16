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

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
      bookingReference: true,
      bookingType: true,
      numberOfGuests: true,
      commissionAmount: true,
      status: true,
      departureDateSnapshot: true,
      tourTitleSnapshot: true,
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
      id: true,
      bookingType: true,
      numberOfGuests: true,
      commissionAmount: true,
      status: true,
      departureDateSnapshot: true,
      paymentStatus: true,
    },
  });

  const publishedToursCount = await db.tour.count({
    where: {
      isPublished: true,
    },
  });

  const totalBookings = allBookings.length;

  const totalGuests = allBookings.reduce((sum, booking) => {
    return sum + booking.numberOfGuests;
  }, 0);

  const totalCommission = allBookings.reduce((sum, booking) => {
    return sum + booking.commissionAmount;
  }, 0);

  const pendingBookings = allBookings.filter((b) => b.status === "PENDING").length;

  const confirmedBookings = allBookings.filter(
    (b) => b.status === "CONFIRMED"
  ).length;

  const fitBookingsCount = allBookings.filter((b) => b.bookingType === "FIT").length;

  const groupBookingsCount = allBookings.filter(
    (b) => b.bookingType === "GROUP"
  ).length;

  const unpaidBookingsCount = allBookings.filter(
    (b) => b.paymentStatus === "UNPAID"
  ).length;

  const upcomingDepartures = allBookings.filter((b) => {
    return new Date(b.departureDateSnapshot) > new Date();
  }).length;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#001F3F]">
              Welcome, {user.fullName || "Partner"}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage FIT and group bookings, track commissions, and monitor tour activity for Epoch Journeys OOD.
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

            <Link
              href="/b2b/bookings?type=FIT"
              className="rounded-xl border px-5 py-3 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              FIT Bookings
            </Link>

            <Link
              href="/b2b/bookings?type=GROUP"
              className="rounded-xl border px-5 py-3 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Group Bookings
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            FIT Bookings
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {fitBookingsCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Group Bookings
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {groupBookingsCount}
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
            Unpaid
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {unpaidBookingsCount}
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

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Published Tours
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {publishedToursCount}
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
                View available tours, itineraries, departure options, and brochure materials.
              </p>
            </Link>

            <Link
              href="/b2b/bookings"
              className="rounded-xl border p-4 transition hover:border-[#8B0000]"
            >
              <h3 className="font-semibold text-[#001F3F]">My Bookings</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Review your booking history, pending files, and confirmed reservations.
              </p>
            </Link>

            <Link
              href="/b2b/bookings/new-fit"
              className="rounded-xl border p-4 transition hover:border-[#8B0000]"
            >
              <h3 className="font-semibold text-[#001F3F]">New FIT Booking</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a private-basis booking for independent travelers.
              </p>
            </Link>

            <Link
              href="/b2b/bookings/new-group"
              className="rounded-xl border p-4 transition hover:border-[#8B0000]"
            >
              <h3 className="font-semibold text-[#001F3F]">New Group Booking</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage group reservations with estimated or final passenger counts.
              </p>
            </Link>

            <Link
              href="/b2b/custom-requests"
              className="rounded-xl border p-4 transition hover:border-[#8B0000]"
            >
              <h3 className="font-semibold text-[#001F3F]">Tailor-Made Tours</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Submit bespoke requests for special-interest groups or custom programs.
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
                Download brochures, tour materials, and sales support documents.
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
              <span className="text-muted-foreground">FIT Bookings</span>
              <span className="font-medium text-[#001F3F]">
                {fitBookingsCount}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Group Bookings</span>
              <span className="font-medium text-[#001F3F]">
                {groupBookingsCount}
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
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Recent Bookings
            </h2>

            <Link
              href="/b2b/bookings"
              className="text-sm font-medium text-[#8B0000] hover:underline"
            >
              View all
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              You do not have any bookings yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Reference</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
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
                        <Link
                          href={`/b2b/bookings/${booking.id}`}
                          className="hover:text-[#8B0000]"
                        >
                          {booking.bookingReference}
                        </Link>
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        {booking.bookingType}
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
                        {formatDate(booking.departureDateSnapshot)}
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
              Review open departures and match them to your FIT and group clients.
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              Follow up on pending and unpaid bookings requiring confirmation.
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              Use tailor-made requests for programs that do not fit published departures.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}