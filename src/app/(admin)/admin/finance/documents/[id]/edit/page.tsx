import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  AccountingCategory,
  FinanceDocumentType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function enumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

export default async function EditFinanceDocumentPage({
  params,
  searchParams,
}: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const { id } = await params;
  const query = (await searchParams) ?? {};

  const [
    document,
    expenses,
    supplierPayables,
    supplierPayablePayments,
    refunds,
    bookings,
    tours,
    departures,
    suppliers,
    bankAccounts,
    bankTransactions,
  ] = await Promise.all([
    db.financeDocument.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        originalFileName: true,
        documentDate: true,
        referenceNumber: true,
        notes: true,
        accountingCategory: true,
        expenseId: true,
        supplierPayableId: true,
        supplierPayablePaymentId: true,
        refundId: true,
        bankAccountId: true,
        bankTransactionId: true,
        bookingId: true,
        tourId: true,
        departureDateId: true,
        supplierId: true,
      },
    }),

    db.expense.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      select: {
        id: true,
        title: true,
        vendorName: true,
      },
    }),

    db.supplierPayable.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      select: {
        id: true,
        title: true,
        supplierNameSnapshot: true,
      },
    }),

    db.supplierPayablePayment.findMany({
      orderBy: { paymentDate: "desc" },
      take: 150,
      select: {
        id: true,
        paymentDate: true,
        reference: true,
        payable: {
          select: {
            title: true,
            supplierNameSnapshot: true,
          },
        },
      },
    }),

    db.refund.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      select: {
        id: true,
        amount: true,
        currency: true,
        booking: {
          select: {
            bookingReference: true,
            bookingDisplayCode: true,
          },
        },
      },
    }),

    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        tourTitleSnapshot: true,
      },
    }),

    db.tour.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        tourCode: true,
      },
    }),

    db.departureDate.findMany({
      orderBy: { date: "desc" },
      take: 200,
      select: {
        id: true,
        date: true,
        tour: {
          select: {
            title: true,
          },
        },
      },
    }),

    db.supplier.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
      },
    }),

    db.bankAccount.findMany({
      where: { isActive: true },
      orderBy: [{ currency: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        currency: true,
      },
    }),

    db.bankTransaction.findMany({
      orderBy: { transactionDate: "desc" },
      take: 200,
      select: {
        id: true,
        type: true,
        reference: true,
        description: true,
        transactionDate: true,
        bankAccountId: true,
        bankAccount: {
          select: {
            name: true,
            currency: true,
          },
        },
      },
    }),
  ]);

  if (!document) {
    notFound();
  }

  const accountingDestination =
    document.accountingCategory === AccountingCategory.OWNER_PERSONAL_PAYMENTS ||
    document.accountingCategory === AccountingCategory.TRIP_GROUP_DOCUMENTATION ||
    document.accountingCategory === AccountingCategory.OTHER_DOCUMENTS
      ? document.accountingCategory
      : AccountingCategory.OTHER_DOCUMENTS;

  return (
    <div className="mx-auto max-w-[1450px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Finance
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#001F3F]">
            Edit Accounting Document
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Update the document details, accounting destination, linked records,
            or replace the uploaded file.
          </p>
        </div>

        <Link
          href="/admin/finance/documents"
          className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#8B0000] hover:text-[#8B0000]"
        >
          ← Back to Finance Documents
        </Link>
      </div>

      {query.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {query.error}
        </div>
      ) : null}

      <form
        action={`/api/admin/finance/documents/${document.id}/edit`}
        method="POST"
        encType="multipart/form-data"
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Accounting Destination *">
            <select
              name="accountingCategory"
              defaultValue={accountingDestination}
              className={inputClass}
              required
            >
              <option value="OWNER_PERSONAL_PAYMENTS">
                06 - Owner / Personal Payments
              </option>
              <option value="OTHER_DOCUMENTS">07 - Other Documents</option>
              <option value="TRIP_GROUP_DOCUMENTATION">
                08 - Trip / Group Documentation
              </option>
            </select>
          </Field>

          <Field label="Document Type *">
            <select
              name="type"
              defaultValue={document.type}
              className={inputClass}
              required
            >
              {Object.values(FinanceDocumentType).map((type) => (
                <option key={type} value={type}>
                  {enumLabel(type)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Title *" className="xl:col-span-2">
            <input
              name="title"
              defaultValue={document.title}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Document Date">
            <input
              name="documentDate"
              type="date"
              defaultValue={dateInputValue(document.documentDate)}
              className={inputClass}
            />
          </Field>

          <Field label="Reference Number">
            <input
              name="referenceNumber"
              defaultValue={document.referenceNumber ?? ""}
              className={inputClass}
            />
          </Field>

          <Field label="Current File">
            <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
              {document.originalFileName}
            </div>
          </Field>

          <Field label="Replace File (optional)">
            <input
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Link to Finance / Operational Record
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Change any existing link only when necessary. Personal withdrawals
            can normally be linked to the relevant Bank Account and Bank Transaction.
          </p>

          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Expense">
              <select
                name="expenseId"
                defaultValue={document.expenseId ?? ""}
                className={inputClass}
              >
                <option value="">Not linked</option>
                {expenses.map((expense) => (
                  <option key={expense.id} value={expense.id}>
                    {expense.title}
                    {expense.vendorName ? ` · ${expense.vendorName}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Supplier Payable">
              <select
                name="supplierPayableId"
                defaultValue={document.supplierPayableId ?? ""}
                className={inputClass}
              >
                <option value="">Not linked</option>
                {supplierPayables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.supplierNameSnapshot} · {item.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Supplier Payment">
              <select
                name="supplierPayablePaymentId"
                defaultValue={document.supplierPayablePaymentId ?? ""}
                className={inputClass}
              >
                <option value="">Not linked</option>
                {supplierPayablePayments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.payable.supplierNameSnapshot} · {item.payable.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Refund">
              <select
                name="refundId"
                defaultValue={document.refundId ?? ""}
                className={inputClass}
              >
                <option value="">Not linked</option>
                {refunds.map((refund) => (
                  <option key={refund.id} value={refund.id}>
                    {refund.booking.bookingDisplayCode ||
                      refund.booking.bookingReference} · {refund.currency} {Number(refund.amount).toFixed(2)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Bank Account">
              <select
                name="bankAccountId"
                defaultValue={document.bankAccountId ?? ""}
                className={inputClass}
              >
                <option value="">Not linked</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.currency}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Bank Transaction">
              <select
                name="bankTransactionId"
                defaultValue={document.bankTransactionId ?? ""}
                className={inputClass}
              >
                <option value="">Not linked</option>
                {bankTransactions.map((transaction) => (
                  <option key={transaction.id} value={transaction.id}>
                    {transaction.bankAccount.name} · {enumLabel(transaction.type)} · {transaction.description || transaction.reference || dateInputValue(transaction.transactionDate)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Booking">
              <select
                name="bookingId"
                defaultValue={document.bookingId ?? ""}
                className={inputClass}
              >
                <option value="">Not linked</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.bookingDisplayCode || booking.bookingReference} · {booking.tourTitleSnapshot}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tour">
              <select
                name="tourId"
                defaultValue={document.tourId ?? ""}
                className={inputClass}
              >
                <option value="">Not linked</option>
                {tours.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.tourCode ? `${tour.tourCode} · ` : ""}{tour.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Departure">
              <select
                name="departureDateId"
                defaultValue={document.departureDateId ?? ""}
                className={inputClass}
              >
                <option value="">Not linked</option>
                {departures.map((departure) => (
                  <option key={departure.id} value={departure.id}>
                    {departure.tour.title} · {dateInputValue(departure.date)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Supplier">
              <select
                name="supplierId"
                defaultValue={document.supplierId ?? ""}
                className={inputClass}
              >
                <option value="">Not linked</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} · {enumLabel(supplier.type)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Description">
            <textarea
              name="description"
              defaultValue={document.description ?? ""}
              rows={3}
              className={textareaClass}
            />
          </Field>

          <Field label="Internal Notes">
            <textarea
              name="notes"
              defaultValue={document.notes ?? ""}
              rows={3}
              className={textareaClass}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6f0000]"
          >
            Save Changes
          </button>

          <Link
            href="/admin/finance/documents"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
