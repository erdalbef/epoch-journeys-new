import Link from "next/link";
import MassArrangementForm from "@/components/admin/suppliers/MassArrangementForm";
import { db } from "@/lib/db";

export default async function NewMassArrangementPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string }>;
}) {
  const { supplierId } = await searchParams;
  const [suppliers, tours, bookings] = await Promise.all([
    db.supplier.findMany({ where: { type: "CHURCH_SHRINE", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.tour.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    db.booking.findMany({ where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" }, take: 250, select: { id: true, bookingReference: true, tourTitleSnapshot: true } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link href="/admin/mass-arrangements" className="text-sm font-semibold text-[#001F3F]">← Mass Arrangements</Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">New Mass Arrangement</h1>
        <p className="mt-2 text-sm text-slate-500">Create the operational Mass request and link it to a permanent church/shrine supplier where possible.</p>
      </div>
      <MassArrangementForm
        initialSupplierId={supplierId}
        suppliers={suppliers.map((x) => ({ id: x.id, label: x.name }))}
        tours={tours.map((x) => ({ id: x.id, label: x.title }))}
        bookings={bookings.map((x) => ({ id: x.id, label: `${x.bookingReference} · ${x.tourTitleSnapshot}` }))}
      />
    </div>
  );
}
