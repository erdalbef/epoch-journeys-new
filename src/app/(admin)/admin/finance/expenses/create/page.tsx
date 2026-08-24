import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExpenseApprovalStatus,
  ExpenseCategory,
  ExpenseCostType,
  ExpensePaymentStatus,
  FinanceSourceType,
  FinanceTaxType,
  Role,
} from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import CreateExpenseForm from "./CreateExpenseForm";

function formatEnumLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function AdminCreateExpensePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const [tours, bookings, departures, partnerCompanies, bankAccounts] = await Promise.all([
    db.tour.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, tourCode: true },
    }),

    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        bookingDisplayCode: true,
        bookingReference: true,
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
        tour: { select: { title: true } },
      },
    }),

    db.partnerCompany.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),

    db.bankAccount.findMany({
      where: {
        isActive: true,
        currency: "EUR",
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        currency: true,
        currentBalance: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">
            Add Expense
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Record an additional or exceptional expense that is not already in
            Supplier Payables.
          </p>
        </div>

        <Link
          href="/admin/finance/expenses"
          className="inline-flex rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
        >
          Back to Additional Expenses
        </Link>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <strong>Before saving:</strong> if this is a normal contracted supplier
        cost such as a hotel, bus / transportation, tour manager, local guide,
        audio / whisper set, restaurant / meal, entrance fee / ticket, local
        operator or another contracted supplier, use{" "}
        <Link
          href="/admin/supplier-payables"
          className="font-semibold underline"
        >
          Supplier Payables
        </Link>{" "}
        instead. This prevents the same cost from being counted twice.
      </div>

      <CreateExpenseForm>
        <input type="hidden" name="direction" value="EXPENSE" />

        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Main Expense Information
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Source Type *
                </label>
                <select
                  name="sourceType"
                  defaultValue="INTERNAL"
                  required
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(FinanceSourceType).map((item) => (
                    <option key={item} value={item}>
                      {formatEnumLabel(item)}
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
                  defaultValue={Object.values(ExpenseCategory)[0]}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(ExpenseCategory).map((item) => (
                    <option key={item} value={item}>
                      {formatEnumLabel(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Cost Type *
                </label>
                <select
                  name="costType"
                  defaultValue={ExpenseCostType.OVERHEAD}
                  required
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(ExpenseCostType).map((item) => (
                    <option key={item} value={item}>
                      {formatEnumLabel(item)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  DIRECT TOUR COST affects departure profitability and must be
                  linked to a departure. Use it only for a cost not already in
                  Supplier Payables.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Approval Status *
                </label>
                <select
                  name="approvalStatus"
                  defaultValue={ExpenseApprovalStatus.DRAFT}
                  required
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(ExpenseApprovalStatus).map((item) => (
                    <option key={item} value={item}>
                      {formatEnumLabel(item)}
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
                  placeholder="Bank fee, staff expense, local cash expense..."
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Vendor / Payee
                </label>
                <input
                  name="vendorName"
                  placeholder="Bank, employee, authority, local vendor..."
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Payment Status
                </label>
                <select
                  name="paymentStatus"
                  defaultValue={ExpensePaymentStatus.PENDING}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(ExpensePaymentStatus).map((item) => (
                    <option key={item} value={item}>
                      {formatEnumLabel(item)}
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
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Paid From Bank Account
                </label>
                <select
                  name="bankAccountId"
                  defaultValue=""
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  <option value="">Select bank account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} — {account.currency} — Balance{" "}
                      {new Intl.NumberFormat("en-GB", {
                        style: "currency",
                        currency: account.currency,
                      }).format(account.currentBalance)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Required when Payment Status is PAID. The payment will be
                  posted automatically to the Finance Ledger as Money Out.
                </p>
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
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>
              <input type="hidden" name="currency" value="EUR" />
              <div className="md:col-span-2 rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
                Additional expenses are currently stored and reported in EUR.
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
                  placeholder="Agent or travel advisor name"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Partner Company Name
                </label>
                <input
                  name="partnerCompanyName"
                  placeholder="Partner company name"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Client Company
                </label>
                <input
                  name="clientCompanyName"
                  placeholder="CTS, Corporate Travel, etc."
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Spender / Cash Holder
                </label>
                <input
                  name="spenderName"
                  placeholder="Erdal, staff member, guide..."
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tour Category
                </label>
                <input
                  name="tourCategoryName"
                  placeholder="Pilgrimage, Cultural, Cruise..."
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Partner Company Record
                </label>
                <select
                  name="partnerCompanyId"
                  defaultValue=""
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
                  placeholder="Partner package or operation name"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tour Leader Name
                </label>
                <input
                  name="tourLeaderName"
                  placeholder="Group leader / priest / tour leader"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Group Name
                </label>
                <input
                  name="groupName"
                  placeholder="Group name"
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
                  defaultValue=""
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  <option value="">Not linked</option>
                  {tours.map((tour) => (
                    <option key={tour.id} value={tour.id}>
                      {tour.tourCode ? `${tour.tourCode} — ${tour.title}` : tour.title}
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
                  defaultValue=""
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  <option value="">Not linked</option>
                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {(booking.bookingDisplayCode || booking.bookingReference) +
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
                  defaultValue=""
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
                  defaultValue={FinanceTaxType.NONE}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                >
                  {Object.values(FinanceTaxType).map((item) => (
                    <option key={item} value={item}>
                      {formatEnumLabel(item)}
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
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Receipt / Invoice
            </h2>
            <div className="grid gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Upload Receipt / Invoice
                </label>
                <input
                  name="receipt"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="block w-full rounded-xl border px-4 py-2.5 text-sm"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Allowed: PDF, JPG, PNG, WEBP. Max file size: 10MB.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Receipt / Invoice URL
                </label>
                <input
                  name="receiptUrl"
                  placeholder="/uploads/expenses/invoice.pdf"
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
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Internal Notes
                </label>
                <textarea
                  name="notes"
                  rows={4}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
                  placeholder="Internal finance notes"
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
            Save Expense
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
