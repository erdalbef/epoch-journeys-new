import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

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

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;

  const booking = await db.booking.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!booking) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#001F3F]">
            Booking Details
          </h1>
          <p className="text-sm text-muted-foreground">
            Reference: {booking.bookingReference}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/api/b2b/bookings/${booking.id}/voucher`}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
          >
            Download Voucher
          </Link>

          <Link
            href="/b2b/bookings"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
          >
            Back to Bookings
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm text-muted-foreground">Tour</div>
            <div className="font-medium">{booking.tourTitleSnapshot}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Departure</div>
            <div className="font-medium">
              {formatDate(booking.departureDateSnapshot)}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Guests</div>
            <div className="font-medium">{booking.numberOfGuests}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Amount</div>
            <div className="font-medium">
              {formatCurrency(booking.grossAmount)}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="font-medium">{booking.status}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Payment Status</div>
            <div className="font-medium">{booking.paymentStatus}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Customer Name</div>
            <div className="font-medium">{booking.customerName || "-"}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Customer Email</div>
            <div className="font-medium">{booking.customerEmail || "-"}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Customer Phone</div>
            <div className="font-medium">{booking.customerPhone || "-"}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Booked On</div>
            <div className="font-medium">{formatDate(booking.createdAt)}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm text-muted-foreground">Notes</div>
          <div className="mt-1 rounded-lg bg-gray-50 p-4 text-sm">
            {booking.notes || "No notes provided."}
          </div>
        </div>
      </div>
    </div>
  );
}