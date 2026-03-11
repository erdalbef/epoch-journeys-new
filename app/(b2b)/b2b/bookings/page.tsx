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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#001F3F]">My Bookings</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your tour bookings.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Reference</th>
              <th className="p-3">Tour</th>
              <th className="p-3">Departure</th>
              <th className="p-3">Guests</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Booked</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  No bookings yet.
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
                <td className="p-3">{booking.status}</td>
                <td className="p-3">{booking.paymentStatus}</td>
                <td className="p-3">{formatDate(booking.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}