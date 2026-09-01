import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import EditSupplierPayableForm from "@/components/admin/supplier-payables/EditSupplierPayableForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SupplierPayableEditPage({ params }: Props) {
  const { id } = await params;

  const [payable, suppliers, tours, bookings] = await Promise.all([
    db.supplierPayable.findUnique({
      where: { id },
      select: {
        id: true,
        supplierId: true,
        serviceId: true,
        rateId: true,
        tourId: true,
        departureDateId: true,
        bookingId: true,
        documentType: true,
        title: true,
        description: true,
        agencyGroupName: true,
        supplierInvoiceNumber: true,
        supplierReference: true,
        invoiceDate: true,
        dueDate: true,
        currency: true,
        contractedAmount: true,
        approvedAmount: true,
        creditAmount: true,
        amountPaid: true,
        internalNotes: true,
        approvalStatus: true,
        documents: {
          where: {
            supplierPayablePaymentId: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            originalFileName: true,
            storagePath: true,
          },
        },
      },
    }),

    db.supplier.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        defaultCurrency: true,
        services: {
          where: {
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        rates: {
          where: {
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
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
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        title: true,
        departureDates: {
          orderBy: {
            date: "desc",
          },
          select: {
            id: true,
            date: true,
          },
        },
      },
    }),

    db.booking.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 300,
      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        tourTitleSnapshot: true,
      },
    }),
  ]);

  if (!payable) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={`/admin/supplier-payables/${payable.id}`}
            className="text-sm font-semibold text-[#001F3F] hover:underline"
          >
            ← Back to Payable
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-[#001F3F]">
            Edit Supplier Payable
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Correct supplier invoice details, amounts, operational links and the uploaded document.
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          Status: {payable.approvalStatus.replaceAll("_", " ")}
        </div>
      </div>

      <EditSupplierPayableForm
        payable={{
          id: payable.id,
          supplierId: payable.supplierId,
          serviceId: payable.serviceId,
          rateId: payable.rateId,
          tourId: payable.tourId,
          departureDateId: payable.departureDateId,
          bookingId: payable.bookingId,
          documentType: payable.documentType,
          title: payable.title,
          description: payable.description,
          agencyGroupName: payable.agencyGroupName,
          supplierInvoiceNumber: payable.supplierInvoiceNumber,
          supplierReference: payable.supplierReference,
          invoiceDate: payable.invoiceDate?.toISOString() ?? null,
          dueDate: payable.dueDate?.toISOString() ?? null,
          currency: payable.currency,
          contractedAmount: payable.contractedAmount?.toString() ?? null,
          approvedAmount: payable.approvedAmount.toString(),
          creditAmount: payable.creditAmount.toString(),
          amountPaid: payable.amountPaid.toString(),
          internalNotes: payable.internalNotes,
          approvalStatus: payable.approvalStatus,
          document: payable.documents[0] ?? null,
        }}
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
