import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { OperationStatus, Prisma } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import ActionButton from "@/components/shared/button/ActionButton";
import DeleteBookingButton from "@/components/admin/bookings/DeleteBookingButton";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    operation?: string;
  }>;
};

const PAGE_SIZE = 20;

function getOperationStatusStyle(status?: string | null) {
  switch (status) {
    case "READY":
      return "bg-green-100 text-green-700";
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-red-100 text-red-700";
  }
}

function getOperationWhere(operationFilter: string): Prisma.BookingWhereInput {
  if (operationFilter === "not-ready") {
    return {
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
    };
  }

  if (operationFilter === "pending") {
    return {
      OR: [
        { operationControl: null },
        {
          operationControl: {
            status: OperationStatus.PENDING,
          },
        },
      ],
    };
  }

  if (operationFilter === "in-progress") {
    return {
      operationControl: {
        status: OperationStatus.IN_PROGRESS,
      },
    };
  }

  if (operationFilter === "ready") {
    return {
      operationControl: {
        status: OperationStatus.READY,
      },
    };
  }

  return {};
}

function filterClass(active: boolean, activeClass: string) {
  return `rounded-md border px-4 py-2 text-sm font-medium ${
    active ? activeClass : "bg-white hover:bg-gray-50"
  }`;
}

export default async function AdminBookingsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const params = await searchParams;
  const page = Number(params.page || "1");
  const currentPage = page < 1 ? 1 : page;
  const operationFilter = params.operation || "all";

  const skip = (currentPage - 1) * PAGE_SIZE;
  const where = getOperationWhere(operationFilter);

  const [bookings, totalCount, notReadyCount] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        tour: {
          select: {
            title: true,
          },
        },
        operationControl: true,
      },
    }),
    db.booking.count({ where }),
    db.booking.count({
      where: getOperationWhere("not-ready"),
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const filterBase =
    operationFilter === "all"
      ? "/admin/bookings?operation=all"
      : `/admin/bookings?operation=${operationFilter}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage bookings and operation readiness.
          </p>
        </div>

        {notReadyCount > 0 ? (
          <Link
            href="/admin/bookings?operation=not-ready"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            ⚠ {notReadyCount} Not Ready
          </Link>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
            All operations ready
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/bookings?operation=all"
          className={filterClass(
            operationFilter === "all",
            "bg-[#001F3F] text-white"
          )}
        >
          All
        </Link>

        <Link
          href="/admin/bookings?operation=not-ready"
          className={filterClass(
            operationFilter === "not-ready",
            "bg-[#8B0000] text-white"
          )}
        >
          Not Ready
        </Link>

        <Link
          href="/admin/bookings?operation=pending"
          className={filterClass(
            operationFilter === "pending",
            "bg-red-600 text-white"
          )}
        >
          Pending
        </Link>

        <Link
          href="/admin/bookings?operation=in-progress"
          className={filterClass(
            operationFilter === "in-progress",
            "bg-yellow-500 text-white"
          )}
        >
          In Progress
        </Link>

        <Link
          href="/admin/bookings?operation=ready"
          className={filterClass(
            operationFilter === "ready",
            "bg-green-600 text-white"
          )}
        >
          Ready
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-4 text-sm text-gray-700">
        Showing <span className="font-semibold">{totalCount}</span> booking(s).
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Reference</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Tour</th>
              <th className="p-3">Guests</th>
              <th className="p-3">Booking</th>
              <th className="p-3">Operation</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-500">
                  No bookings found.
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const operationStatus = b.operationControl?.status || "PENDING";

                return (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {b.bookingReference || "N/A"}
                      </Link>
                    </td>

                    <td className="p-3">
                      {b.user?.fullName || b.user?.email || "-"}
                    </td>

                    <td className="p-3">{b.tour?.title || "-"}</td>

                    <td className="p-3">{b.numberOfGuests || 0}</td>

                    <td className="p-3">{b.status}</td>

                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${getOperationStatusStyle(
                          operationStatus
                        )}`}
                      >
                        {operationStatus}
                      </span>
                    </td>

                    <td className="p-3">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          label="Control"
                          href={`/admin/bookings/${b.id}/control`}
                          size="sm"
                          variant="secondary"
                        />

                        <DeleteBookingButton
                          bookingId={b.id}
                          bookingReference={b.bookingReference}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </p>

        <div className="flex gap-2">
          <Link
            href={`${filterBase}&page=${currentPage - 1}`}
            className={`rounded border px-3 py-1 text-sm ${
              currentPage <= 1
                ? "pointer-events-none opacity-50"
                : "hover:bg-gray-100"
            }`}
          >
            Previous
          </Link>

          <Link
            href={`${filterBase}&page=${currentPage + 1}`}
            className={`rounded border px-3 py-1 text-sm ${
              currentPage >= totalPages
                ? "pointer-events-none opacity-50"
                : "hover:bg-gray-100"
            }`}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}