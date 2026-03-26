import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import AddPaymentForm from "@/components/admin/bookings/AddPaymentForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysDiff(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getSmartPaymentLabel(
  paymentStatus: string,
  amountDue: number,
  paymentDueDate: Date | null
) {
  if (paymentStatus === "PAID") return "PAID";
  if (paymentStatus === "REFUNDED") return "REFUNDED";

  if (!paymentDueDate) {
    return paymentStatus === "PARTIALLY_PAID" ? "PARTIAL" : "PENDING";
  }

  const diff = daysDiff(new Date(), new Date(paymentDueDate));

  if (amountDue > 0 && diff < 0) return "OVERDUE";
  if (amountDue > 0 && diff <= 7) return "DUE SOON";
  if (paymentStatus === "PARTIALLY_PAID") return "PARTIAL";

  return "UNPAID";
}

function getSmartPaymentClass(label: string) {
  switch (label) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "OVERDUE":
      return "bg-red-100 text-red-700";
    case "DUE SOON":
      return "bg-amber-100 text-amber-700";
    case "PARTIAL":
      return "bg-blue-100 text-blue-700";
    case "REFUNDED":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getBookingStatusClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "ON_REQUEST":
      return "bg-blue-100 text-blue-700";
    case "WAITLIST":
      return "bg-purple-100 text-purple-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function AdminBookingDetailPage({
  params,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          fullName: true,
          travelAgency: true,
          email: true,
        },
      },
      passengers: {
        orderBy: [
          { isLeadPassenger: "desc" },
          { lastName: "asc" },
          { firstName: "asc" },
        ],
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!booking) {
    redirect("/admin/bookings");
  }

  const paymentLabel = getSmartPaymentLabel(
    booking.paymentStatus,
    booking.amountDue,
    booking.paymentDueDate
  );

  const clientName =
    booking.customerName ||
    `${booking.leadFirstName ?? ""} ${booking.leadLastName ?? ""}`.trim() ||
    "-";

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2">
              <Link
                href="/admin/bookings"
                className="text-sm font-medium text-[#8B0000] hover:underline"
              >
                ← Back to Bookings
              </Link>
            </div>

            <h1 className="text-2xl font-bold text-[#001F3F]">
              Booking #{booking.bookingNumber}
            </h1>

            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>
                Reference: {booking.bookingDisplayCode || booking.bookingReference}
              </p>
              <p>Created: {formatDate(booking.createdAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${getBookingStatusClass(
                booking.status
              )}`}
            >
              {booking.status}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${getSmartPaymentClass(
                paymentLabel
              )}`}
            >
              {paymentLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {formatCurrency(booking.totalPrice, booking.currency)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Paid</div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(booking.amountPaid, booking.currency)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Due</div>
          <div className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(booking.amountDue, booking.currency)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Payment Due Date</div>
          <div className="mt-2 text-lg font-semibold text-[#001F3F]">
            {formatDate(booking.paymentDueDate)}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Booking Information
            </h2>

            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="text-muted-foreground">Tour</div>
                <div className="font-medium">{booking.tourTitleSnapshot}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Departure Date</div>
                <div className="font-medium">
                  {formatDate(booking.departureDateSnapshot)}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Booking Type</div>
                <div className="font-medium">{booking.bookingType}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Guests</div>
                <div className="font-medium">{booking.numberOfGuests}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Season</div>
                <div className="font-medium">{booking.seasonSnapshot}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Price Per Person</div>
                <div className="font-medium">
                  {formatCurrency(
                    booking.pricePerPersonSnapshot,
                    booking.currency
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Client / Group
            </h2>

            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="text-muted-foreground">Customer / Lead</div>
                <div className="font-medium">{clientName}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Group Name</div>
                <div className="font-medium">{booking.groupName || "-"}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Customer Email</div>
                <div className="font-medium">{booking.customerEmail || "-"}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Customer Phone</div>
                <div className="font-medium">{booking.customerPhone || "-"}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Agency</div>
                <div className="font-medium">
                  {booking.agencyNameSnapshot || booking.user?.travelAgency || "-"}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Agent</div>
                <div className="font-medium">
                  {booking.agentNameSnapshot || booking.user?.fullName || "-"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Pricing
            </h2>

            <div className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <div className="text-muted-foreground">Gross</div>
                <div className="font-semibold text-[#001F3F]">
                  {formatCurrency(booking.grossAmount, booking.currency)}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Commission</div>
                <div className="font-semibold text-green-700">
                  {formatCurrency(booking.commissionAmount, booking.currency)}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Net</div>
                <div className="font-semibold">
                  {formatCurrency(booking.netAmount, booking.currency)}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Payment History
            </h2>

            {booking.payments.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No payment records yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-175 text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 pr-4 font-medium">Amount</th>
                      <th className="pb-3 pr-4 font-medium">Method</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.payments.map((payment) => (
                      <tr key={payment.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          {formatDate(payment.paidAt || payment.createdAt)}
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="py-3 pr-4">{payment.method}</td>
                        <td className="py-3 pr-4">{payment.status}</td>
                        <td className="py-3 pr-4">{payment.reference || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Notes
            </h2>

            <div className="space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground">Notes</div>
                <div className="font-medium">{booking.notes || "-"}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Special Requests</div>
                <div className="font-medium">{booking.specialRequests || "-"}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Internal Notes</div>
                <div className="font-medium">{booking.internalNotes || "-"}</div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <AddPaymentForm
            bookingId={booking.id}
            defaultCurrency={booking.currency}
            disabled={booking.paymentStatus === "PAID"}
          />

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Guest Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Adults</span>
                <span className="font-medium">{booking.adults}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Children</span>
                <span className="font-medium">{booking.children}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Infants</span>
                <span className="font-medium">{booking.infants}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Single Rooms</span>
                <span className="font-medium">{booking.singleRooms}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Double Rooms</span>
                <span className="font-medium">{booking.doubleRooms}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Twin Rooms</span>
                <span className="font-medium">{booking.twinRooms}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Triple Rooms</span>
                <span className="font-medium">{booking.tripleRooms}</span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Land Only</span>
                <span className="font-medium">
                  {booking.landOnly ? "Yes" : "No"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Needs Flights</span>
                <span className="font-medium">
                  {booking.needsFlights ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Passengers
            </h2>

            {booking.passengers.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No passenger records yet.
              </div>
            ) : (
              <div className="space-y-3">
                {booking.passengers.map((passenger) => (
                  <div
                    key={passenger.id}
                    className="rounded-xl border bg-slate-50 p-3 text-sm"
                  >
                    <div className="font-medium">
                      {passenger.firstName} {passenger.lastName}
                    </div>
                    <div className="text-muted-foreground">
                      Passport: {passenger.passportNumber || "-"}
                    </div>
                    <div className="text-muted-foreground">
                      Room Type: {passenger.roomType || "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}