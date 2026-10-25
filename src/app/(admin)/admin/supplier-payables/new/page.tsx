import Link from "next/link";

import { db } from "@/lib/db";
import SupplierPayableForm from "@/components/admin/supplier-payables/SupplierPayableForm";

export default async function NewSupplierPayablePage() {
  const [suppliers, contracts, tours, bookings] = await Promise.all([
    db.supplier.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ preferred: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        preferred: true,
        country: true,
        city: true,
        defaultCurrency: true,
        services: {
          where: { isActive: true },
          orderBy: [
            { type: "asc" },
            { country: "asc" },
            { city: "asc" },
            { name: "asc" },
          ],
          select: {
            id: true,
            name: true,
            type: true,
            country: true,
            city: true,
            description: true,
            notes: true,
          },
        },
        rates: {
          where: { isActive: true },
          orderBy: [{ validTo: "desc" }, { name: "asc" }],
          select: {
            id: true,
            serviceId: true,
            name: true,
            description: true,
            validFrom: true,
            validTo: true,
            amount: true,
            currency: true,
            unit: true,
            roomType: true,
            mealBasis: true,
            minPax: true,
            maxPax: true,
            breakfastIncluded: true,
            dinnerIncluded: true,
            dinnerAmount: true,
            dinnerUnit: true,
            dinnerNotes: true,
            cityTaxIncluded: true,
            cityTaxAmount: true,
            cityTaxCurrency: true,
            cityTaxUnit: true,
            porterageAvailable: true,
            porterageIncluded: true,
            porterageAmount: true,
            porterageUnit: true,
            beveragePackageIncluded: true,
            beveragePackageDescription: true,
            beveragePackageAmount: true,
            beveragePackageUnit: true,
            beverageNotes: true,
            freePlaces: true,
            freePlaceRatio: true,
            freePlaceMax: true,
            freePlaceNotes: true,
            minimumRooms: true,
            minimumNights: true,
            rateRestrictions: true,
            supplements: true,
            reductions: true,
            singleSupplement: true,
            tripleReduction: true,
            childRate: true,
            extraBedRate: true,
            driverRoomIncluded: true,
            driverMealIncluded: true,
            guideRoomIncluded: true,
            guideMealIncluded: true,
            tourManagerRoomIncluded: true,
            tourManagerMealIncluded: true,
            cancellationTerms: true,
            paymentTerms: true,
            depositRequired: true,
            depositAmount: true,
            depositPercent: true,
            paymentDeadlineDays: true,
            rateSource: true,
            supplierReference: true,
            lastVerifiedAt: true,
            internalRateNotes: true,
            notes: true,
          },
        },
      },
    }),
    db.supplierContract.findMany({
      where: { status: "ACTIVE", supplier: { status: "ACTIVE" } },
      orderBy: [{ title: "asc" }, { version: "desc" }],
      select: {
        id: true,
        supplierId: true,
        title: true,
        reference: true,
        version: true,
        currency: true,
        paymentSchedule: {
          orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }],
          select: {
            id: true,
            label: true,
            paymentType: true,
            dueDate: true,
            amount: true,
            percent: true,
            warningDays: true,
            sortOrder: true,
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
          Record a supplier proforma, deposit invoice, final invoice or credit
          note. Epoch assigns the internal payable reference automatically.
        </p>
      </div>

      <SupplierPayableForm
        suppliers={suppliers.map((supplier) => ({
          ...supplier,
          contracts: contracts
            .filter((contract) => contract.supplierId === supplier.id)
            .map((contract) => ({
              ...contract,
              paymentSchedule: contract.paymentSchedule.map((installment) => ({
                ...installment,
                dueDate: installment.dueDate?.toISOString() ?? null,
                amount: installment.amount?.toString() ?? null,
                percent: installment.percent?.toString() ?? null,
              })),
            })),
          rates: supplier.rates.map((rate) => ({
            ...rate,
            amount: rate.amount.toString(),
            dinnerAmount: rate.dinnerAmount?.toString() ?? null,
            cityTaxAmount: rate.cityTaxAmount?.toString() ?? null,
            porterageAmount: rate.porterageAmount?.toString() ?? null,
            beveragePackageAmount: rate.beveragePackageAmount?.toString() ?? null,
            singleSupplement: rate.singleSupplement?.toString() ?? null,
            tripleReduction: rate.tripleReduction?.toString() ?? null,
            childRate: rate.childRate?.toString() ?? null,
            extraBedRate: rate.extraBedRate?.toString() ?? null,
            depositAmount: rate.depositAmount?.toString() ?? null,
            depositPercent: rate.depositPercent?.toString() ?? null,
            validFrom: rate.validFrom.toISOString(),
            validTo: rate.validTo.toISOString(),
            lastVerifiedAt: rate.lastVerifiedAt?.toISOString() ?? null,
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
