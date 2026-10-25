import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import SupplierPayableActions from "@/components/admin/supplier-payables/SupplierPayableActions";
import SupplierDocumentDeleteButton from "@/components/admin/supplier-payables/SupplierDocumentDeleteButton";

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
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(value)
    : "—";
}

export default async function SupplierPayableDetailPage({ params }: Props) {
  const { id } = await params;

  const [payable, bankAccounts] = await Promise.all([
    db.supplierPayable.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        contract: {
          select: {
            id: true,
            title: true,
            reference: true,
            version: true,
            currency: true,
            status: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        rate: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
        tour: {
          select: {
            id: true,
            title: true,
          },
        },
        departureDate: {
          select: {
            id: true,
            date: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },
        createdBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
        documents: {
          where: {
            supplierPayablePaymentId: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            title: true,
            originalFileName: true,
            documentDate: true,
            createdAt: true,
            accountingSubcategory: true,
          },
        },
        payments: {
          orderBy: [
            { paymentDate: "desc" },
            { createdAt: "desc" },
          ],
          include: {
            contractPaymentSchedule: {
              select: {
                id: true,
                label: true,
                dueDate: true,
                contract: { select: { id: true, title: true } },
              },
            },
            bankAccount: {
              select: {
                name: true,
                currency: true,
              },
            },
            recordedBy: {
              select: {
                fullName: true,
                email: true,
              },
            },
            documents: {
              where: {
                type: "SUPPLIER_PAYMENT_PROOF",
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                originalFileName: true,
              },
            },
          },
        },
      },
    }),

    db.bankAccount.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    }),
  ]);

  if (!payable) {
    notFound();
  }

  // Show and offer only installments belonging to this payable's linked contract.
  // Payments from other payables linked to the same installment still count.
  // Unlinked payables have no eligible contract installments.
  const contractSchedules = await db.supplierContractPaymentSchedule.findMany({
    where: { contractId: payable.contractId ?? "__NO_LINKED_CONTRACT__" },
    orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      label: true,
      paymentType: true,
      dueDate: true,
      amount: true,
      percent: true,
      contract: {
        select: {
          id: true,
          title: true,
          reference: true,
          currency: true,
          status: true,
        },
      },
      supplierPayablePayments: {
        select: { amount: true, currency: true },
      },
    },
  });

  const schedules = contractSchedules.map((schedule) => {
    const currency = schedule.contract.currency || payable.currency;
    const currencyMatches = currency === payable.currency;
    const paid = schedule.supplierPayablePayments
      .filter((payment) => payment.currency === currency)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const required = schedule.amount === null ? null : Number(schedule.amount);
    const remaining = required === null ? null : Math.max(0, required - paid);
    const status = !currencyMatches
      ? "Different currency"
      : required === null
        ? "Amount not defined"
        : remaining !== null && remaining <= 0
          ? "Paid"
          : paid > 0
            ? "Partially paid"
            : "Unpaid";
    return {
      id: schedule.id,
      label: schedule.label,
      paymentType: schedule.paymentType,
      dueDate: schedule.dueDate,
      contract: schedule.contract,
      currency,
      paid,
      required,
      remaining,
      percent: schedule.percent === null ? null : Number(schedule.percent),
      status,
    };
  });

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
              {payable.documentType
                .replaceAll("_", " ")
                .toLowerCase()
                .replace(/\b\w/g, (value) => value.toUpperCase())}
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {payable.title}
            </h1>

            <p className="mt-2 text-sm text-slate-300">
              {payable.supplierNameSnapshot}
              {payable.supplierInvoiceNumber
                ? ` · ${payable.supplierInvoiceNumber}`
                : ""}
              {payable.internalReference
                ? ` · ${payable.internalReference}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge value={payable.approvalStatus} />
            <Badge value={paymentStatus} />

            {payable.approvalStatus !== "CANCELLED" ? (
              <Link
                href={`/admin/supplier-payables/${payable.id}/edit`}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#001F3F] transition hover:bg-slate-100"
              >
                Edit Payable
              </Link>
            ) : null}
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
            <h2 className="text-lg font-bold text-slate-950">
              Payable details
            </h2>

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
                label="Linked contract"
                value={
                  payable.contract ? (
                    <span>
                      {payable.contract.title}
                      {payable.contract.reference
                        ? ` · ${payable.contract.reference}`
                        : ""}
                      {` · Version ${payable.contract.version}`}
                      {payable.contract.currency
                        ? ` · ${payable.contract.currency}`
                        : ""}
                    </span>
                  ) : (
                    "Not linked to a contract"
                  )
                }
              />

              <Row
                label="Service"
                value={
                  payable.serviceNameSnapshot ||
                  payable.service?.name ||
                  "—"
                }
              />

              <Row
                label="Contracted rate"
                value={
                  payable.rateNameSnapshot ||
                  payable.rate?.name ||
                  "—"
                }
              />

              <Row
                label="Contracted amount"
                value={
                  payable.contractedAmount
                    ? money(
                        payable.contractedAmount,
                        payable.currency,
                      )
                    : "—"
                }
              />

              <Row
                label="Document type"
                value={payable.documentType
                  .replaceAll("_", " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (value) =>
                    value.toUpperCase(),
                  )}
              />

              <Row
                label="Agency / Parish / Group"
                value={payable.agencyGroupName || "—"}
              />

              <Row
                label="Epoch internal reference"
                value={payable.internalReference || "—"}
              />

              <Row
                label="Supplier document number"
                value={payable.supplierInvoiceNumber || "—"}
              />

              <Row
                label="Supplier reference"
                value={payable.supplierReference || "—"}
              />

              <Row
                label="Document date"
                value={date(payable.invoiceDate)}
              />

              <Row
                label="Due date"
                value={date(payable.dueDate)}
              />

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
                value={
                  payable.departureDate
                    ? date(payable.departureDate.date)
                    : "—"
                }
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
                value={
                  payable.createdBy?.fullName ||
                  payable.createdBy?.email ||
                  "—"
                }
              />

              <Row
                label="Approved by"
                value={
                  payable.approvedBy?.fullName ||
                  payable.approvedBy?.email ||
                  "—"
                }
              />
            </div>

            {payable.description ? (
              <TextBlock
                title="Description"
                value={payable.description}
              />
            ) : null}

            {payable.internalNotes ? (
              <TextBlock
                title="Internal notes"
                value={payable.internalNotes}
              />
            ) : null}

          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-950">
                Supplier documents
              </h2>

              <p className="text-sm text-slate-500">
                Deposit invoices, final invoices and other supplier documents are retained for the audit trail.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {payable.documents.map((document, index) => (
                <div
                  key={document.id}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">
                        {document.originalFileName}
                      </p>

                      {index === 0 ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          Current
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          Previous
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {document.title}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {date(document.documentDate || document.createdAt)}
                      {document.accountingSubcategory
                        ? ` · ${document.accountingSubcategory}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start gap-2">
                    <a
                      href={`/api/admin/finance/documents/${document.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50"
                    >
                      View Document
                    </a>

                    <SupplierDocumentDeleteButton
                      documentId={document.id}
                      fileName={document.originalFileName}
                      compact
                    />
                  </div>
                </div>
              ))}

              {payable.documents.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  No supplier document is attached to this payable.
                </div>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-950">Contract payment schedule</h2>
              <p className="mt-1 text-sm text-slate-500">
                Scheduled installments for this payable&apos;s linked contract. Paid totals include
                linked payments from all payables, not only this invoice.
                Payments without an installment link are not allocated automatically.
              </p>
            </div>
            {schedules.length ? (
              <div className="divide-y divide-slate-100">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{schedule.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {schedule.contract.title}
                          {schedule.contract.reference ? ` · ${schedule.contract.reference}` : ""}
                          {` · ${schedule.paymentType.replaceAll("_", " ")}`}
                          {` · Due ${date(schedule.dueDate)}`}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {schedule.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
                      <span>Required: {schedule.required === null
                        ? schedule.percent === null ? "Not specified" : `${schedule.percent}% (amount not specified)`
                        : money(schedule.required, schedule.currency)}</span>
                      <span>Linked paid: {money(schedule.paid, schedule.currency)}</span>
                      <span>Remaining: {schedule.remaining === null
                        ? "Not calculated"
                        : money(schedule.remaining, schedule.currency)}</span>
                    </div>
                    {schedule.currency !== payable.currency ? (
                      <p className="mt-2 text-xs text-amber-700">
                        Contract currency differs from this payable; do not allocate this payable to this schedule.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">
                {payable.contractId
                  ? "No payment installments have been recorded for the linked contract."
                  : "This payable is not linked to a supplier contract."}
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-950">
                Payment history
              </h2>

              <p className="text-sm text-slate-500">
                Every supplier payment is retained as a separate
                record and can be corrected when necessary.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {payable.payments.map((payment) => {
                const proof =
                  payment.documents[0] ?? null;

                return (
                  <div
                    key={payment.id}
                    className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {money(
                          payment.amount,
                          payment.currency,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {date(payment.paymentDate)} ·{" "}
                        {payment.method.replaceAll("_", " ")}
                        {payment.reference
                          ? ` · ${payment.reference}`
                          : ""}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {payment.bankAccount?.name ||
                          "No bank account selected"}
                        {" · "}
                        {payment.recordedBy?.fullName ||
                          payment.recordedBy?.email ||
                          "Admin"}
                      </p>

                      {payment.contractPaymentSchedule ? (
                        <p className="mt-2 text-xs font-medium text-blue-700">
                          Contract installment: {payment.contractPaymentSchedule.label}
                          {` · ${payment.contractPaymentSchedule.contract.title}`}
                        </p>
                      ) : null}

                      {proof ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Proof: {proof.originalFileName}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          No payment proof attached
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-start gap-2">
                      {proof ? (
                        <a
                          href={`/api/admin/finance/documents/${proof.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#001F3F] hover:bg-slate-50"
                        >
                          View Proof
                        </a>
                      ) : null}

                      <Link
                        href={`/admin/supplier-payables/${payable.id}/payments/${payment.id}/edit`}
                        className="rounded-lg bg-[#001F3F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#00172f]"
                      >
                        Edit Payment
                      </Link>
                    </div>
                  </div>
                );
              })}

              {payable.payments.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  No supplier payments recorded yet.
                </div>
              ) : null}
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
          contractInstallments={schedules.map((schedule) => ({
            id: schedule.id,
            label: schedule.label,
            contractTitle: schedule.contract.title,
            contractReference: schedule.contract.reference,
            dueDate: schedule.dueDate.toISOString(),
            currency: schedule.currency,
            required: schedule.required,
            paid: schedule.paid,
            remaining: schedule.remaining,
            status: schedule.status,
          }))}
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
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          strong
            ? "text-[#8B0000]"
            : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Badge({
  value,
}: {
  value: string;
}) {
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
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}

function TextBlock({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="mt-5 rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">
        {title}
      </p>

      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
        {value}
      </p>
    </div>
  );
}
