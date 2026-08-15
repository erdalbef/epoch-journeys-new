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

function formatDate(value: string | Date | null) {
  if (!value) {
    return "Date TBC";
  }

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
      partnerType: true,
    },
  });

  if (
    !user ||
    user.role !== "AGENT" ||
    !user.approved ||
    user.status !== "ACTIVE"
  ) {
    redirect("/agent-login");
  }

  const isGroupLeader =
    user.partnerType === "GROUP_LEADER";

  const earningsLabel =
    isGroupLeader ? "Payout" : "Commission";

  const allBookings =
    await db.booking.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const bookings = allBookings.slice(0, 5);

  const groupBookings =
    allBookings.filter(
      (booking) =>
        booking.bookingType === "GROUP"
    );

  const totalGroups =
    groupBookings.length;

  const totalPilgrims =
    groupBookings.reduce(
      (sum, booking) =>
        sum + booking.numberOfGuests,
      0
    );

  const outstandingBalance =
    groupBookings.reduce(
      (sum, booking) =>
        sum + (booking.amountDue || 0),
      0
    );

  const now = new Date();

  const upcomingGroups =
    groupBookings.filter((booking) => {
      if (!booking.departureDateSnapshot) {
        return false;
      }

      return (
        booking.departureDateSnapshot >
        now
      );
    }).length;

  const totalBookings =
    allBookings.length;

  const totalGuests =
    allBookings.reduce(
      (sum, booking) =>
        sum + booking.numberOfGuests,
      0
    );

  const totalRevenue =
    allBookings.reduce(
      (sum, booking) =>
        sum + booking.totalPrice,
      0
    );

  const totalEarnings =
    allBookings.reduce(
      (sum, booking) =>
        sum + booking.commissionAmount,
      0
    );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-[#001F3F]">
          Welcome,{" "}
          {user.fullName || "Partner"}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {isGroupLeader
            ? "Manage your pilgrimage groups, travelers, and payments."
            : "Manage bookings, track commissions, and grow your sales."}
        </p>
      </section>

      {isGroupLeader ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            label="My Groups"
            value={totalGroups}
          />

          <Card
            label="Total Pilgrims"
            value={totalPilgrims}
          />

          <Card
            label="Upcoming Groups"
            value={upcomingGroups}
          />

          <Card
            label="Outstanding Balance"
            value={formatCurrency(
              outstandingBalance
            )}
          />
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            label="Bookings"
            value={totalBookings}
          />

          <Card
            label="Guests"
            value={totalGuests}
          />

          <Card
            label="Revenue"
            value={formatCurrency(
              totalRevenue
            )}
          />

          <Card
            label={earningsLabel}
            value={formatCurrency(
              totalEarnings
            )}
          />
        </section>
      )}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#001F3F]">
          Quick Actions
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {isGroupLeader ? (
            <>
              <Action
                href="/b2b/groups"
                title="My Groups"
              />

              <Action
                href="/b2b/groups/new"
                title="Create New Group"
              />

              <Action
                href="/b2b/custom-requests"
                title="Add Pilgrims"
              />

              <Action
                href="/b2b/resources"
                title="Travel Documents"
              />

              <Action
                href="/b2b/support"
                title="Support Requests"
              />
            </>
          ) : (
            <>
              <Action
                href="/b2b/tours"
                title="Browse Tours"
              />

              <Action
                href="/b2b/bookings"
                title="My Bookings"
              />

              <Action
                href="/b2b/commissions"
                title="Commissions"
              />

              <Action
                href="/b2b/tours"
                title="New FIT Booking"
              />

              <Action
                href="/b2b/custom-requests"
                title="New Group Booking"
              />
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#001F3F]">
          {isGroupLeader
            ? "My Groups"
            : "Recent Bookings"}
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">
                  Reference
                </th>

                <th className="pb-2">
                  Tour
                </th>

                <th className="pb-2">
                  Guests
                </th>

                <th className="pb-2">
                  Status
                </th>

                <th className="pb-2">
                  Departure
                </th>
              </tr>
            </thead>

            <tbody>
              {(isGroupLeader
                ? groupBookings
                : bookings
              ).map((booking) => (
                <tr
                  key={booking.id}
                  className="border-b"
                >
                  <td className="py-2">
                    <Link
                      href={`/b2b/bookings/${booking.id}`}
                    >
                      {
                        booking.bookingReference
                      }
                    </Link>
                  </td>

                  <td>
                    {
                      booking.tourTitleSnapshot
                    }
                  </td>

                  <td>
                    {
                      booking.numberOfGuests
                    }
                  </td>

                  <td>
                    {booking.status}
                  </td>

                  <td>
                    {formatDate(
                      booking.departureDateSnapshot
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold text-[#001F3F]">
        {value}
      </div>
    </div>
  );
}

function Action({
  href,
  title,
}: {
  href: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border p-4 hover:border-[#8B0000]"
    >
      <div className="font-semibold text-[#001F3F]">
        {title}
      </div>
    </Link>
  );
}