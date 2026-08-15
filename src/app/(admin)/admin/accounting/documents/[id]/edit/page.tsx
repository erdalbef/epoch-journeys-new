import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AccountingCategory,
  FinanceDocumentType,
} from "@prisma/client";
import {
  ArrowLeft,
  FileText,
  Save,
} from "lucide-react";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    year?: string;
    month?: string;
    category?: string;
  }>;
};

const accountingCategories = [
  {
    value: AccountingCategory.BANK_STATEMENTS,
    label: "01 – Bank Statements",
  },
  {
    value: AccountingCategory.SALES_INCOME,
    label: "02 – Sales / Income",
  },
  {
    value: AccountingCategory.EXPENSES_PURCHASES,
    label: "03 – Expenses / Purchases",
  },
  {
    value: AccountingCategory.CASH,
    label: "04 – Cash",
  },
  {
    value:
      AccountingCategory.EMPLOYEES_ACCOUNTABLE_PERSONS,
    label:
      "05 – Employees / Accountable Persons",
  },
  {
    value:
      AccountingCategory.OWNER_PERSONAL_PAYMENTS,
    label:
      "06 – Owner / Personal Payments",
  },
  {
    value: AccountingCategory.OTHER_DOCUMENTS,
    label: "07 – Other Documents",
  },
  {
    value:
      AccountingCategory.TRIP_GROUP_DOCUMENTATION,
    label:
      "08 – Trip / Group Documentation",
  },
];

const documentTypes = [
  {
    value:
      FinanceDocumentType.EXPENSE_RECEIPT,
    label: "Expense Receipt",
  },
  {
    value:
      FinanceDocumentType.EXPENSE_INVOICE,
    label: "Expense Invoice",
  },
  {
    value:
      FinanceDocumentType.SUPPLIER_INVOICE,
    label: "Supplier Invoice",
  },
  {
    value:
      FinanceDocumentType.SUPPLIER_CREDIT_NOTE,
    label: "Supplier Credit Note",
  },
  {
    value:
      FinanceDocumentType.SUPPLIER_PAYMENT_PROOF,
    label: "Supplier Payment Proof",
  },
  {
    value:
      FinanceDocumentType.CUSTOMER_PAYMENT_PROOF,
    label: "Customer Payment Proof",
  },
  {
    value:
      FinanceDocumentType.CUSTOMER_REFUND_PROOF,
    label: "Customer Refund Proof",
  },
  {
    value:
      FinanceDocumentType.BANK_TRANSFER_PROOF,
    label: "Bank Transfer Proof",
  },
  {
    value:
      FinanceDocumentType.TAX_DOCUMENT,
    label: "Tax Document",
  },
  {
    value:
      FinanceDocumentType.CONTRACT,
    label: "Contract",
  },
  {
    value:
      FinanceDocumentType.AGREEMENT,
    label: "Agreement",
  },
  {
    value:
      FinanceDocumentType.CREDIT_NOTE,
    label: "Credit Note",
  },
  {
    value:
      FinanceDocumentType.INVOICE,
    label: "Invoice",
  },
  {
    value:
      FinanceDocumentType.OTHER,
    label: "Other",
  },
];

const subcategories = [
  "Hotels / Accommodation",
  "Transport / Transfers",
  "Restaurants / Meals",
  "Tour Guides",
  "Excursions",
  "Entrance Fees",
  "Flights",
  "Insurance",
  "Customer Advances",
  "Customer Payments",
  "Credit Notes",
  "Cash Receipt",
  "Cash Payment",
  "Employee Travel Expense",
  "Employee-Paid Company Expense",
  "Expense Report / Settlement",
  "Owner-Paid Company Expense",
  "Owner Funds Provided",
  "Owner Reimbursement",
  "Contract",
  "Loan / Financing",
  "Insurance Document",
  "Tour Itinerary",
  "Booking Confirmation",
  "Voucher",
  "Rooming List",
  "Passenger List",
  "Other",
];

function dateInputValue(
  value: Date | null
) {
  if (!value) {
    return "";
  }

  return value
    .toISOString()
    .slice(0, 10);
}

function formatFileSize(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(
    kb / 1024
  ).toFixed(1)} MB`;
}

export default async function AccountingDocumentEditPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  const document =
    await db.financeDocument.findUnique({
      where: {
        id,
      },

      include: {
        accountingPeriod: true,
      },
    });

  if (!document) {
    notFound();
  }

  const [
    suppliers,
    tours,
    bookings,
    departures,
    bankAccounts,
  ] = await Promise.all([
    db.supplier.findMany({
      where: {
        status: "ACTIVE",
      },

      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
      },
    }),

    db.tour.findMany({
      orderBy: {
        title: "asc",
      },

      select: {
        id: true,
        title: true,
        tourCode: true,
      },
    }),

    db.booking.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 200,

      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        groupName: true,
      },
    }),

    db.departureDate.findMany({
      orderBy: {
        date: "desc",
      },

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

  const year =
    document.accountingPeriod?.year ??
    Number(query.year) ??
    new Date().getFullYear();

  const month =
    document.accountingPeriod?.month ??
    Number(query.month) ??
    new Date().getMonth() + 1;

  const returnCategory =
    document.accountingCategory ??
    query.category ??
    "";

  const returnHref =
    `/admin/accounting/${year}/${month}` +
    (returnCategory
      ? `?category=${encodeURIComponent(
          returnCategory
        )}`
      : "");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link
          href={returnHref}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#8B0000]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Monthly Accounting
        </Link>

        <div className="flex items-center gap-2 text-sm font-semibold text-[#8B0000]">
          <FileText className="h-4 w-4" />
          Accounting Document
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0B1F3A]">
          Edit Accounting Document
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Correct the accounting
          classification, document details,
          or related records. The uploaded
          file itself will remain unchanged.
        </p>
      </div>

      <section className="rounded-2xl border bg-slate-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Current File
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {document.originalFileName}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {formatFileSize(
                document.fileSize
              )}
              {" · "}
              {document.mimeType}
            </p>
          </div>

          <a
            href={document.storagePath}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1F3A] transition hover:bg-slate-100"
          >
            Open Current File
          </a>
        </div>
      </section>

      <form
        action={`/api/admin/accounting/documents/${document.id}`}
        method="POST"
        className="space-y-8"
      >
        <input
          type="hidden"
          name="_method"
          value="PATCH"
        />

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#0B1F3A]">
              Accounting Classification
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Moving the year or month will
              move this document to another
              monthly accounting period.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="year"
                className="text-sm font-semibold text-slate-800"
              >
                Accounting Year *
              </label>

              <input
                id="year"
                name="year"
                type="number"
                min="2000"
                max="2100"
                required
                defaultValue={year}
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="month"
                className="text-sm font-semibold text-slate-800"
              >
                Accounting Month *
              </label>

              <select
                id="month"
                name="month"
                required
                defaultValue={month}
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                {Array.from(
                  { length: 12 },
                  (_, index) => {
                    const monthNumber =
                      index + 1;

                    const monthName =
                      new Intl.DateTimeFormat(
                        "en-GB",
                        {
                          month: "long",
                        }
                      ).format(
                        new Date(
                          Date.UTC(
                            2026,
                            index,
                            1
                          )
                        )
                      );

                    return (
                      <option
                        key={monthNumber}
                        value={monthNumber}
                      >
                        {monthName}
                      </option>
                    );
                  }
                )}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="accountingCategory"
                className="text-sm font-semibold text-slate-800"
              >
                Accounting Category *
              </label>

              <select
                id="accountingCategory"
                name="accountingCategory"
                required
                defaultValue={
                  document.accountingCategory ??
                  AccountingCategory.OTHER_DOCUMENTS
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                {accountingCategories.map(
                  (category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="accountingSubcategory"
                className="text-sm font-semibold text-slate-800"
              >
                Subcategory
              </label>

              <input
                id="accountingSubcategory"
                name="accountingSubcategory"
                list="accounting-subcategories"
                defaultValue={
                  document.accountingSubcategory ??
                  ""
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />

              <datalist id="accounting-subcategories">
                {subcategories.map(
                  (subcategory) => (
                    <option
                      key={subcategory}
                      value={subcategory}
                    />
                  )
                )}
              </datalist>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#0B1F3A]">
              Document Details
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="title"
                className="text-sm font-semibold text-slate-800"
              >
                Document Title *
              </label>

              <input
                id="title"
                name="title"
                required
                defaultValue={
                  document.title
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className="text-sm font-semibold text-slate-800"
              >
                Document Type *
              </label>

              <select
                id="type"
                name="type"
                required
                defaultValue={
                  document.type
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                {documentTypes.map(
                  (type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="documentDate"
                className="text-sm font-semibold text-slate-800"
              >
                Document Date
              </label>

              <input
                id="documentDate"
                name="documentDate"
                type="date"
                defaultValue={dateInputValue(
                  document.documentDate
                )}
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="referenceNumber"
                className="text-sm font-semibold text-slate-800"
              >
                Invoice / Reference Number
              </label>

              <input
                id="referenceNumber"
                name="referenceNumber"
                defaultValue={
                  document.referenceNumber ??
                  ""
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="text-sm font-semibold text-slate-800"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={
                  document.description ??
                  ""
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="notes"
                className="text-sm font-semibold text-slate-800"
              >
                Internal Notes
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={
                  document.notes ??
                  ""
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#0B1F3A]">
              Related Records
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="supplierId"
                className="text-sm font-semibold text-slate-800"
              >
                Supplier
              </label>

              <select
                id="supplierId"
                name="supplierId"
                defaultValue={
                  document.supplierId ??
                  ""
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">
                  No supplier
                </option>

                {suppliers.map(
                  (supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="tourId"
                className="text-sm font-semibold text-slate-800"
              >
                Tour
              </label>

              <select
                id="tourId"
                name="tourId"
                defaultValue={
                  document.tourId ??
                  ""
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">
                  No tour
                </option>

                {tours.map((tour) => (
                  <option
                    key={tour.id}
                    value={tour.id}
                  >
                    {tour.tourCode
                      ? `${tour.tourCode} – `
                      : ""}
                    {tour.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="bookingId"
                className="text-sm font-semibold text-slate-800"
              >
                Booking / Group
              </label>

              <select
                id="bookingId"
                name="bookingId"
                defaultValue={
                  document.bookingId ??
                  ""
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">
                  No booking
                </option>

                {bookings.map(
                  (booking) => (
                    <option
                      key={booking.id}
                      value={booking.id}
                    >
                      {booking.bookingDisplayCode ??
                        booking.bookingReference}

                      {booking.groupName
                        ? ` – ${booking.groupName}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="departureDateId"
                className="text-sm font-semibold text-slate-800"
              >
                Departure
              </label>

              <select
                id="departureDateId"
                name="departureDateId"
                defaultValue={
                  document.departureDateId ??
                  ""
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">
                  No departure
                </option>

                {departures.map(
                  (departure) => (
                    <option
                      key={departure.id}
                      value={departure.id}
                    >
                      {new Intl.DateTimeFormat(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      ).format(
                        departure.date
                      )}
                      {" – "}
                      {
                        departure.tour
                          .title
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="bankAccountId"
                className="text-sm font-semibold text-slate-800"
              >
                Bank Account
              </label>

              <select
                id="bankAccountId"
                name="bankAccountId"
                defaultValue={
                  document.bankAccountId ??
                  ""
                }
                className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">
                  No bank account
                </option>

                {bankAccounts.map(
                  (account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.name} –{" "}
                      {account.currency}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={returnHref}
            className="inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}