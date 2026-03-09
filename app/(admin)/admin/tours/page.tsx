import { db } from "@/lib/db";
import Link from "next/link";

export default async function AdminToursPage() {
  const tours = await db.tour.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tours</h1>
          <p className="text-sm text-muted-foreground">
            Manage pilgrimage, cultural, historical, and thematic tours.
          </p>
        </div>

        <Link
          href="/admin/tours/create"
          className="rounded-md bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800"
        >
          + Create Tour
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <table className="w-full text-sm">

          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Destinations</th>
              <th className="p-3 text-left">Duration</th>
              <th className="p-3 text-left">Published</th>
              <th className="p-3 text-left">Featured</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>

            {tours.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No tours created yet.
                </td>
              </tr>
            )}

            {tours.map((tour) => (
              <tr key={tour.id} className="border-b">

                <td className="p-3 font-medium">
                  {tour.title}
                </td>

                <td className="p-3">
                  {tour.category}
                </td>

                <td className="p-3">
                  {tour.destinations?.join(", ")}
                </td>

                <td className="p-3">
                  {tour.duration} days
                </td>

                <td className="p-3">
                  {tour.isPublished ? (
                    <span className="text-green-600 font-medium">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>

                <td className="p-3">
                  {tour.featured ? (
                    <span className="text-blue-600 font-medium">Yes</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>

                <td className="p-3 flex gap-4">

                  <Link
                    href={`/admin/tours/${tour.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>

                  <Link
                    href={`/admin/tours/${tour.id}/departures`}
                    className="text-blue-600 hover:underline"
                  >
                    Departures
                  </Link>

                </td>

              </tr>
            ))}

          </tbody>
        </table>
      </div>
    </div>
  );
}