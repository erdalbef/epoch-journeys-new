import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  BookingStatus,
  BookingType,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = {
  q?: string;
  status?: string;
  paymentStatus?: string;
  bookingType?: string;
  page?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "To be confirmed";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(value: string) {
  const base = "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold";
  switch (value) {
    case "CONFIRMED":
    case "PAID":
      return `${base} bg-emerald-100 text-emerald-800`;
    case "PENDING":
    case "PARTIALLY_PAID":
      return `${base} bg-amber-100 text-amber-800`;
    case "ON_REQUEST":
    case "WAITLIST":
      return `${base} bg-blue-100 text-blue-800`;
    case "CANCELLED":
    case "REFUNDED":
      return `${base} bg-slate-200 text-slate-700`;
    case "UNPAID":
      return `${base} bg-red-100 text-red-800`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

function findEnum<T extends string>(
  values: readonly T[],
  input: string | undefined,
): T | undefined {
  return values.find((value) => value === input);
}

function buildUrl(filters: {
  q?: string;
  status?: string;
  paymentStatus?: string;
  bookingType?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentStatus) {
    params.set("paymentStatus", filters.paymentStatus);
  }
  if (filters.bookingType) params.set("bookingType", filters.bookingType);
  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }
  const query = params.toString();
  return query ? `/b2b/bookings?${query}` : "/b2b/bookings";
}

export default async function AgentBookingsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  // Recheck permissions in the database. A previously approved JWT alone
  // must not permit access if the agency has since been suspended/revoked.
  const agent = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, approved: true, status: true },
  });

  if (
    !agent ||
    agent.role !== "AGENT" ||
    !agent.approved ||
    agent.status !== "ACTIVE"
  ) {
    redirect("/agent-login");
  }

  const params = (await searchParams) ?? {};
  const q = (params.q ?? "").trim().slice(0, 100);
  const status = findEnum(Object.values(BookingStatus), params.status);
  const paymentStatus = findEnum(
    Object.values(PaymentStatus),
    params.paymentStatus,
  );
  const bookingType = findEnum(Object.values(BookingType), params.bookingType);

  // Crucial: ALL queries are scoped to the authenticated Agent's user ID.
  // Never allow the caller to supply a different userId in a query parameter.
  const where: Prisma.BookingWhereInput = {
    userId: agent.id,
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(bookingType ? { bookingType } : {}),
    ...(q
      ? {
          OR: [
            { bookingReference: { contains: q, mode: "insensitive" } },
            { bookingDisplayCode: { contains: q, mode: "insensitive" } },
            { tourTitleSnapshot: { contains: q, mode: "insensitive" } },
            { groupName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [totalCount, confirmedCount, paymentAttentionCount] = await Promise.all([
    db.booking.count({ where }),
    db.booking.count({ where: { AND: [where, { status: "CONFIRMED" }] } }),
    db.booking.count({
      where: {
        AND: [
          where,
          { paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] } },
        ],
      },
    }),
  ]);

  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  const bookings = await db.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      bookingReference: true,
      bookingDisplayCode: true,
      bookingType: true,
      tourTitleSnapshot: true,
      groupName: true,
      departureDateSnapshot: true,
      createdAt: true,
      numberOfGuests: true,
      totalPrice: true,
      amountPaid: true,
      amountDue: true,
      currency: true,
      status: true,
      paymentStatus: true,
    },
  });

  const activeFilters = {
    q,
    status,
    paymentStatus,
    bookingType,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Partner Workspace / Bookings</p>
          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            My Bookings
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Review your agency&apos;s tour bookings, passenger counts and
            payment status.
          </p>
        </div>
        <Link
          href="/b2b/tours"
          className="inline-flex justify-center rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Browse Tours
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Matching Bookings</p>
          <p className="mt-2 text-2xl font-bold text-[#001F3F]">{totalCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Confirmed</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {confirmedCount}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Unpaid / Partially Paid</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {paymentAttentionCount}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Find a Booking
          </h2>
        </div>
        <form
          action="/b2b/bookings"
          method="GET"
          className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5"
        >
          <div className="xl:col-span-2">
            <label
              htmlFor="booking-q"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Search
            </label>
            <input
              id="booking-q"
              name="q"
              defaultValue={q}
              placeholder="Booking ref, tour or group"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="booking-status"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Booking Status
            </label>
            <select
              id="booking-status"
              name="status"
              defaultValue={status ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {Object.values(BookingStatus).map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="booking-payment-status"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Payment Status
            </label>
            <select
              id="booking-payment-status"
              name="paymentStatus"
              defaultValue={paymentStatus ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {Object.values(PaymentStatus).map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="booking-type"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Booking Type
            </label>
            <select
              id="booking-type"
              name="bookingType"
              defaultValue={bookingType ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {Object.values(BookingType).map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
            <button
              type="submit"
              className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123b5e]"
            >
              Apply Filters
            </button>
            <Link
              href="/b2b/bookings"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">Booking List</h2>
          <span className="text-sm text-slate-500">
            {totalCount} booking{totalCount === 1 ? "" : "s"}
          </span>
        </div>

        {bookings.length === 0 ? (
          <div className="space-y-3 p-10 text-center">
            <p className="font-medium text-slate-700">No bookings found.</p>
            <p className="text-sm text-slate-500">
              Your agency has no bookings matching these filters.
            </p>
            <Link
              href="/b2b/tours"
              className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-[#001F3F] hover:bg-slate-50"
            >
              View Available Tours
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  <th className="px-4 py-3 font-semibold">Tour / Departure</th>
                  <th className="px-4 py-3 font-semibold">Passengers</th>
                  <th className="px-4 py-3 font-semibold">Amounts</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-t align-top">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#001F3F]">
                        {booking.bookingDisplayCode || booking.bookingReference}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {label(booking.bookingType)} · Created {formatDate(booking.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">
                        {booking.tourTitleSnapshot}
                      </p>
                      {booking.groupName && (
                        <p className="mt-1 text-xs text-slate-500">
                          Group: {booking.groupName}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Departure: {formatDate(booking.departureDateSnapshot)}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-800">
                      {booking.numberOfGuests}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">
                        Total: {formatMoney(booking.totalPrice, booking.currency)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Paid: {formatMoney(booking.amountPaid, booking.currency)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Due: {formatMoney(booking.amountDue, booking.currency)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-2">
                        <span className={statusStyle(booking.status)}>
                          {label(booking.status)}
                        </span>
                        <span className={statusStyle(booking.paymentStatus)}>
                          {label(booking.paymentStatus)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/b2b/bookings/${booking.id}`}
                        className="inline-flex whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 font-semibold text-[#001F3F] hover:bg-slate-50"
                      >
                        View Booking
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Link
            href={buildUrl({ ...activeFilters, page: page - 1 })}
            aria-disabled={page <= 1}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${
              page <= 1
                ? "pointer-events-none border-slate-200 text-slate-400"
                : "border-slate-300 text-[#001F3F] hover:bg-slate-50"
            }`}
          >
            Previous
          </Link>
          <p className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </p>
          <Link
            href={buildUrl({ ...activeFilters, page: page + 1 })}
            aria-disabled={page >= totalPages}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${
              page >= totalPages
                ? "pointer-events-none border-slate-200 text-slate-400"
                : "border-slate-300 text-[#001F3F] hover:bg-slate-50"
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
