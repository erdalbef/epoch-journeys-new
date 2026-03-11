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
      numberOfGuests: true,
      commissionAmount: true,
      status: true,
      departureDateSnapshot: true,
    },
  });

  const totalBookings = bookings.length;

  const totalGuests = bookings.reduce(
    (sum, booking) => sum + booking.numberOfGuests,
    0
  );

  const totalCommission = bookings.reduce(
    (sum, booking) => sum + booking.commissionAmount,
    0
  );

  const pendingBookings = bookings.filter(
    (b) => b.status === "PENDING"
  ).length;

  const confirmedBookings = bookings.filter(
    (b) => b.status === "CONFIRMED"
  ).length;

  const upcomingDepartures = bookings.filter(
    (b) => new Date(b.departureDateSnapshot) > new Date()
  ).length;

  return (
    <div className="space-y-8">

      {/* Welcome Section */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-[#001F3F]">
          Welcome, {user.fullName || "Partner"}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Manage your bookings, track commissions, and explore new tours.
        </p>
      </section>

      {/* Dashboard Stats */}

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

      {/* Quick Actions */}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#001F3F]">
          Quick Actions
        </h2>

        <div className="mt-4 flex flex-wrap gap-3">

          <a
            href="/b2b/tours"
            className="rounded-lg bg-red-700 px-5 py-3 text-sm font-medium text-white hover:bg-red-800"
          >
            Browse Tours
          </a>

          <a
            href="/b2b/bookings"
            className="rounded-lg border px-5 py-3 text-sm font-medium hover:border-red-700 hover:text-red-700"
          >
            View My Bookings
          </a>

          <a
            href="/b2b/commissions"
            className="rounded-lg border px-5 py-3 text-sm font-medium hover:border-red-700 hover:text-red-700"
          >
            View Commissions
          </a>

          <a
            href="/b2b/resources"
            className="rounded-lg border px-5 py-3 text-sm font-medium hover:border-red-700 hover:text-red-700"
          >
            Marketing Resources
          </a>

        </div>
      </section>

    </div>
  );
}