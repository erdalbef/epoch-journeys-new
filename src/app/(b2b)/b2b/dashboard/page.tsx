import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  FileText,
  FolderOpen,
  Headphones,
  Landmark,
  Map,
  ReceiptText,
  Settings,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(value: string | Date | null) {
  if (!value) {
    return "Date TBC";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function B2BDashboardPage() {
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
      agentCode: true,
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

  const isGroupLeader = user.partnerType === "GROUP_LEADER";
  const earningsLabel = isGroupLeader ? "Payout" : "Commission";

  const allBookings = await db.booking.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const recentBookings = allBookings.slice(0, 5);

  const groupBookings = allBookings.filter(
    (booking) => booking.bookingType === "GROUP",
  );

  const now = new Date();

  const upcomingBookings = allBookings
    .filter(
      (booking) =>
        booking.departureDateSnapshot &&
        booking.departureDateSnapshot > now,
    )
    .sort((a, b) => {
      const aTime = a.departureDateSnapshot?.getTime() ?? 0;
      const bTime = b.departureDateSnapshot?.getTime() ?? 0;
      return aTime - bTime;
    });

  const totalGroups = groupBookings.length;

  const totalPilgrims = groupBookings.reduce(
    (sum, booking) => sum + booking.numberOfGuests,
    0,
  );

  const upcomingGroups = groupBookings.filter(
    (booking) =>
      booking.departureDateSnapshot &&
      booking.departureDateSnapshot > now,
  ).length;

  const totalBookings = allBookings.length;

  const totalGuests = allBookings.reduce(
    (sum, booking) => sum + booking.numberOfGuests,
    0,
  );

  const totalRevenue = allBookings.reduce(
    (sum, booking) => sum + booking.totalPrice,
    0,
  );

  const totalEarnings = allBookings.reduce(
    (sum, booking) => sum + booking.commissionAmount,
    0,
  );

  const outstandingBalance = allBookings.reduce(
    (sum, booking) => sum + (booking.amountDue ?? 0),
    0,
  );

  const outstandingBookings = allBookings.filter(
    (booking) => (booking.amountDue ?? 0) > 0,
  );

  const listForTable = isGroupLeader
    ? groupBookings.slice(0, 5)
    : recentBookings;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-[#001F3F] shadow-sm">
        <div className="grid gap-6 px-6 py-7 text-white lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-200">
              Epoch Journeys Partner Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Welcome back, {user.fullName || "Partner"}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              {isGroupLeader
                ? "Manage your pilgrimage groups, travelers, documents, and payments from one place."
                : "Manage your bookings, sales activity, commissions, resources, and client requests from one place."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {user.travelAgency ? (
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  {user.travelAgency}
                </span>
              ) : null}

              {user.agentCode ? (
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  Agent Code: {user.agentCode}
                </span>
              ) : null}
            </div>
          </div>

          <Link
            href="/b2b/profile"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] transition hover:bg-slate-100"
          >
            <Settings className="h-4 w-4" />
            Profile & Billing
          </Link>
        </div>
      </section>

      {outstandingBookings.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                Needs Your Attention
              </p>

              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {outstandingBookings.length} booking
                {outstandingBookings.length === 1 ? "" : "s"} with an
                outstanding balance
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Current outstanding balance:{" "}
                <span className="font-semibold">
                  {formatCurrency(outstandingBalance)}
                </span>
              </p>
            </div>

            <Link
              href="/b2b/bookings"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B0000]"
            >
              Review bookings
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}

      {isGroupLeader ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="My Groups"
            value={totalGroups}
            icon={<BriefcaseBusiness className="h-5 w-5" />}
          />

          <StatCard
            label="Total Pilgrims"
            value={totalPilgrims}
            icon={<Users className="h-5 w-5" />}
          />

          <StatCard
            label="Upcoming Groups"
            value={upcomingGroups}
            icon={<CalendarDays className="h-5 w-5" />}
          />

          <StatCard
            label="Outstanding Balance"
            value={formatCurrency(outstandingBalance)}
            icon={<CircleDollarSign className="h-5 w-5" />}
          />
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Bookings"
            value={totalBookings}
            icon={<BookOpen className="h-5 w-5" />}
          />

          <StatCard
            label="Travelers"
            value={totalGuests}
            icon={<Users className="h-5 w-5" />}
          />

          <StatCard
            label="Sales Value"
            value={formatCurrency(totalRevenue)}
            icon={<ReceiptText className="h-5 w-5" />}
          />

          <StatCard
            label={earningsLabel}
            value={formatCurrency(totalEarnings)}
            icon={<CircleDollarSign className="h-5 w-5" />}
          />
        </section>
      )}

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Work Faster
          </p>

          <h2 className="mt-1 text-xl font-semibold text-[#001F3F]">
            Quick Actions
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isGroupLeader ? (
            <>
              <ActionCard
                href="/b2b/groups"
                title="My Groups"
                description="Open and manage your pilgrimage groups."
                icon={<BriefcaseBusiness className="h-5 w-5" />}
              />

              <ActionCard
                href="/b2b/groups/new"
                title="Create New Group"
                description="Start a new group and organize travelers."
                icon={<Users className="h-5 w-5" />}
              />

              <ActionCard
                href="/b2b/resources"
                title="Travel Documents"
                description="Find forms, brochures, and useful files."
                icon={<FolderOpen className="h-5 w-5" />}
              />

              <ActionCard
                href="/b2b/support"
                title="Support"
                description="Send a question or operational request."
                icon={<Headphones className="h-5 w-5" />}
              />
            </>
          ) : (
            <>
              <ActionCard
                href="/b2b/tours"
                title="Browse Tours"
                description="Explore journeys available for your clients."
                icon={<Map className="h-5 w-5" />}
              />

              <ActionCard
                href="/b2b/bookings"
                title="My Bookings"
                description="Review reservations, balances, and travelers."
                icon={<BookOpen className="h-5 w-5" />}
              />

              <ActionCard
                href="/b2b/custom-requests"
                title="Custom Request"
                description="Request a group, FIT, or tailor-made journey."
                icon={<FileText className="h-5 w-5" />}
              />

              <ActionCard
                href="/b2b/resources"
                title="Resources"
                description="Access sales and operational materials."
                icon={<FolderOpen className="h-5 w-5" />}
              />
            </>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                My Business
              </p>

              <h2 className="mt-1 text-xl font-semibold text-[#001F3F]">
                {isGroupLeader ? "My Groups" : "Recent Bookings"}
              </h2>
            </div>

            <Link
              href={isGroupLeader ? "/b2b/groups" : "/b2b/bookings"}
              className="text-sm font-semibold text-[#8B0000]"
            >
              View all
            </Link>
          </div>

          {listForTable.length === 0 ? (
            <EmptyState
              title={isGroupLeader ? "No groups yet" : "No bookings yet"}
              description={
                isGroupLeader
                  ? "Your groups will appear here after you create or receive one."
                  : "Your latest bookings will appear here."
              }
            />
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-3 font-semibold">Reference</th>
                    <th className="pb-3 font-semibold">Tour</th>
                    <th className="pb-3 font-semibold">Travelers</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Departure</th>
                    <th className="pb-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {listForTable.map((booking) => (
                    <tr key={booking.id} className="border-b last:border-0">
                      <td className="py-4 font-semibold text-[#001F3F]">
                        {booking.bookingReference}
                      </td>

                      <td className="py-4">
                        {booking.tourTitleSnapshot || "Custom Journey"}
                      </td>

                      <td className="py-4">{booking.numberOfGuests}</td>

                      <td className="py-4">
                        <StatusBadge status={booking.status} />
                      </td>

                      <td className="py-4">
                        {formatDate(booking.departureDateSnapshot)}
                      </td>

                      <td className="py-4 text-right">
                        <Link
                          href={`/b2b/bookings/${booking.id}`}
                          className="font-semibold text-[#8B0000] hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Ahead
            </p>

            <h2 className="mt-1 text-xl font-semibold text-[#001F3F]">
              Upcoming Departures
            </h2>
          </div>

          {upcomingBookings.length === 0 ? (
            <EmptyState
              title="No upcoming departures"
              description="Future booked departures will appear here."
            />
          ) : (
            <div className="mt-5 space-y-3">
              {upcomingBookings.slice(0, 4).map((booking) => (
                <Link
                  key={booking.id}
                  href={`/b2b/bookings/${booking.id}`}
                  className="block rounded-xl border p-4 transition hover:border-[#8B0000] hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#001F3F]">
                        {booking.tourTitleSnapshot || "Custom Journey"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {booking.bookingReference} · {booking.numberOfGuests}{" "}
                        traveler{booking.numberOfGuests === 1 ? "" : "s"}
                      </p>
                    </div>

                    <CalendarDays className="h-5 w-5 shrink-0 text-[#8B0000]" />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    {formatDate(booking.departureDateSnapshot)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Partner Toolkit
          </p>

          <h2 className="mt-1 text-xl font-semibold text-[#001F3F]">
            Your Everyday Tools
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {!isGroupLeader ? (
            <ToolkitCard
              href="/b2b/commissions"
              title="Commissions"
              description="Review your commission activity."
              icon={<CircleDollarSign className="h-5 w-5" />}
            />
          ) : (
            <ToolkitCard
              href="/b2b/payments"
              title="Payments"
              description="Review payment activity for your groups."
              icon={<Landmark className="h-5 w-5" />}
            />
          )}

          <ToolkitCard
            href="/b2b/resources"
            title="Resources"
            description="Brochures, forms, images, and documents."
            icon={<FolderOpen className="h-5 w-5" />}
          />

          <ToolkitCard
            href="/b2b/profile"
            title="Profile & Billing"
            description="Maintain your business and invoice details."
            icon={<Settings className="h-5 w-5" />}
          />

          <ToolkitCard
            href="/b2b/support"
            title="Support"
            description="Contact Epoch Journeys for assistance."
            icon={<Headphones className="h-5 w-5" />}
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </div>

        <div className="rounded-xl bg-slate-100 p-2 text-[#001F3F]">
          {icon}
        </div>
      </div>

      <div className="mt-4 text-2xl font-bold text-[#001F3F]">{value}</div>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#8B0000] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-xl bg-slate-100 p-2.5 text-[#001F3F]">
          {icon}
        </div>

        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#8B0000]" />
      </div>

      <h3 className="mt-4 font-semibold text-[#001F3F]">{title}</h3>

      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}

function ToolkitCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border bg-white p-5 transition hover:border-[#8B0000] hover:bg-slate-50"
    >
      <div className="text-[#8B0000]">{icon}</div>

      <h3 className="mt-3 font-semibold text-[#001F3F]">{title}</h3>

      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status.toUpperCase();

  let className = "bg-slate-100 text-slate-700";

  if (normalized.includes("CONFIRM")) {
    className = "bg-green-100 text-green-700";
  } else if (normalized.includes("PENDING")) {
    className = "bg-amber-100 text-amber-700";
  } else if (
    normalized.includes("CANCEL") ||
    normalized.includes("REJECT")
  ) {
    className = "bg-red-100 text-red-700";
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-5 rounded-xl border border-dashed bg-slate-50 px-5 py-8 text-center">
      <p className="font-semibold text-[#001F3F]">{title}</p>

      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
