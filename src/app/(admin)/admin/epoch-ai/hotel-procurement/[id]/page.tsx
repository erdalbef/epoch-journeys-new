import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import HotelProcurementPilot from "@/components/admin/epoch-ai/HotelProcurementPilot";

export const dynamic = "force-dynamic";

export default async function EpochTourHotelProcurementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const { id } = await params;

  const tour = await db.tour.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      destinations: true,
      itinerary: true,
    },
  });

  if (!tour) notFound();

  const hotels = await db.supplier.findMany({
    where: { type: "HOTEL" },
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      email: true,
      preferred: true,
      contacts: {
        select: { email: true, isPrimary: true },
        orderBy: { isPrimary: "desc" },
      },
    },
    orderBy: [{ preferred: "desc" }, { name: "asc" }],
    take: 500,
  });

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-6">
      <div className="flex flex-wrap gap-4 text-sm font-medium text-blue-800">
        <Link href="/admin/epoch-ai" className="underline">
          Back to Epoch AI
        </Link>
        <Link
          href="/admin/epoch-ai/hotel-procurement"
          className="underline"
        >
          Select another tour
        </Link>
        <Link
          href={`/admin/tours/${encodeURIComponent(tour.id)}`}
          className="underline"
        >
          View tour record
        </Link>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#8B0000]">
          Epoch AI | Supplier Procurement
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#001F3F]">
          Hotel Procurement
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {tour.title}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Research hotels, prepare inquiries and review supplier communications.
          External emails require explicit Admin authorization.
        </p>
      </div>

      <HotelProcurementPilot
        key={tour.id}
        tourId={tour.id}
        destinations={tour.destinations}
        itinerary={tour.itinerary}
        hotels={hotels}
      />
    </main>
  );
}
