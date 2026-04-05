import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type SearchParams =
  | Promise<{
      q?: string;
      status?: string;
      paymentStatus?: string;
      bookingType?: string;
    }>
  | {
      q?: string;
      status?: string;
      paymentStatus?: string;
      bookingType?: string;
    };

function formatCurrency(value: number | null | undefined, currency = "EUR") {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}

function getBookingStatusClasses(status: string | null | undefined) {
  const base = "inline-flex rounded-full border px-3 py-1 text-xs font-semibold";

  switch (status) {
    case "PENDING":
      return `${base} border-amber-200 bg-amber-100 text-amber-800`;
    case "CONFIRMED":
      return `${base} border-green-200 bg-green-100 text-green-800`;
    case "ON_REQUEST":
      return `${base} border-blue-200 bg-blue-100 text-blue-800`;
    case "CANCELLED":
      return `${base} border-red-200 bg-red-100 text-red-800`;
    case "WAITLIST":
      return `${base} border-purple-200 bg-purple-100 text-purple-800`;
    default:
      return `${base} border-gray-200 bg-gray-100 text-gray-800`;
  }
}

function getPaymentStatusClasses(status: string | null | undefined) {
  const base = "inline-flex rounded-full border px-3 py-1 text-xs font-semibold";

  switch (status) {
    case "UNPAID":
      return `${base} border-red-200 bg-red-100 text-red-800`;
    case "PARTIALLY_PAID":
      return `${base} border-amber-200 bg-amber-100 text-amber-800`;
    case "PAID":
      return `${base} border-green-200 bg-green-100 text-green-800`;
    case "REFUNDED":
      return `${base} border-slate-200 bg-slate-100 text-slate-800`;
    default:
      return `${base} border-gray-200 bg-gray-100 text-gray-800`;
  }
}

function buildUrl(params: {
  q?: string;
  status?: string;
  paymentStatus?: string;
  bookingType?: string;
}) {
  const search = new URLSearchParams();

  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.paymentStatus) search.set("paymentStatus", params.paymentStatus);
  if (params.bookingType) search.set("bookingType", params.bookingType);

  const query = search.toString();
  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const q = resolvedSearchParams.q?.trim() ?? "";
  const status = resolvedSearchParams.status?.trim() ?? "";
  const paymentStatus = resolvedSearchParams.paymentStatus?.trim() ?? "";
  const bookingType = resolvedSearchParams.bookingType?.trim() ?? "";

  const bookings = await db.booking.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
      ...(bookingType ? { bookingType: bookingType as never } : {}),
      ...(q
        ? {
            OR: [
              { bookingReference: { contains: q, mode: "insensitive" } },
              { bookingDisplayCode: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
              { customerEmail: { contains: q, mode: "insensitive" } },
              { agentNameSnapshot: { contains: q, mode: "insensitive" } },
              { agentEmailSnapshot: { contains: q, mode: "insensitive" } },
              { groupName: { contains: q, mode: "insensitive" } },
              { groupLeaderName: { contains: q, mode: "insensitive" } },
              {
                user: {
                  fullName: { contains: q, mode: "insensitive" },
                },
              },
              {
                tour: {
                  title: { contains: q, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          travelAgency: true,
          partnerType: true,
        },
      },
      tour: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
      departureDate: {
        select: {
          id: true,
          date: true,
          season: true,
          status: true,
        },
      },
      paymentSchedules: {
        select: {
          id: true,
          amount: true,
          amountPaid: true,
          status: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          allocationLockedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      payout: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
          currency: true,
        },
      },
      _count: {
        select: {
          passengers: true,
          paymentSubmissions: true,
        },
      },
    },
  });

  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce(
    (sum, booking) => sum + (booking.totalPrice ?? 0),
    0
  );
  const confirmedCount = bookings.filter(
    (booking) => booking.status === "CONFIRMED"
  ).length;
  const unpaidOrPartialCount = bookings.filter(
    (booking) =>
      booking.paymentStatus === "UNPAID" ||
      booking.paymentStatus === "PARTIALLY_PAID"
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-gray-500">Admin / Bookings</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Review operational, financial, and payment activity across all
            bookings.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/dashboard"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalBookings}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Confirmed</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {confirmedCount}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Needs Payment Attention</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {unpaidOrPartialCount}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Booking Value</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(totalRevenue, "EUR")}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        <div className="p-6">
          <form
            action="/admin/bookings"
            method="GET"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          >
            <div className="xl:col-span-2">
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Search
              </label>
              <input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Reference, customer, agent, group, tour..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Booking Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                <option value="">All</option>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="ON_REQUEST">ON_REQUEST</option>
                <option value="WAITLIST">WAITLIST</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="paymentStatus"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Payment Status
              </label>
              <select
                id="paymentStatus"
                name="paymentStatus"
                defaultValue={paymentStatus}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                <option value="">All</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                <option value="PAID">PAID</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="bookingType"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Booking Type
              </label>
              <select
                id="bookingType"
                name="bookingType"
                defaultValue={bookingType}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
              >
                <option value="">All</option>
                <option value="FIT">FIT</option>
                <option value="GROUP">GROUP</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>

            <div className="flex items-end gap-3 xl:col-span-5">
              <button
                type="submit"
                className="rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Apply Filters
              </button>

              <Link
                href="/admin/bookings"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Booking List</h2>
          <p className="text-sm text-gray-500">{bookings.length} result(s)</p>
        </div>

        {bookings.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No bookings found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Booking</th>
                  <th className="px-4 py-3 font-medium">Tour / Departure</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Passengers</th>
                  <th className="px-4 py-3 font-medium">Financials</th>
                  <th className="px-4 py-3 font-medium">Statuses</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => {
                  const latestPayment = booking.payments[0] ?? null;
                  const totalScheduled = booking.paymentSchedules.reduce(
                    (sum, item) => sum + item.amount,
                    0
                  );
                  const totalScheduledPaid = booking.paymentSchedules.reduce(
                    (sum, item) => sum + item.amountPaid,
                    0
                  );

                  return (
                    <tr key={booking.id} className="border-b last:border-0">
                      <td className="px-4 py-4 align-top">
                        <p className="font-semibold text-gray-900">
                          {booking.bookingReference}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {booking.bookingDisplayCode || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Created: {formatDate(booking.createdAt)}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">
                          {booking.tour?.title || booking.tourTitleSnapshot || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Departure:{" "}
                          {formatDate(
                            booking.departureDate?.date ||
                              booking.departureDateSnapshot
                          )}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatStatus(
                            booking.departureDate?.season || booking.seasonSnapshot
                          )}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">
                          {booking.user?.fullName || booking.agentNameSnapshot || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {booking.user?.travelAgency ||
                            booking.agencyNameSnapshot ||
                            "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {booking.user?.email || booking.agentEmailSnapshot || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">
                          {booking._count.passengers || booking.numberOfGuests || 0}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Submissions: {booking._count.paymentSubmissions}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-gray-900">
                          Total: {formatCurrency(booking.totalPrice, booking.currency)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Paid: {formatCurrency(booking.amountPaid, booking.currency)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Due: {formatCurrency(booking.amountDue, booking.currency)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Schedule:{" "}
                          {formatCurrency(totalScheduledPaid, booking.currency)} /{" "}
                          {formatCurrency(totalScheduled, booking.currency)}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <span className={getBookingStatusClasses(booking.status)}>
                            {formatStatus(booking.status)}
                          </span>

                          <span
                            className={getPaymentStatusClasses(booking.paymentStatus)}
                          >
                            {formatStatus(booking.paymentStatus)}
                          </span>

                          {booking.payout ? (
                            <span className="inline-flex rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                              Payout: {formatStatus(booking.payout.status)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        {latestPayment ? (
                          <>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(
                                latestPayment.amount,
                                latestPayment.currency
                              )}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatStatus(latestPayment.status)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {latestPayment.allocationLockedAt
                                ? "Allocation Locked"
                                : "Allocation Open"}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">No payment yet</p>
                        )}
                      </td>

                      <td className="px-4 py-4 align-top text-right">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          View Detail
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(q || status || paymentStatus || bookingType) && (
        <div className="flex flex-wrap gap-2">
          {q && (
            <Link
              href={buildUrl({ status, paymentStatus, bookingType })}
              className="rounded-full border bg-white px-3 py-1 text-xs text-gray-700"
            >
              Search: {q} ×
            </Link>
          )}

          {status && (
            <Link
              href={buildUrl({ q, paymentStatus, bookingType })}
              className="rounded-full border bg-white px-3 py-1 text-xs text-gray-700"
            >
              Status: {status} ×
            </Link>
          )}

          {paymentStatus && (
            <Link
              href={buildUrl({ q, status, bookingType })}
              className="rounded-full border bg-white px-3 py-1 text-xs text-gray-700"
            >
              Payment: {paymentStatus} ×
            </Link>
          )}

          {bookingType && (
            <Link
              href={buildUrl({ q, status, paymentStatus })}
              className="rounded-full border bg-white px-3 py-1 text-xs text-gray-700"
            >
              Type: {bookingType} ×
            </Link>
          )}
        </div>
      )}
    </div>
  );
}