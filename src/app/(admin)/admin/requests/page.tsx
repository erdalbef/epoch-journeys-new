import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: string) {
  const base = "inline-flex rounded-full px-2 py-1 text-xs font-medium";

  switch (status) {
    case "NEW":
      return `${base} bg-yellow-100 text-yellow-800`;
    case "IN_REVIEW":
      return `${base} bg-blue-100 text-blue-800`;
    case "QUOTED":
      return `${base} bg-purple-100 text-purple-800`;
    case "CONFIRMED":
      return `${base} bg-green-100 text-green-800`;
    case "CANCELLED":
      return `${base} bg-red-100 text-red-800`;
    default:
      return `${base} bg-gray-100 text-gray-800`;
  }
}

export default async function AdminRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const requests = await db.customTourRequest.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          travelAgency: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#001F3F]">
          Custom Requests
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Review incoming custom and tailor-made travel requests from agents.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">No requests found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50 text-sm text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Agent</th>
                  <th className="px-4 py-3 font-semibold">Travel Agency</th>
                  <th className="px-4 py-3 font-semibold">Destination</th>
                  <th className="px-4 py-3 font-semibold">Pax</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 text-sm">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-medium text-gray-900">
                      {request.requestReference}
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {request.user?.fullName || request.user?.email || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {request.user?.travelAgency || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {request.destinations.length > 0
                        ? request.destinations.join(", ")
                        : request.destination || "—"}
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {request.estimatedPax ?? "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span className={statusBadge(request.status)}>
                        {request.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-gray-700">
                      {formatDate(request.createdAt)}
                    </td>

                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/requests/${request.id}`}
                        className="inline-flex rounded-lg bg-[#001F3F] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}