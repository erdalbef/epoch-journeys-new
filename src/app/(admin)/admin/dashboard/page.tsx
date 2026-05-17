import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { OperationStatus } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const [
    totalBookings,
    confirmedBookings,
    pendingBookings,
    totalTours,
    notReadyBookingsCount,
    recentCommunications,
  ] = await Promise.all([
    db.booking.count(),

    db.booking.count({
      where: { status: "CONFIRMED" },
    }),

    db.booking.count({
      where: { status: "PENDING" },
    }),

    db.tour.count(),

    db.booking.count({
      where: {
        OR: [
          { operationControl: null },
          {
            operationControl: {
              status: {
                in: [OperationStatus.PENDING, OperationStatus.IN_PROGRESS],
              },
            },
          },
        ],
      },
    }),

    db.agentCommunication.findMany({
      take: 8,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        agent: {
          select: {
            id: true,
            fullName: true,
            travelAgency: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* OPERATION ALERT */}
      <div>
        {notReadyBookingsCount > 0 ? (
          <Link
            href="/admin/bookings?operation=not-ready"
            className="block rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm hover:bg-red-100"
          >
            <p className="text-sm font-medium text-red-700">
              ⚠ Operation Alert
            </p>

            <p className="mt-2 text-3xl font-bold text-red-900">
              {notReadyBookingsCount}
            </p>

            <p className="mt-1 text-sm text-red-700">
              booking(s) not operationally ready
            </p>
          </Link>
        ) : (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-green-700">
              Operations Status
            </p>

            <p className="mt-2 text-3xl font-bold text-green-900">
              All Ready
            </p>

            <p className="mt-1 text-sm text-green-700">
              All bookings are operationally ready
            </p>
          </div>
        )}
      </div>

      {/* MAIN STATS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Link
          href="/admin/bookings"
          className="rounded-xl border bg-white p-5 shadow-sm hover:bg-gray-50"
        >
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="mt-2 text-2xl font-bold">{totalBookings}</p>
        </Link>

        <Link
          href="/admin/bookings"
          className="rounded-xl border bg-white p-5 shadow-sm hover:bg-gray-50"
        >
          <p className="text-sm text-gray-500">Confirmed Bookings</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {confirmedBookings}
          </p>
        </Link>

        <Link
          href="/admin/bookings"
          className="rounded-xl border bg-white p-5 shadow-sm hover:bg-gray-50"
        >
          <p className="text-sm text-gray-500">Pending Bookings</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {pendingBookings}
          </p>
        </Link>

        <Link
          href="/admin/tours"
          className="rounded-xl border bg-white p-5 shadow-sm hover:bg-gray-50"
        >
          <p className="text-sm text-gray-500">Total Tours</p>
          <p className="mt-2 text-2xl font-bold">{totalTours}</p>
        </Link>
      </div>

      {/* QUICK LINKS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/admin/bookings"
          className="rounded-xl border bg-white p-5 shadow-sm hover:bg-gray-50"
        >
          <p className="font-semibold text-gray-900">All Bookings</p>
          <p className="mt-1 text-sm text-gray-600">
            View and manage every booking record
          </p>
        </Link>

        <Link
          href="/admin/bookings?operation=not-ready"
          className="rounded-xl border border-red-100 bg-white p-5 shadow-sm hover:bg-red-50"
        >
          <p className="font-semibold text-gray-900">
            Not-Ready Operations
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Review bookings that still need operational preparation
          </p>
        </Link>

        <Link
          href="/admin/tours"
          className="rounded-xl border bg-white p-5 shadow-sm hover:bg-gray-50"
        >
          <p className="font-semibold text-gray-900">
            Tours & Departures
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Manage tours, departures, pricing, and availability
          </p>
        </Link>
      </div>

      {/* RECENT COMMUNICATIONS */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Recent Agent Communications
            </h2>

            <p className="text-sm text-slate-500">
              Latest notes and operational updates
            </p>
          </div>

          <Link
            href="/admin/agents"
            className="text-sm font-medium text-[#001F3F]"
          >
            View Agents
          </Link>
        </div>

        {recentCommunications.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-sm text-slate-500">
            No communications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recentCommunications.map((item) => (
              <Link
                key={item.id}
                href={`/admin/agents/${item.agent.id}`}
                className="block rounded-xl border bg-slate-50 p-4 transition hover:bg-slate-100"
              >
                <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#001F3F] px-2 py-1 text-xs text-white">
                      {item.type}
                    </span>

                    <span className="text-sm font-medium text-slate-800">
                      {item.agent.fullName || "Agent"}
                    </span>

                    {item.agent.travelAgency && (
                      <span className="text-xs text-slate-500">
                        ({item.agent.travelAgency})
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-500">
                    {formatDate(item.createdAt)}
                  </span>
                </div>

                <p className="line-clamp-2 text-sm text-slate-700">
                  {item.message}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}