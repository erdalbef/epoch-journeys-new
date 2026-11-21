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

export default async function AdminCustomRequestsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; sort?: string }> }) {
  const filters = await searchParams;
  const q = (filters.q || "").trim().slice(0, 120);
  const status = filters.status || "all";
  const sort = filters.sort === "oldest" ? "asc" : "desc";
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const requests = await db.customTourRequest.findMany({
    where: {
      ...(status !== "all" && Object.values(CustomRequestStatus).includes(status as CustomRequestStatus) ? { status: status as CustomRequestStatus } : {}),
      ...(q ? { OR: [
        { requestReference: { contains: q, mode: "insensitive" as const } },
        { title: { contains: q, mode: "insensitive" as const } },
        { destination: { contains: q, mode: "insensitive" as const } },
        { user: { is: { fullName: { contains: q, mode: "insensitive" as const } } } },
        { user: { is: { travelAgency: { contains: q, mode: "insensitive" as const } } } },
      ] } : {}),
    },
    orderBy: { createdAt: sort },
    include: {
      user: true,
    },
  });

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#001F3F]">
          Quote Requests
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage all tailor-made tour requests submitted by agents.
        </p>
      </div>

      <form method="get" className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_190px_160px_auto]">
        <input type="search" name="q" defaultValue={q} placeholder="Reference, agent, agency, tour..." aria-label="Search requests" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="status" defaultValue={status} aria-label="Filter by status" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          {Object.values(CustomRequestStatus).map(value => <option key={value} value={value}>{formatLabel(value)}</option>)}
        </select>
        <select name="sort" defaultValue={filters.sort || "newest"} aria-label="Sort requests" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
        </select>
        <div className="flex items-center gap-2"><button type="submit" className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-semibold text-white">Search</button><Link href="/admin/custom-requests" className="text-sm text-slate-600 underline">Clear</Link></div>
      </form>
      <p className="mb-3 text-xs text-slate-500">{requests.length} matching requests</p>
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
                    Tour
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