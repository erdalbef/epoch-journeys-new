import { db } from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { notFound } from "next/navigation";
import { buildBookingAlerts } from "@/lib/alerts/bookingAlerts";

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("en-GB", {
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

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const pendingAgentsCount = await db.user.count({
    where: { role: "AGENT", approved: false },
  });

  const approvedAgentsCount = await db.user.count({
    where: { role: "AGENT", approved: true },
  });

  const pendingPaymentSubmissionsCount = await db.paymentSubmission.count({
    where: { status: "PENDING" },
  });

  const approvedPaymentSubmissionsCount = await db.paymentSubmission.count({
    where: { status: "APPROVED" },
  });

  const bookings = await db.booking.findMany({
    select: {
      id: true,
      bookingReference: true,
      bookingDisplayCode: true,
      tourTitleSnapshot: true,
      paymentStatus: true,
      status: true,
      amountDue: true,
      paymentDueDate: true,
      departureDateSnapshot: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const alerts = buildBookingAlerts(bookings);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview, alerts, and operational insights
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/finance"
            className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Finance
          </Link>

          <Link
            href="/admin/payments"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Payments
          </Link>

          <Link
            href="/admin/bookings/calendar"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Calendar
          </Link>
        </div>
      </div>

      {/* QUICK ACCESS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/finance"
          className="rounded-lg border bg-white p-5 transition hover:border-[#8B0000] hover:shadow-sm"
        >
          <div className="text-sm text-muted-foreground">Finance Overview</div>
          <div className="mt-1 text-xl font-semibold text-[#001F3F]">
            View sales, payments, and charts
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Open the full finance dashboard with filters and reporting.
          </p>
        </Link>

        <Link
          href="/admin/payments"
          className="rounded-lg border bg-white p-5 transition hover:border-[#8B0000] hover:shadow-sm"
        >
          <div className="text-sm text-muted-foreground">Payment Submissions</div>
          <div className="mt-1 text-xl font-semibold text-[#001F3F]">
            Review uploaded proofs
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Approve or reject agent payment submissions and open receipt PDFs.
          </p>
        </Link>

        <Link
          href="/admin/bookings/calendar"
          className="rounded-lg border bg-white p-5 transition hover:border-[#8B0000] hover:shadow-sm"
        >
          <div className="text-sm text-muted-foreground">Bookings Calendar</div>
          <div className="mt-1 text-xl font-semibold text-[#001F3F]">
            See future departures
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Open the month view calendar for future bookings and departure dates.
          </p>
        </Link>
      </div>

      {/* TOP CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Pending Agents</div>
          <div className="mt-1 text-3xl font-semibold">
            {pendingAgentsCount}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Approved Agents</div>
          <div className="mt-1 text-3xl font-semibold">
            {approvedAgentsCount}
          </div>
        </div>

        <Link
          href="/admin/payments?status=PENDING"
          className="rounded-lg border bg-white p-4 transition hover:border-[#8B0000] hover:shadow-sm"
        >
          <div className="text-sm text-muted-foreground">
            Pending Payment Submissions
          </div>
          <div className="mt-1 text-3xl font-semibold text-amber-700">
            {pendingPaymentSubmissionsCount}
          </div>
        </Link>

        <Link
          href="/admin/payments?status=APPROVED"
          className="rounded-lg border bg-white p-4 transition hover:border-[#8B0000] hover:shadow-sm"
        >
          <div className="text-sm text-muted-foreground">
            Approved Submissions
          </div>
          <div className="mt-1 text-3xl font-semibold text-green-700">
            {approvedPaymentSubmissionsCount}
          </div>
        </Link>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">
            🔴 Overdue Payments
          </div>
          <div className="mt-1 text-3xl font-semibold text-red-700">
            {alerts.overduePayments.length}
          </div>
        </div>

        <Link
          href="/admin/bookings/calendar"
          className="rounded-lg border bg-white p-4 transition hover:border-[#8B0000] hover:shadow-sm"
        >
          <div className="text-sm text-muted-foreground">
            ⚠️ Departures (7 Days)
          </div>
          <div className="mt-1 text-3xl font-semibold text-amber-700">
            {alerts.upcomingDepartures.length}
          </div>
        </Link>
      </div>

      {/* ALERT SECTIONS */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-red-700">
              🔴 Overdue Payments
            </h2>
            <div className="flex gap-3">
              <Link href="/admin/finance" className="text-sm underline">
                Finance
              </Link>
              <Link href="/admin/bookings" className="text-sm underline">
                Bookings
              </Link>
            </div>
          </div>

          {alerts.overduePayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No overdue payments.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.overduePayments.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-md border border-red-200 bg-red-50 p-3"
                >
                  <p className="font-medium">
                    {booking.bookingDisplayCode || booking.bookingReference}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {booking.tourTitleSnapshot}
                  </p>

                  <p className="text-sm font-medium text-red-700">
                    Due: {formatCurrency(booking.amountDue)}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Due date:{" "}
                    {booking.paymentDueDate
                      ? formatDate(booking.paymentDueDate)
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-amber-700">
              ⚠️ Upcoming Departures
            </h2>
            <div className="flex gap-3">
              <Link
                href="/admin/bookings/calendar"
                className="text-sm underline"
              >
                Calendar
              </Link>
              <Link href="/admin/bookings" className="text-sm underline">
                Bookings
              </Link>
            </div>
          </div>

          {alerts.upcomingDepartures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No departures in next 7 days.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.upcomingDepartures.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-md border border-amber-200 bg-amber-50 p-3"
                >
                  <p className="font-medium">
                    {booking.bookingDisplayCode || booking.bookingReference}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {booking.tourTitleSnapshot}
                  </p>

                  <p className="text-sm font-medium text-amber-700">
                    Departure: {formatDate(booking.departureDateSnapshot)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* SECOND ROW */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">
            🟡 Payments Due Soon
          </div>
          <div className="mt-1 text-3xl font-semibold text-amber-600">
            {alerts.dueSoonPayments.length}
          </div>

          {alerts.dueSoonPayments.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Upcoming payments within 7 days
            </p>
          )}

          <Link
            href="/admin/finance"
            className="mt-3 inline-block text-sm underline"
          >
            Review
          </Link>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">
            💰 Unpaid / Partial
          </div>
          <div className="mt-1 text-3xl font-semibold">
            {alerts.unpaidBookings.length}
          </div>

          <Link
            href="/admin/finance"
            className="mt-3 inline-block text-sm underline"
          >
            Review payments
          </Link>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">
            📄 Payment Proof Review
          </div>
          <div className="mt-1 text-3xl font-semibold text-[#001F3F]">
            {pendingPaymentSubmissionsCount}
          </div>

          <Link
            href="/admin/payments"
            className="mt-3 inline-block text-sm underline"
          >
            Open payments page
          </Link>
        </div>
      </div>
    </div>
  );
}