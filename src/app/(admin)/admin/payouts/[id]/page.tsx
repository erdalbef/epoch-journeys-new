import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { MarkPayoutPaidButton } from "@/components/admin/MarkPayoutPaidButton";

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPartnerType(value: string | null) {
  if (!value) return "—";

  switch (value) {
    case "TOUR_OPERATOR":
      return "Tour Operator";
    case "TRAVEL_AGENCY":
      return "Travel Agency";
    case "TRAVEL_EXPERT":
      return "Travel Advisor / Expert";
    case "GROUP_LEADER":
      return "Group Leader";
    default:
      return value;
  }
}

function payoutBadge(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "APPROVED":
      return "bg-blue-100 text-blue-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function bookingStatusBadge(status: string) {
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
      return "bg-gray-100 text-gray-700";
  }
}

function paymentStatusBadge(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "PARTIALLY_PAID":
      return "bg-amber-100 text-amber-700";
    case "REFUNDED":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-red-100 text-red-700";
  }
}

export default async function AdminPayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const { id } = await params;

  const payout = await db.partnerPayout.findUnique({
    where: { id },
    include: {
      agent: {
        select: {
          id: true,
          fullName: true,
          email: true,
          travelAgency: true,
          phone: true,
          partnerType: true,
          membership: true,
          commissionRate: true,
          payoutPerPax: true,
        },
      },
      processedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      bookings: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          bookingReference: true,
          bookingDisplayCode: true,
          bookingType: true,
          status: true,
          paymentStatus: true,
          numberOfGuests: true,
          totalPrice: true,
          grossAmount: true,
          commissionAmount: true,
          netAmount: true,
          currency: true,
          createdAt: true,
          departureDateSnapshot: true,
          tourTitleSnapshot: true,
          customerName: true,
          customerEmail: true,
          groupName: true,
          groupLeaderName: true,
        },
      },
    },
  });

  if (!payout) {
    notFound();
  }

  const totalGuests = payout.bookings.reduce(
    (sum, booking) => sum + (booking.numberOfGuests ?? 0),
    0
  );

  const totalGross = payout.bookings.reduce(
    (sum, booking) => sum + (booking.grossAmount ?? 0),
    0
  );

  const totalNet = payout.bookings.reduce(
    (sum, booking) => sum + (booking.netAmount ?? 0),
    0
  );

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-[#001F3F]">Payout Detail</h1>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${payoutBadge(
                payout.status
              )}`}
            >
              {payout.status}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            Review payout batch, linked bookings, and settlement details.
          </p>

          <div className="text-sm text-muted-foreground">
            Payout ID: <span className="font-medium text-foreground">{payout.id}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/payouts"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Back to Payouts
          </Link>

          <Link
            href="/admin/finance"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Finance
          </Link>

          <MarkPayoutPaidButton payoutId={payout.id} status={payout.status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Payout Amount</div>
          <div className="mt-1 text-3xl font-semibold text-[#8B0000]">
            {formatCurrency(payout.totalAmount, payout.currency)}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Bookings</div>
          <div className="mt-1 text-3xl font-semibold">
            {payout.bookings.length}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Guests</div>
          <div className="mt-1 text-3xl font-semibold">{totalGuests}</div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Gross Sales</div>
          <div className="mt-1 text-3xl font-semibold">
            {formatCurrency(totalGross, payout.currency)}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Net Revenue</div>
          <div className="mt-1 text-3xl font-semibold">
            {formatCurrency(totalNet, payout.currency)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-lg border bg-white xl:col-span-1">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Partner Information
            </h2>
          </div>

          <div className="space-y-4 px-4 py-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Name
              </div>
              <div className="mt-1 font-medium">
                {payout.agent.fullName || "—"}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Email
              </div>
              <div className="mt-1">{payout.agent.email}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Travel Agency
              </div>
              <div className="mt-1">{payout.agent.travelAgency || "—"}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Partner Type
              </div>
              <div className="mt-1">
                {formatPartnerType(payout.agent.partnerType)}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Phone
              </div>
              <div className="mt-1">{payout.agent.phone || "—"}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Membership
              </div>
              <div className="mt-1">{payout.agent.membership || "—"}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-gray-50 p-3">
                <div className="text-xs text-muted-foreground">
                  Default Commission %
                </div>
                <div className="mt-1 font-semibold">
                  {payout.agent.commissionRate ?? "—"}
                </div>
              </div>

              <div className="rounded-md bg-gray-50 p-3">
                <div className="text-xs text-muted-foreground">
                  Default Payout / Pax
                </div>
                <div className="mt-1 font-semibold">
                  {payout.agent.payoutPerPax !== null &&
                  payout.agent.payoutPerPax !== undefined
                    ? formatCurrency(payout.agent.payoutPerPax, payout.currency)
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-white xl:col-span-1">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Payout Information
            </h2>
          </div>

          <div className="space-y-4 px-4 py-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </div>
              <div className="mt-1">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${payoutBadge(
                    payout.status
                  )}`}
                >
                  {payout.status}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Currency
              </div>
              <div className="mt-1">{payout.currency}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Payment Method
              </div>
              <div className="mt-1">{payout.paymentMethod || "—"}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Payment Reference
              </div>
              <div className="mt-1">{payout.paymentReference || "—"}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Notes
              </div>
              <div className="mt-1 whitespace-pre-wrap">
                {payout.notes || "—"}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-gray-50 p-3">
                <div className="text-xs text-muted-foreground">Period Start</div>
                <div className="mt-1 font-medium">
                  {formatDate(payout.periodStart)}
                </div>
              </div>

              <div className="rounded-md bg-gray-50 p-3">
                <div className="text-xs text-muted-foreground">Period End</div>
                <div className="mt-1 font-medium">
                  {formatDate(payout.periodEnd)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-white xl:col-span-1">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Audit Timeline
            </h2>
          </div>

          <div className="space-y-4 px-4 py-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Created At
              </div>
              <div className="mt-1">{formatDateTime(payout.createdAt)}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Approved At
              </div>
              <div className="mt-1">{formatDateTime(payout.approvedAt)}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Paid At
              </div>
              <div className="mt-1">{formatDateTime(payout.paidAt)}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Locked At
              </div>
              <div className="mt-1">{formatDateTime(payout.lockedAt)}</div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Processed By
              </div>
              <div className="mt-1">
                {payout.processedBy
                  ? payout.processedBy.fullName || payout.processedBy.email
                  : "—"}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Updated At
              </div>
              <div className="mt-1">{formatDateTime(payout.updatedAt)}</div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border bg-white">
        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Included Bookings
            </h2>
            <p className="text-sm text-muted-foreground">
              All bookings currently locked into this payout batch.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            {payout.bookings.length} bookings •{" "}
            {formatCurrency(payout.totalAmount, payout.currency)}
          </div>
        </div>

        {payout.bookings.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No bookings linked to this payout.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Booking</th>
                  <th className="p-3 text-left">Tour</th>
                  <th className="p-3 text-left">Departure</th>
                  <th className="p-3 text-left">Customer / Group</th>
                  <th className="p-3 text-left">Guests</th>
                  <th className="p-3 text-left">Booking Status</th>
                  <th className="p-3 text-left">Payment</th>
                  <th className="p-3 text-left">Gross</th>
                  <th className="p-3 text-left">Payout</th>
                  <th className="p-3 text-left">Net</th>
                  <th className="p-3 text-left">Created</th>
                </tr>
              </thead>

              <tbody>
                {payout.bookings.map((booking) => (
                  <tr key={booking.id} className="border-t">
                    <td className="p-3">
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="font-medium text-[#001F3F] hover:text-[#8B0000]"
                      >
                        {booking.bookingDisplayCode || booking.bookingReference}
                      </Link>
                    </td>

                    <td className="p-3">{booking.tourTitleSnapshot}</td>

                    <td className="p-3">
                      {formatDate(booking.departureDateSnapshot)}
                    </td>

                    <td className="p-3">
                      <div className="font-medium">
                        {booking.customerName ||
                          booking.groupName ||
                          booking.groupLeaderName ||
                          "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {booking.customerEmail || "—"}
                      </div>
                    </td>

                    <td className="p-3">{booking.numberOfGuests}</td>

                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${bookingStatusBadge(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusBadge(
                          booking.paymentStatus
                        )}`}
                      >
                        {booking.paymentStatus}
                      </span>
                    </td>

                    <td className="p-3">
                      {formatCurrency(booking.grossAmount, booking.currency)}
                    </td>

                    <td className="p-3 font-semibold text-[#8B0000]">
                      {formatCurrency(booking.commissionAmount, booking.currency)}
                    </td>

                    <td className="p-3">
                      {formatCurrency(booking.netAmount, booking.currency)}
                    </td>

                    <td className="p-3">{formatDateTime(booking.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}