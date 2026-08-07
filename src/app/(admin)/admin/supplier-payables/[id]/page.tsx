import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import SupplierPayableActions from "@/components/admin/supplier-payables/SupplierPayableActions";

type Props = {
  params: Promise<{ id: string }>;
};

function money(value: unknown, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function date(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(value)
    : "—";
}

export default async function SupplierPayableDetailPage({ params }: Props) {
  const { id } = await params;

  const [payable, bankAccounts] = await Promise.all([
    db.supplierPayable.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, type: true } },
        rate: { select: { id: true, name: true, unit: true } },
        tour: { select: { id: true, title: true } },
        departureDate: { select: { id: true, date: true } },
        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },
        createdBy: { select: { fullName: true, email: true } },
        approvedBy: { select: { fullName: true, email: true } },
        payments: {
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
          include: {
            bankAccount: { select: { name: true, currency: true } },
            recordedBy: { select: { fullName: true, email: true } },
          },
        },
      },
    }),
    db.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true },
    }),
  ]);

  if (!payable) notFound();

  const balance = Number(payable.balance);
  const paymentStatus =
    payable.approvalStatus === "APPROVED" &&
    balance > 0 &&
    payable.dueDate &&
    payable.dueDate < new Date()
      ? "OVERDUE"
      : payable.paymentStatus;

  return (
    <div className="mx-auto max-w-[1450px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link
          href="/admin/supplier-payables"
          className="text-sm font-semibold text-[#001F3F]"
        >
          ← Supplier Payables
        </Link>
      </div>

      <section className="rounded-3xl bg-[#001F3F] p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-200">
              Supplier payable
            </p>
            <h1 className="mt-2 text-3xl font-bold">{payable.title}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {payable.supplierNameSnapshot}
              {payable.supplierInvoiceNumber
                ? ` · Invoice ${payable.supplierInvoiceNumber}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge value={payable.approvalStatus} />
            <Badge value={paymentStatus} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Approved"
          value={money(payable.approvedAmount, payable.currency)}
        />
        <Metric
          label="Credit"
          value={money(payable.creditAmount, payable.currency)}
        />
        <Metric
          label="Paid"
          value={money(payable.amountPaid, payable.currency)}
        />
        <Metric
          label="Balance"
          value={money(payable.balance, payable.currency)}
          strong
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">Payable details</h2>
            <div className="mt-4 divide-y divide-slate-100 text-sm">
              <Row
                label="Supplier"
                value={
                  <Link
                    href={`/admin/suppliers/${payable.supplier.id}`}
                    className="font-semibold text-[#001F3F] hover:underline"
                  >
                    {payable.supplier.name}
                  </Link>
                }
              />
              <Row
                label="Service"
                value={payable.serviceNameSnapshot || payable.service?.name || "—"}
              />
              <Row
                label="Contracted rate"
                value={payable.rateNameSnapshot || payable.rate?.name || "—"}
              />
              <Row
                label="Contracted amount"
                value={
                  payable.contractedAmount
                    ? money(payable.contractedAmount, payable.currency)
                    : "—"
                }
              />
              <Row label="Invoice number" value={payable.supplierInvoiceNumber || "—"} />
              <Row label="Supplier reference" value={payable.supplierReference || "—"} />
              <Row label="Invoice date" value={date(payable.invoiceDate)} />
              <Row label="Due date" value={date(payable.dueDate)} />
              <Row
                label="Tour"
                value={
                  payable.tour ? (
                    <Link
                      href={`/admin/tours/${payable.tour.id}`}
                      className="font-medium text-[#001F3F] hover:underline"
                    >
                      {payable.tour.title}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label="Departure"
                value={payable.departureDate ? date(payable.departureDate.date) : "—"}
              />
              <Row
                label="Booking"
                value={
                  payable.booking ? (
                    <Link
                      href={`/admin/bookings/${payable.booking.id}`}
                      className="font-medium text-[#001F3F] hover:underline"
                    >
                      {payable.booking.bookingDisplayCode ||
                        payable.booking.bookingReference}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label="Created by"
                value={payable.createdBy?.fullName || payable.createdBy?.email || "—"}
              />
              <Row
                label="Approved by"
                value={payable.approvedBy?.fullName || payable.approvedBy?.email || "—"}
              />
            </div>

            {payable.description && (
              <TextBlock title="Description" value={payable.description} />
            )}
            {payable.internalNotes && (
              <TextBlock title="Internal notes" value={payable.internalNotes} />
            )}
            {payable.documentUrl && (
              <div className="mt-5">
                <a
                  href={payable.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[#8B0000] hover:underline"
                >
                  Open supplier document
                </a>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-950">Payment history</h2>
              <p className="text-sm text-slate-500">
                Every supplier payment is retained as a separate record.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {payable.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {money(payment.amount, payment.currency)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {date(payment.paymentDate)} ·{" "}
                      {payment.method.replaceAll("_", " ")}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {payment.bankAccount?.name || "No bank account selected"}
                      {" · "}
                      {payment.recordedBy?.fullName ||
                        payment.recordedBy?.email ||
                        "Admin"}
                    </p>
                  </div>
                </div>
              ))}

              {payable.payments.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  No supplier payments recorded yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <SupplierPayableActions
          payableId={payable.id}
          approvalStatus={payable.approvalStatus}
          paymentStatus={paymentStatus}
          balance={balance}
          currency={payable.currency}
          bankAccounts={bankAccounts}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold ${
          strong ? "text-[#8B0000]" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[180px_1fr]">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="mt-5 rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{value}</p>
    </div>
  );
}
