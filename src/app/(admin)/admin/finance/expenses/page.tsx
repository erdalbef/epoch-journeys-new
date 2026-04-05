import Link from "next/link";
import { redirect } from "next/navigation";
import { ExpenseCategory, ExpensePaymentStatus, Prisma, Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/payments/formatCurrency";

type SearchParams = {
  category?: string;
  status?: string;
  q?: string;
  from?: string;
  to?: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status: ExpensePaymentStatus) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function AdminExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = (await searchParams) ?? {};

  const q = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";

  const where: Prisma.ExpenseWhereInput = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { vendorName: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category &&
    Object.values(ExpenseCategory).includes(category as ExpenseCategory)
      ? { category: category as ExpenseCategory }
      : {}),
    ...(status &&
    Object.values(ExpensePaymentStatus).includes(status as ExpensePaymentStatus)
      ? { paymentStatus: status as ExpensePaymentStatus }
      : {}),
    ...(from || to
      ? {
          expenseDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const expenses = await db.expense.findMany({
    where,
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    include: {
      booking: {
        select: {
          id: true,
          bookingDisplayCode: true,
          bookingReference: true,
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
      createdBy: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const paidExpenses = expenses
    .filter((item) => item.paymentStatus === "PAID")
    .reduce((sum, item) => sum + item.amount, 0);
  const pendingExpenses = expenses
    .filter((item) => item.paymentStatus === "PENDING")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track supplier, operational, and internal business expenses.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/finance"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Back to Finance
          </Link>

          <Link
            href="/admin/finance/expenses/create"
            className="rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Add Expense
          </Link>
        </div>
      </div>

      <form className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Title, vendor, notes..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              name="category"
              defaultValue={category}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">All</option>
              {Object.values(ExpenseCategory).map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">All</option>
              {Object.values(ExpensePaymentStatus).map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              From
            </label>
            <input
              name="from"
              type="date"
              defaultValue={from}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              To
            </label>
            <input
              name="to"
              type="date"
              defaultValue={to}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-[#001F3F] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Apply Filters
          </button>

          <Link
            href="/admin/finance/expenses"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Total Expenses</div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {formatCurrency(totalExpenses)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Paid</div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(paidExpenses)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(pendingExpenses)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-300 text-sm">
          <thead className="bg-slate-100">
            <tr className="text-slate-700">
              <th className="p-3 text-left font-semibold">Date</th>
              <th className="p-3 text-left font-semibold">Title</th>
              <th className="p-3 text-left font-semibold">Vendor</th>
              <th className="p-3 text-left font-semibold">Category</th>
              <th className="p-3 text-left font-semibold">Status</th>
              <th className="p-3 text-right font-semibold">Amount</th>
              <th className="p-3 text-left font-semibold">Tour</th>
              <th className="p-3 text-left font-semibold">Booking</th>
              <th className="p-3 text-left font-semibold">Departure</th>
              <th className="p-3 text-left font-semibold">Receipt</th>
            </tr>
          </thead>

          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-muted-foreground">
                  No expenses found.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="border-t hover:bg-slate-50">
                  <td className="p-3">{formatDate(expense.expenseDate)}</td>

                  <td className="p-3">
                    <div className="font-medium text-slate-900">{expense.title}</div>
                    {expense.description ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {expense.description}
                      </div>
                    ) : null}
                  </td>

                  <td className="p-3">{expense.vendorName || "-"}</td>

                  <td className="p-3">
                    {expense.category.replaceAll("_", " ")}
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                        expense.paymentStatus
                      )}`}
                    >
                      {expense.paymentStatus.replaceAll("_", " ")}
                    </span>
                  </td>

                  <td className="p-3 text-right font-medium">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>

                  <td className="p-3">{expense.tour?.title || "-"}</td>

                  <td className="p-3">
                    {expense.booking
                      ? expense.booking.bookingDisplayCode || expense.booking.bookingReference
                      : "-"}
                  </td>

                  <td className="p-3">
                    {expense.departureDate
                      ? formatDate(expense.departureDate.date)
                      : "-"}
                  </td>

                  <td className="p-3">
                    {expense.receiptUrl ? (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#001F3F] hover:text-[#8B0000]"
                      >
                        View
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {expenses.length > 0 ? (
            <tfoot className="bg-slate-50 font-semibold">
              <tr className="border-t">
                <td className="p-3" colSpan={5}>
                  Totals
                </td>
                <td className="p-3 text-right">{formatCurrency(totalExpenses)}</td>
                <td className="p-3" colSpan={4} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}