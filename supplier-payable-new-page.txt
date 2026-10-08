import Link from "next/link";

import { db } from "@/lib/db";
import SupplierPayableForm from "@/components/admin/supplier-payables/SupplierPayableForm";

export default async function NewSupplierPayablePage() {
  const [suppliers, tours, bookings] = await Promise.all([
    db.supplier.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ preferred: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        defaultCurrency: true,
        services: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        rates: {
          where: { isActive: true },
          orderBy: [{ validTo: "desc" }, { name: "asc" }],
          select: {
            id: true,
            serviceId: true,
            name: true,
            amount: true,
            currency: true,
            unit: true,
          },
        },
      },
    }),
    db.tour.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        departureDates: {
          orderBy: { date: "asc" },
          select: { id: true, date: true },
        },
      },
    }),
    db.booking.findMany({
      where: { status: { not: "CANCELLED" } },
      take: 250,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        tourTitleSnapshot: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link
          href="/admin/supplier-payables"
          className="text-sm font-semibold text-[#001F3F]"
        >
          ← Supplier Payables
        </Link>

        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Create Supplier Payable
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Record a supplier proforma, deposit invoice, final invoice or credit note.
          Epoch assigns the internal payable reference automatically.
        </p>
      </div>

      <SupplierPayableForm
        suppliers={suppliers.map((supplier) => ({
          ...supplier,
          rates: supplier.rates.map((rate) => ({
            ...rate,
            amount: rate.amount.toString(),
          })),
        }))}
        tours={tours.map((tour) => ({
          ...tour,
          departureDates: tour.departureDates.map((departure) => ({
            ...departure,
            date: departure.date.toISOString(),
          })),
        }))}
        bookings={bookings}
      />
    </div>
  );
}
