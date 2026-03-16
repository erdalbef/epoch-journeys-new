import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Link from "next/link";

export default async function CustomRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <div>Unauthorized</div>;
  }

  const requests = await prisma.customTourRequest.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="max-w-5xl mx-auto p-8">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Custom Tour Requests
        </h1>

        <Link
          href="/b2b/custom-requests/new"
          className="bg-red-700 text-white px-4 py-2 rounded"
        >
          New Request
        </Link>
      </div>

      <table className="w-full border">

        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Reference</th>
            <th className="p-3 text-left">Destination</th>
            <th className="p-3 text-left">Pax</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Created</th>
          </tr>
        </thead>

        <tbody>

          {requests.map((r) => (
            <tr key={r.id} className="border-t">

              <td className="p-3">
                <Link
                  href={`/b2b/custom-requests/${r.id}`}
                  className="text-red-700 font-medium"
                >
                  {r.requestReference}
                </Link>
              </td>

              <td className="p-3">
                {r.destination}
              </td>

              <td className="p-3">
                {r.estimatedPax || "-"}
              </td>

              <td className="p-3">
                {r.status}
              </td>

              <td className="p-3">
                {new Date(r.createdAt).toLocaleDateString()}
              </td>

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}