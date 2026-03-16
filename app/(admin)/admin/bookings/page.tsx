import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type SearchParams = {
  q?: string;
  status?: string;
  payment?: string;
  type?: string;
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildUrl(params: {
  q?: string;
  status?: string;
  payment?: string;
  type?: string;
}) {
  const search = new URLSearchParams();

  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.payment) search.set("payment", params.payment);
  if (params.type) search.set("type", params.type);

  const query = search.toString();

  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm font-medium transition ${
        active
          ? "bg-[#8B0000] text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}

function getBookingStatusClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "font-medium text-green-700";
    case "PENDING":
      return "font-medium text-amber-600";
    case "CANCELLED":
      return "font-medium text-red-700";
    default:
      return "font-medium text-[#001F3F]";
  }
}

function getPaymentStatusClass(status: string) {
  switch (status) {
    case "PAID":
      return "font-medium text-green-700";
    case "PARTIALLY_PAID":
      return "font-medium text-amber-600";
    case "REFUNDED":
      return "font-medium text-slate-500";
    default:
      return "font-medium text-red-700";
  }
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const resolvedSearchParams = (await searchParams) ?? {};

  const query = resolvedSearchParams.q?.trim() ?? "";

  const selectedStatus =
    resolvedSearchParams.status === "PENDING" ||
    resolvedSearchParams.status === "CONFIRMED" ||
    resolvedSearchParams.status === "ON_REQUEST" ||
    resolvedSearchParams.status === "WAITLIST" ||
    resolvedSearchParams.status === "CANCELLED"
      ? resolvedSearchParams.status
      : "";

  const selectedPayment =
    resolvedSearchParams.payment === "UNPAID" ||
    resolvedSearchParams.payment === "PARTIALLY_PAID" ||
    resolvedSearchParams.payment === "PAID" ||
    resolvedSearchParams.payment === "REFUNDED"
      ? resolvedSearchParams.payment
      : "";

  const selectedType =
    resolvedSearchParams.type === "FIT" || resolvedSearchParams.type === "GROUP"
      ? resolvedSearchParams.type
      : "";

  const bookings = await db.booking.findMany({
    where: {
      ...(selectedStatus ? { status: selectedStatus } : {}),
      ...(selectedPayment ? { paymentStatus: selectedPayment } : {}),
      ...(selectedType ? { bookingType: selectedType } : {}),
      ...(query
        ? {
            OR: [
              {
                bookingReference: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                bookingDisplayCode: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                tourTitleSnapshot: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                agencyNameSnapshot: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                customerName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                groupName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                agentNameSnapshot: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
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
      commissionAmount: true,
      currency: true,
      departureDateSnapshot: true,
      seasonSnapshot: true,
      tourTitleSnapshot: true,
      agencyNameSnapshot: true,
      agentNameSnapshot: true,
      customerName: true,
      groupName: true,
      createdAt: true,
    },
  });

  const totalBookings = bookings.length;
  const totalGuests = bookings.reduce((sum, booking) => sum + booking.numberOfGuests, 0);
  const totalSales = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
  const totalCommission = bookings.reduce(
    (sum, booking) => sum + booking.commissionAmount,
    0
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#001F3F]">All Bookings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Monitor all FIT and group bookings across agents, tours, and departures.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Bookings</div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">{totalBookings}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Guests</div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">{totalGuests}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Sales</div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {formatCurrency(totalSales)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Commission</div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(totalCommission)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">Filters</h2>
          </div>

          <form className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-4">
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search
              </label>
              <input
                id="q"
                name="q"
                defaultValue={query}
                placeholder="Search by display reference, official reference, tour, agency, customer, group, or agent"
                className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Booking Type
              </label>
              <select
                id="type"
                name="type"
                defaultValue={selectedType}
                className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
              >
                <option value="">All</option>
                <option value="FIT">FIT</option>
                <option value="GROUP">GROUP</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Booking Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={selectedStatus}
                className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
              >
                <option value="">All</option>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="ON_REQUEST">ON REQUEST</option>
                <option value="WAITLIST">WAITLIST</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="payment"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Payment Status
              </label>
              <select
                id="payment"
                name="payment"
                defaultValue={selectedPayment}
                className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
              >
                <option value="">All</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                <option value="PAID">PAID</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="w-full rounded-xl bg-[#001F3F] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Apply Filters
              </button>

              <Link
                href="/admin/bookings"
                className="w-full rounded-xl border px-4 py-2 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
              >
                Reset
              </Link>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            <FilterLink
              href={buildUrl({
                q: query,
                status: selectedStatus,
                payment: selectedPayment,
                type: "",
              })}
              label="All Types"
              active={!selectedType}
            />
            <FilterLink
              href={buildUrl({
                q: query,
                status: selectedStatus,
                payment: selectedPayment,
                type: "FIT",
              })}
              label="FIT"
              active={selectedType === "FIT"}
            />
            <FilterLink
              href={buildUrl({
                q: query,
                status: selectedStatus,
                payment: selectedPayment,
                type: "GROUP",
              })}
              label="GROUP"
              active={selectedType === "GROUP"}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#001F3F]">Booking Results</h2>
          <div className="text-sm text-muted-foreground">
            {bookings.length} result{bookings.length === 1 ? "" : "s"}
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
            No bookings matched your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Tour</th>
                  <th className="pb-3 pr-4 font-medium">Agency</th>
                  <th className="pb-3 pr-4 font-medium">Agent</th>
                  <th className="pb-3 pr-4 font-medium">Customer / Group</th>
                  <th className="pb-3 pr-4 font-medium">Guests</th>
                  <th className="pb-3 pr-4 font-medium">Booking Status</th>
                  <th className="pb-3 pr-4 font-medium">Payment</th>
                  <th className="pb-3 pr-4 font-medium">Departure</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 pr-4 font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const displayedReference =
                    booking.bookingDisplayCode || booking.bookingReference;

                  const clientLabel =
                    booking.groupName || booking.customerName || "-";

                  return (
                    <tr key={booking.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="block hover:text-[#8B0000]"
                        >
                          <div className="font-medium text-[#001F3F]">
                            {displayedReference}
                          </div>
                          {booking.bookingDisplayCode ? (
                            <div className="text-xs text-slate-500">
                              {booking.bookingReference}
                            </div>
                          ) : null}
                        </Link>
                      </td>

                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {booking.bookingType}
                        </span>
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        <div className="font-medium text-slate-800">
                          {booking.tourTitleSnapshot}
                        </div>
                        <div className="text-xs text-slate-500">
                          {booking.createdAt ? `Created ${formatDate(booking.createdAt)}` : ""}
                        </div>
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        {booking.agencyNameSnapshot || "-"}
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        {booking.agentNameSnapshot || "-"}
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        {clientLabel}
                      </td>

                      <td className="py-3 pr-4">{booking.numberOfGuests}</td>

                      <td className="py-3 pr-4">
                        <span className={getBookingStatusClass(booking.status)}>
                          {booking.status}
                        </span>
                      </td>

                      <td className="py-3 pr-4">
                        <span className={getPaymentStatusClass(booking.paymentStatus)}>
                          {booking.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(booking.departureDateSnapshot)}
                      </td>

                      <td className="py-3 pr-4 font-medium text-slate-800">
                        {formatCurrency(booking.totalPrice, booking.currency)}
                      </td>

                      <td className="py-3 pr-4 font-medium text-green-700">
                        {formatCurrency(booking.commissionAmount, booking.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}