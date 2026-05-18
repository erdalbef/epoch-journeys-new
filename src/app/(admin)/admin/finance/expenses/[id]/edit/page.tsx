import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ExpenseCategory,
  ExpensePaymentStatus,
  FinanceDirection,
  FinanceSourceType,
  FinanceTaxType,
  Role,
} from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import CreateExpenseForm from "../../create/CreateExpenseForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatEnumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toDateInputValue(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().split("T")[0];
}

export default async function EditExpensePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const { id } = await params;

  const expense = await db.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    notFound();
  }

  const [tours, bookings, departures, partnerCompanies] = await Promise.all([
    db.tour.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        tourCode: true,
      },
    }),

    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        agentNameSnapshot: true,
        tourTitleSnapshot: true,
      },
    }),

    db.departureDate.findMany({
      orderBy: { date: "desc" },
      take: 100,
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

    db.partnerCompany.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">
            Edit Finance Entry
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Update finance, currency, tax, partner, and operation information.
          </p>
        </div>

        <Link
          href="/admin/finance/expenses"
          className="inline-flex rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
        >
          Back to Finance Entries
        </Link>
      </div>

      <CreateExpenseForm>
        <input type="hidden" name="_method" value="PATCH" />
        <input type="hidden" name="expenseId" value={expense.id} />

        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Main Finance Information
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Direction *
                </label>

                <select
                  name="direction"
                  required
                  defaultValue={expense.direction}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(FinanceDirection).map((direction) => (
                    <option key={direction} value={direction}>
                      {formatEnumLabel(direction)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Source Type *
                </label>

                <select
                  name="sourceType"
                  required
                  defaultValue={expense.sourceType}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(FinanceSourceType).map((sourceType) => (
                    <option key={sourceType} value={sourceType}>
                      {formatEnumLabel(sourceType)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Category *
                </label>

                <select
                  name="category"
                  required
                  defaultValue={expense.category}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(ExpenseCategory).map((category) => (
                    <option key={category} value={category}>
                      {formatEnumLabel(category)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Title *
                </label>

                <input
                  name="title"
                  required
                  defaultValue={expense.title}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Vendor / Supplier / Payer
                </label>

                <input
                  name="vendorName"
                  defaultValue={expense.vendorName || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Payment Status
                </label>

                <select
                  name="paymentStatus"
                  defaultValue={expense.paymentStatus}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(ExpensePaymentStatus).map((status) => (
                    <option key={status} value={status}>
                      {formatEnumLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Expense Date *
                </label>

                <input
                  name="expenseDate"
                  type="date"
                  required
                  defaultValue={toDateInputValue(expense.expenseDate)}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Paid At
                </label>

                <input
                  name="paidAt"
                  type="date"
                  defaultValue={toDateInputValue(expense.paidAt)}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>
            </div>
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Amount
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Amount (EUR) *
                </label>

                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={expense.amount}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <input
                type="hidden"
                name="currency"
                value="EUR"
              />

              <div className="md:col-span-2 rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
                All finance entries are stored and reported in EUR.
              </div>
            </div>
          </section>
                    
          <section>
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Operation / Partner Summary
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Agent / Travel Advisor
                </label>

                <input
                  name="agentNameSnapshot"
                  defaultValue={expense.agentNameSnapshot || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Partner Company Name
                </label>

                <input
                  name="partnerCompanyName"
                  defaultValue={expense.partnerCompanyName || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Partner Company Record
                </label>

                <select
                  name="partnerCompanyId"
                  defaultValue={expense.partnerCompanyId || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  <option value="">Not linked</option>

                  {partnerCompanies.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Custom Package Name
                </label>

                <input
                  name="customPackageName"
                  defaultValue={expense.customPackageName || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tour Leader Name
                </label>

                <input
                  name="tourLeaderName"
                  defaultValue={expense.tourLeaderName || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Group Name
                </label>

                <input
                  name="groupName"
                  defaultValue={expense.groupName || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Links
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Link to Tour
                </label>

                <select
                  name="tourId"
                  defaultValue={expense.tourId || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  <option value="">Not linked</option>

                  {tours.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.tourCode
                        ? `${tour.tourCode} — ${tour.title}`
                        : tour.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Link to Booking
                </label>

                <select
                  name="bookingId"
                  defaultValue={expense.bookingId || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  <option value="">Not linked</option>

                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {(booking.bookingDisplayCode ||
                        booking.bookingReference) +
                        " — " +
                        (booking.tourTitleSnapshot || "Untitled Tour") +
                        " — " +
                        (booking.agentNameSnapshot || "No Agent")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Link to Departure
                </label>

                <select
                  name="departureDateId"
                  defaultValue={expense.departureDateId || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  <option value="">Not linked</option>

                  {departures.map((departure) => (
                    <option key={departure.id} value={departure.id}>
                      {departure.tour.title} —{" "}
                      {new Date(departure.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Tax / VAT
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tax Type
                </label>

                <select
                  name="taxType"
                  defaultValue={expense.taxType}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(FinanceTaxType).map((taxType) => (
                    <option key={taxType} value={taxType}>
                      {formatEnumLabel(taxType)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tax Rate %
                </label>

                <input
                  name="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={expense.taxRate || 0}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tax Amount
                </label>

                <input
                  name="taxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={expense.taxAmount || 0}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Net Amount
                </label>

                <input
                  name="netAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={expense.netAmount || 0}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Gross Amount
                </label>

                <input
                  name="grossAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={expense.grossAmount || 0}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Notes
            </h2>

            <div className="grid gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  rows={3}
                  defaultValue={expense.description || ""}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Internal Notes
                </label>

                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={expense.notes || ""}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Receipt / Invoice URL
                </label>

                <input
                  name="receiptUrl"
                  defaultValue={expense.receiptUrl || ""}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Update Finance Entry
          </button>

          <Link
            href="/admin/finance/expenses"
            className="rounded-xl border px-5 py-2.5 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Cancel
          </Link>
        </div>
      </CreateExpenseForm>
    </div>
  );
}