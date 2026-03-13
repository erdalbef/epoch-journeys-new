import Link from "next/link";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { notFound, redirect } from "next/navigation";

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

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string };
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
      fullName: true,
      travelAgency: true,
    },
  });

  if (!user || user.role !== "AGENT" || !user.approved || user.status !== "ACTIVE") {
    redirect("/agent-login");
  }

  const { id } = params;

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
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#001F3F]">
              Booking Details
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Reference: {booking.bookingReference}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                  booking.status
                )}`}
              >
                {booking.status}
              </span>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentBadgeClass(
                  booking.paymentStatus
                )}`}
              >
                {booking.paymentStatus}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/api/b2b/bookings/${booking.id}/voucher`}
              className="rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              Download Voucher
            </Link>

            <Link
              href="/b2b/bookings"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Back to Bookings
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Booking Summary
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Tour</div>
              <div className="font-medium text-[#001F3F]">
                {booking.tourTitleSnapshot}
              </div>
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
              <div className="text-sm text-muted-foreground">Gross Amount</div>
              <div className="font-medium">
                {formatCurrency(booking.grossAmount)}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Net Amount</div>
              <div className="font-medium">
                {formatCurrency(booking.netAmount)}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">
                Commission Amount
              </div>
              <div className="font-medium text-green-700">
                {formatCurrency(booking.commissionAmount)}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Booked On</div>
              <div className="font-medium">{formatDate(booking.createdAt)}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Currency</div>
              <div className="font-medium">{booking.currency}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Agent Snapshot
          </h2>

          <div className="mt-6 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Agent Name</span>
              <span className="font-medium text-[#001F3F]">
                {booking.agentNameSnapshot || user.fullName || "-"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Agency</span>
              <span className="font-medium text-[#001F3F]">
                {booking.agencyNameSnapshot || user.travelAgency || "-"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Partner Type</span>
              <span className="font-medium text-[#001F3F]">
                {booking.partnerTypeSnapshot || "-"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Membership</span>
              <span className="font-medium text-[#001F3F]">
                {booking.membershipSnapshot || "-"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Customer / Lead Traveler
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
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
              <div className="text-sm text-muted-foreground">Lead First Name</div>
              <div className="font-medium">{booking.leadFirstName || "-"}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Lead Last Name</div>
              <div className="font-medium">{booking.leadLastName || "-"}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Lead Email</div>
              <div className="font-medium">{booking.leadEmail || "-"}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Lead Phone</div>
              <div className="font-medium">{booking.leadPhone || "-"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Rooming & Services
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Adults</div>
              <div className="font-medium">{booking.adults}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Children</div>
              <div className="font-medium">{booking.children}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Infants</div>
              <div className="font-medium">{booking.infants}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Single Rooms</div>
              <div className="font-medium">{booking.singleRooms}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Double Rooms</div>
              <div className="font-medium">{booking.doubleRooms}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Twin Rooms</div>
              <div className="font-medium">{booking.twinRooms}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Land Only</div>
              <div className="font-medium">
                {booking.landOnly ? "Yes" : "No"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Needs Flights</div>
              <div className="font-medium">
                {booking.needsFlights ? "Yes" : "No"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Booking Notes
          </h2>

          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
            {booking.notes || "No notes provided."}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Special Requests
          </h2>

          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
            {booking.specialRequests || "No special requests provided."}
          </div>
        </div>
      </section>
    </div>
  );
}