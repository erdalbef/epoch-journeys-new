import Link from "next/link";
import { redirect } from "next/navigation";
import { ExpenseCategory, ExpensePaymentStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const expenseCategories = Object.values(ExpenseCategory);
const paymentStatuses = Object.values(ExpensePaymentStatus);

export default async function AdminCreateExpensePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const [tours, bookings, departures] = await Promise.all([
    db.tour.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
      },
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
        tour: {
          select: {
            title: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">Add Expense</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add operational or supplier expenses and optionally upload a receipt.
          </p>
        </div>

        <Link
          href="/admin/finance/expenses"
          className="inline-flex rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
        >
          Back to Expenses
        </Link>
      </div>

      <form
        action="/api/admin/expenses"
        method="POST"
        encType="multipart/form-data"
        className="rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Title *
            </label>
            <input
              name="title"
              required
              placeholder="Hotel payment, guide invoice, transport cost..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Vendor Name
            </label>
            <input
              name="vendorName"
              placeholder="Hotel, transport company, guide..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Amount *
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

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Currency
            </label>
            <input
              name="currency"
              defaultValue="EUR"
              maxLength={3}
              className="w-full rounded-xl border px-4 py-2.5 text-sm uppercase outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Category *
            </label>
            <select
              name="category"
              required
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
              defaultValue="HOTEL"
            >
              {expenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Payment Status
            </label>
            <select
              name="paymentStatus"
              defaultValue="PENDING"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
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
                  {tour.title}
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

          <div className="md:col-span-2">
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

          <div className="md:col-span-2">
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

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              name="notes"
              rows={4}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
              placeholder="Internal notes"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Receipt / Invoice
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
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
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
      </form>
    </div>
  );
}