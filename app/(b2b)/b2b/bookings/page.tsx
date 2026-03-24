import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type SearchParams = {
  type?: string;
  status?: string;
  payment?: string;
  q?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
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
  type?: string;
  status?: string;
  payment?: string;
  q?: string;
}) {
  const search = new URLSearchParams();

  if (params.type) search.set("type", params.type);
  if (params.status) search.set("status", params.status);
  if (params.payment) search.set("payment", params.payment);
  if (params.q) search.set("q", params.q);

  const query = search.toString();
  return query ? `/b2b/bookings?${query}` : "/b2b/bookings";
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

function getSeasonLabel(season: string) {
  switch (season) {
    case "LOW":
      return "Low Season";
    case "SHOULDER":
      return "Shoulder Season";
    case "HIGH":
      return "High Season";
    case "PEAK":
      return "Peak Season";
    default:
      return season;
  }
}

function getBookingStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "CONFIRMED":
      return "Confirmed";
    case "ON_REQUEST":
      return "On Request";
    case "WAITLIST":
      return "Waitlist";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case "UNPAID":
      return "Unpaid";
    case "PARTIALLY_PAID":
      return "Partially Paid";
    case "PAID":
      return "Paid";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
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

export default async function B2BBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
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

  const resolvedSearchParams = (await searchParams) ?? {};

  const selectedType =
    resolvedSearchParams.type === "FIT" || resolvedSearchParams.type === "GROUP"
      ? resolvedSearchParams.type
      : "";

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

  const query = resolvedSearchParams.q?.trim() ?? "";

  const bookings = await db.booking.findMany({
    where: {
      userId: user.id,
      ...(selectedType ? { bookingType: selectedType } : {}),
      ...(selectedStatus ? { status: selectedStatus } : {}),
      ...(selectedPayment ? { paymentStatus: selectedPayment } : {}),
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
                customerName: {
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
                leadFirstName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                leadLastName: {
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
      customerName: true,
      leadFirstName: true,
      leadLastName: true,
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

  const attentionCount = bookings.filter(
    (booking) =>
      booking.status === "PENDING" || booking.paymentStatus === "UNPAID"
  ).length;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#001F3F]">My Bookings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Review FIT and group bookings, track status, payments, and departure details.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/b2b/bookings/new-fit"
              className="rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              New FIT Booking
            </Link>

            <Link
              href="/b2b/bookings/new-group"
              className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              New Group Booking
            </Link>
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

      {attentionCount > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          You have {attentionCount} booking{attentionCount === 1 ? "" : "s"} requiring attention.
        </div>
      ) : null}

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
                placeholder="Search by display reference, official reference, tour, customer, leader, or group name"
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
                href="/b2b/bookings"
                className="w-full rounded-xl border px-4 py-2 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
              >
                Reset
              </Link>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            <FilterLink
              href={buildUrl({
                type: "",
                status: selectedStatus,
                payment: selectedPayment,
                q: query,
              })}
              label="All Types"
              active={!selectedType}
            />
            <FilterLink
              href={buildUrl({
                type: "FIT",
                status: selectedStatus,
                payment: selectedPayment,
                q: query,
              })}
              label="FIT"
              active={selectedType === "FIT"}
            />
            <FilterLink
              href={buildUrl({
                type: "GROUP",
                status: selectedStatus,
                payment: selectedPayment,
                q: query,
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
            <table className="w-full min-w-275 text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Tour</th>
                  <th className="pb-3 pr-4 font-medium">Client / Group</th>
                  <th className="pb-3 pr-4 font-medium">Guests</th>
                  <th className="pb-3 pr-4 font-medium">Booking Status</th>
                  <th className="pb-3 pr-4 font-medium">Payment</th>
                  <th className="pb-3 pr-4 font-medium">Departure</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 pr-4 font-medium">Commission</th>
                  <th className="pb-3 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const clientLabel =
                    booking.groupName ||
                    booking.customerName ||
                    `${booking.leadFirstName ?? ""} ${booking.leadLastName ?? ""}`.trim() ||
                    "-";

                  const displayedReference =
                    booking.bookingDisplayCode || booking.bookingReference;

                  return (
                    <tr key={booking.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/b2b/bookings/${booking.id}`}
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
                          {getSeasonLabel(booking.seasonSnapshot)}
                        </div>
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">{clientLabel}</td>

                      <td className="py-3 pr-4">{booking.numberOfGuests}</td>

                      <td className="py-3 pr-4">
                        <span className={getBookingStatusClass(booking.status)}>
                          {getBookingStatusLabel(booking.status)}
                        </span>
                      </td>

                      <td className="py-3 pr-4">
                        <span className={getPaymentStatusClass(booking.paymentStatus)}>
                          {getPaymentStatusLabel(booking.paymentStatus)}
                        </span>
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(booking.departureDateSnapshot)}
                      </td>

                      <td className="py-3 pr-4 font-medium text-slate-800">
                        {formatCurrency(booking.totalPrice)}
                      </td>

                      <td className="py-3 pr-4 font-medium text-green-700">
                        {formatCurrency(booking.commissionAmount)}
                      </td>

                      <td className="py-3 pr-4">
                        <Link
                          href={`/b2b/bookings/${booking.id}`}
                          className="rounded-lg border px-3 py-2 text-xs font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
                        >
                          View
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
    </div>
  );
}