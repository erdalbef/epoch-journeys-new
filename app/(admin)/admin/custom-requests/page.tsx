import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { CustomRequestStatus, Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getStatusClasses(status: CustomRequestStatus) {
  switch (status) {
    case CustomRequestStatus.NEW:
      return "bg-yellow-100 text-yellow-800";
    case CustomRequestStatus.IN_REVIEW:
      return "bg-blue-100 text-blue-800";
    case CustomRequestStatus.QUOTED:
      return "bg-purple-100 text-purple-800";
    case CustomRequestStatus.CONFIRMED:
      return "bg-green-100 text-green-800";
    case CustomRequestStatus.CANCELLED:
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default async function AdminCustomRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const requests = await db.customTourRequest.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: true,
    },
  });

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#001F3F]">
          Custom Tour Requests
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage all tailor-made tour requests submitted by agents.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            No custom requests yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Submitted custom requests will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-245 text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="p-3 text-left font-semibold text-slate-700">
                    Reference
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-700">
                    Agent
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-700">
                    Travel Agency
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-700">
                    Destination
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-700">
                    Pax
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="p-3 text-left font-semibold text-slate-700">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <Link
                        href={`/admin/custom-requests/${r.id}`}
                        className="font-medium text-[#8B0000] hover:underline"
                      >
                        {r.requestReference}
                      </Link>
                    </td>

                    <td className="p-3">
                      <div className="font-medium text-slate-900">
                        {r.user?.fullName || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.user?.email || "-"}
                      </div>
                    </td>

                    <td className="p-3 text-slate-700">
                      {r.user?.travelAgency || "-"}
                    </td>

                    <td className="p-3 text-slate-700">
                      {r.destination || "-"}
                    </td>

                    <td className="p-3 text-slate-700">
                      {r.estimatedPax ?? "-"}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          r.status
                        )}`}
                      >
                        {formatLabel(r.status)}
                      </span>
                    </td>

                    <td className="p-3 text-slate-700">
                      {formatDate(r.createdAt)}
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