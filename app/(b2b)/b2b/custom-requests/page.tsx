import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";
import { redirect } from "next/navigation";

function getStatusClasses(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "QUOTED":
      return "bg-purple-100 text-purple-800";
    case "CONFIRMED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default async function CustomRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-signin");
  }

  const requests = await db.customTourRequest.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Custom Tour Requests
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View and manage your tailor-made tour requests.
          </p>
        </div>

        <Link
          href="/b2b/custom-requests/new"
          className="inline-flex items-center justify-center rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
        >
          New Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No custom requests yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            When you submit a tailor-made tour request, it will appear here.
          </p>

          <Link
            href="/b2b/custom-requests/new"
            className="mt-5 inline-flex items-center justify-center rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
          >
            Create Your First Request
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Destination
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Pax
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/b2b/custom-requests/${request.id}`}
                        className="font-medium text-red-700 hover:text-red-800 hover:underline"
                      >
                        {request.requestReference}
                      </Link>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {request.destination || "-"}
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {request.estimatedPax ?? "-"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          request.status
                        )}`}
                      >
                        {formatStatus(request.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(request.createdAt))}
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