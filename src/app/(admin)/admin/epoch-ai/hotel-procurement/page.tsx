import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EpochHotelProcurementPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const tours = await db.tour.findMany({
    select: {
      id: true,
      title: true,
      destinations: true,
      duration: true,
      isPublished: true,
    },
    orderBy: [{ title: "asc" }, { id: "asc" }],
  });

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-6">
      <Link
        href="/admin/epoch-ai"
        className="text-sm font-medium text-blue-800 underline"
      >
        Back to Epoch AI
      </Link>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">
          Epoch AI | Supplier Procurement
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#001F3F]">
          Hotel Procurement
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Select a pilgrimage to research hotels and manage supplier inquiries.
        </p>
      </div>

      <p className="text-sm text-slate-500">
        {tours.length} tour records available
      </p>

      {tours.length === 0 ? (
        <div className="rounded-lg border bg-white p-5">
          No tour records are available.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <Link
              key={tour.id}
              href={`/admin/epoch-ai/hotel-procurement/${encodeURIComponent(tour.id)}`}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:border-[#001F3F] hover:shadow-sm"
            >
              <h2 className="font-bold text-[#001F3F]">
                {tour.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {tour.destinations.join(", ")}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {tour.duration} days
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {tour.isPublished ? "Published" : "Not published"}
              </p>
              <p className="mt-4 text-sm font-semibold text-blue-800">
                Open Hotel Procurement
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}