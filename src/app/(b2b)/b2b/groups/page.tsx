import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type GroupsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    paymentStatus?: string;
  }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value: string | Date | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadgeClass(status: string) {
  const base =
    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium";

  switch (status) {
    case "CONFIRMED":
      return `${base} bg-green-100 text-green-700`;
    case "PENDING":
      return `${base} bg-amber-100 text-amber-700`;
    case "CANCELLED":
      return `${base} bg-red-100 text-red-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

function getPaymentBadgeClass(paymentStatus: string) {
  const base =
    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium";

  switch (paymentStatus) {
    case "PAID":
      return `${base} bg-green-100 text-green-700`;
    case "PARTIAL":
      return `${base} bg-blue-100 text-blue-700`;
    case "UNPAID":
      return `${base} bg-amber-100 text-amber-700`;
    case "REFUNDED":
      return `${base} bg-slate-100 text-slate-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

function buildGroupsUrl(params: {
  q?: string;
  status?: string;
  paymentStatus?: string;
}) {
  const search = new URLSearchParams();

  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.paymentStatus) {
    search.set("paymentStatus", params.paymentStatus);
  }

  const query = search.toString();
  return query ? `/b2b/groups?${query}` : "/b2b/groups";
}

export default async function B2BGroupsPage({
  searchParams,
}: GroupsPageProps) {
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
      partnerType: true,
    },
  });

  if (
    !user ||
    user.role !== "AGENT" ||
    !user.approved ||
    user.status !== "ACTIVE"
  ) {
    redirect("/agent-login");
  }

  const resolvedSearchParams = await searchParams;

  const q = resolvedSearchParams?.q?.trim() || "";
  const status = resolvedSearchParams?.status?.trim() || "";
  const paymentStatus =
    resolvedSearchParams?.paymentStatus?.trim() || "";

  const groups = await db.booking.findMany({
    where: {
      userId: user.id,
      bookingType: "GROUP",
      ...(status ? { status: status as never } : {}),
      ...(paymentStatus
        ? { paymentStatus: paymentStatus as never }
        : {}),
      ...(q
        ? {
            OR: [
              {
                bookingReference: {
                  contains: q,
                  mode: "insensitive",
                },
              },
              {
                tourTitleSnapshot: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      bookingReference: true,
      tourTitleSnapshot: true,
      departureDateSnapshot: true,
      createdAt: true,
      numberOfGuests: true,
      status: true,
      paymentStatus: true,
      totalPrice: true,
      amountDue: true,
      commissionAmount: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const today = new Date();

  const totalGroups = groups.length;

  const totalPilgrims = groups.reduce((sum, group) => {
    return sum + group.numberOfGuests;
  }, 0);

  const confirmedGroups = groups.filter((group) => {
    return group.status === "CONFIRMED";
  }).length;

  const pendingGroups = groups.filter((group) => {
    return group.status === "PENDING";
  }).length;

  const outstandingBalance = groups.reduce((sum, group) => {
    return sum + group.amountDue;
  }, 0);

  const totalGroupRevenue = groups.reduce((sum, group) => {
    return sum + group.totalPrice;
  }, 0);

  const upcomingGroups = groups.filter((group) => {
    if (!group.departureDateSnapshot) return false;
    return new Date(group.departureDateSnapshot) > today;
  }).length;

  const paidGroups = groups.filter((group) => {
    return group.paymentStatus === "PAID";
  }).length;

  const pageTitle =
    user.partnerType === "GROUP_LEADER"
      ? "My Groups"
      : "Group Bookings";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#001F3F]">
              {pageTitle}
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Manage your group reservations, track pilgrim counts,
              monitor balances, and review upcoming departures from one
              place.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Partner: {user.fullName || "Partner"}
              </div>

              <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                Agency: {user.travelAgency || "Not provided"}
              </div>

              <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Active Account
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/b2b/bookings/new-group"
              className="rounded-xl bg-[#8B0000] px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              New Group Booking
            </Link>

            <Link
              href="/b2b/custom-requests"
              className="rounded-xl border px-5 py-3 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Tailor-Made Request
            </Link>

            <Link
              href="/b2b/resources"
              className="rounded-xl border px-5 py-3 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Travel Documents
            </Link>

            <Link
              href="/b2b/support"
              className="rounded-xl border px-5 py-3 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Support
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Total Groups
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {totalGroups}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Total Pilgrims
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {totalPilgrims}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Upcoming Departures
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {upcomingGroups}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Outstanding Balance
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {formatCurrency(outstandingBalance)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Confirmed Groups
          </div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {confirmedGroups}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Pending Groups
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {pendingGroups}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Paid Groups
          </div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {paidGroups}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">
            Total Group Revenue
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {formatCurrency(totalGroupRevenue)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Filter Groups
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search by reference or tour name, then narrow by booking
              and payment status.
            </p>
          </div>

          <Link
            href="/b2b/groups"
            className="text-sm font-medium text-[#8B0000] hover:underline"
          >
            Reset filters
          </Link>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label
              htmlFor="q"
              className="text-sm font-medium text-[#001F3F]"
            >
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Reference or tour"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="status"
              className="text-sm font-medium text-[#001F3F]"
            >
              Booking Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="paymentStatus"
              className="text-sm font-medium text-[#001F3F]"
            >
              Payment Status
            </label>
            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={paymentStatus}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">All</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="w-full rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Group List
            </h2>

            <div className="text-sm text-muted-foreground">
              {groups.length} result{groups.length === 1 ? "" : "s"}
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              No group bookings found for the current filters.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-245 text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">
                      Reference
                    </th>
                    <th className="pb-3 pr-4 font-medium">Tour</th>
                    <th className="pb-3 pr-4 font-medium">
                      Departure
                    </th>
                    <th className="pb-3 pr-4 font-medium">
                      Pilgrims
                    </th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">
                      Payment
                    </th>
                    <th className="pb-3 pr-4 font-medium">
                      Total Price
                    </th>
                    <th className="pb-3 pr-4 font-medium">
                      Balance Due
                    </th>
                    <th className="pb-3 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-3 pr-4 font-medium text-[#001F3F]">
                        <Link
                          href={`/b2b/groups/${group.id}`}
                          className="hover:text-[#8B0000]"
                        >
                          {group.bookingReference}
                        </Link>
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        {group.tourTitleSnapshot}
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(group.departureDateSnapshot)}
                      </td>

                      <td className="py-3 pr-4">
                        {group.numberOfGuests}
                      </td>

                      <td className="py-3 pr-4">
                        <span className={getStatusBadgeClass(group.status)}>
                          {group.status}
                        </span>
                      </td>

                      <td className="py-3 pr-4">
                        <span
                          className={getPaymentBadgeClass(
                            group.paymentStatus
                          )}
                        >
                          {group.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatCurrency(group.totalPrice)}
                      </td>

                      <td className="py-3 pr-4 font-medium text-amber-700">
                        {formatCurrency(group.amountDue)}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/b2b/groups/${group.id}`}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
                          >
                            View
                          </Link>

                          <Link
                            href={`/b2b/support?bookingId=${group.id}`}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
                          >
                            Request Help
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Next Actions
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl border bg-slate-50 p-4">
              Review all pending group bookings and confirm the latest
              pilgrim counts.
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              Monitor balances due before departure and keep payment
              progress on track.
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              Use support requests for rooming lists, passenger
              updates, special needs, or operational changes.
            </div>

            <div className="rounded-xl border bg-slate-50 p-4">
              Submit tailor-made requests when your church or community
              needs a custom pilgrimage program.
            </div>
          </div>

          <div className="mt-6 rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold text-[#001F3F]">
              Quick Links
            </div>

            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link
                href={buildGroupsUrl({
                  q,
                  status: "PENDING",
                  paymentStatus,
                })}
                className="text-[#8B0000] hover:underline"
              >
                Show pending groups
              </Link>

              <Link
                href={buildGroupsUrl({
                  q,
                  status,
                  paymentStatus: "UNPAID",
                })}
                className="text-[#8B0000] hover:underline"
              >
                Show unpaid groups
              </Link>

              <Link
                href="/b2b/bookings/new-group"
                className="text-[#8B0000] hover:underline"
              >
                Start a new group booking
              </Link>

              <Link
                href="/b2b/custom-requests"
                className="text-[#8B0000] hover:underline"
              >
                Request a custom pilgrimage
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}