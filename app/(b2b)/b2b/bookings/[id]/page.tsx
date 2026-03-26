import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
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
    default:
      return "bg-gray-100 text-gray-700";
  }
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

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: true,
      passengers: true,
    },
  });

  if (!booking || booking.userId !== session.user.id) {
    redirect("/b2b/bookings");
  }

  const paymentLabel = getSmartPaymentLabel(
    booking.paymentStatus,
    booking.amountDue,
    booking.paymentDueDate
  );

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#001F3F]">
          Booking {booking.bookingReference}
        </h1>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">
            Created: {formatDate(booking.createdAt)}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${getSmartPaymentClass(
              paymentLabel
            )}`}
          >
            {paymentLabel}
          </span>
        </div>

        <div className="mt-4 flex gap-3">
          <Link
            href={`/api/b2b/bookings/${booking.id}/voucher`}
            className="rounded-xl bg-[#8B0000] px-4 py-2 text-white"
          >
            Download Voucher
          </Link>

          <Link
            href="/b2b/bookings"
            className="rounded-xl border px-4 py-2"
          >
            Back
          </Link>
        </div>
      </section>

      {/* PAYMENT SUMMARY */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Payment Summary
        </h2>

        <div className="grid gap-4 md:grid-cols-4 text-sm">
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-semibold">
              {formatCurrency(booking.totalPrice)}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Paid</div>
            <div className="font-semibold text-green-700">
              {formatCurrency(booking.amountPaid)}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Due</div>
            <div className="font-semibold text-red-700">
              {formatCurrency(booking.amountDue)}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground">Due Date</div>
            <div className="font-semibold">
              {formatDate(booking.paymentDueDate)}
            </div>
          </div>
        </div>
      </section>

      {/* TOUR */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Tour</h2>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Tour</div>
            <div className="font-medium">{booking.tourTitleSnapshot}</div>
          </div>

          <div>
            <div className="text-muted-foreground">Departure</div>
            <div className="font-medium">
              {formatDate(booking.departureDateSnapshot)}
            </div>
          </div>
        </div>
      </section>

      {/* GUESTS */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Guests</h2>

        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>Adults: {booking.adults}</div>
          <div>Children: {booking.children}</div>
          <div>Infants: {booking.infants}</div>
        </div>
      </section>

      {/* NOTES */}
      {(booking.notes || booking.specialRequests) && (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Notes</h2>
          <p>{booking.notes}</p>
          <p>{booking.specialRequests}</p>
        </section>
      )}
    </div>
  );
}