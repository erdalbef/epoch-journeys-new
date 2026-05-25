import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExpenseCategory,
  ExpensePaymentStatus,
  FinanceDirection,
  FinanceSourceType,
  Prisma,
  Role,
} from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/payments/formatCurrency";
import DeleteExpenseButton from "@/components/admin/finance/DeleteExpenseButton";

type SearchParams = {
  q?: string;
  category?: string;
  status?: string;
  direction?: string;
  sourceType?: string;
  from?: string;
  to?: string;
  page?: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "-";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function getDirectionClass(direction: FinanceDirection) {
  switch (direction) {
    case "INCOME":
      return "bg-green-100 text-green-700";
    case "EXPENSE":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function AdminFinanceEntriesPage({
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
  const direction = params.direction?.trim() ?? "";
  const sourceType = params.sourceType?.trim() ?? "";
  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";

  const currentPage = Math.max(1, Number(params.page || "1"));
  const pageSize = 10;
  const skip = (currentPage - 1) * pageSize;

  const searchConditions: Prisma.ExpenseWhereInput[] = q
    ? [
        { title: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { vendorName: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { notes: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { agentNameSnapshot: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { partnerCompanyName: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { tourLeaderName: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { customPackageName: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { groupName: { contains: q, mode: Prisma.QueryMode.insensitive } },
        {
          tour: {
            title: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          tour: {
            tourCode: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
      ]
    : [];

  const where: Prisma.ExpenseWhereInput = {
    ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),

    ...(category &&
    Object.values(ExpenseCategory).includes(category as ExpenseCategory)
      ? { category: category as ExpenseCategory }
      : {}),

    ...(status &&
    Object.values(ExpensePaymentStatus).includes(
      status as ExpensePaymentStatus
    )
      ? { paymentStatus: status as ExpensePaymentStatus }
      : {}),

    ...(direction &&
    Object.values(FinanceDirection).includes(direction as FinanceDirection)
      ? { direction: direction as FinanceDirection }
      : {}),

    ...(sourceType &&
    Object.values(FinanceSourceType).includes(sourceType as FinanceSourceType)
      ? { sourceType: sourceType as FinanceSourceType }
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

  const [expenses, totalCount, summaryEntries] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
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
            tourCode: true,
          },
        },
        departureDate: {
          select: {
            id: true,
            date: true,
          },
        },
      },
    }),

    db.expense.count({ where }),

    db.expense.findMany({
      where,
      select: {
        amount: true,
        direction: true,
        paymentStatus: true,
        taxAmount: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const buildPageHref = (page: number) => {
    const search = new URLSearchParams();

    if (q) search.set("q", q);
    if (category) search.set("category", category);
    if (status) search.set("status", status);
    if (direction) search.set("direction", direction);
    if (sourceType) search.set("sourceType", sourceType);
    if (from) search.set("from", from);
    if (to) search.set("to", to);

    search.set("page", String(page));

    return `/admin/finance/expenses?${search.toString()}`;
  };

  const totalIncome = summaryEntries
    .filter((item) => item.direction === "INCOME")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = summaryEntries
    .filter((item) => item.direction === "EXPENSE")
    .reduce((sum, item) => sum + item.amount, 0);

  const paidIncome = summaryEntries
    .filter(
      (item) => item.direction === "INCOME" && item.paymentStatus === "PAID"
    )
    .reduce((sum, item) => sum + item.amount, 0);

  const pendingIncome = summaryEntries
    .filter(
      (item) => item.direction === "INCOME" && item.paymentStatus === "PENDING"
    )
    .reduce((sum, item) => sum + item.amount, 0);

  const paidExpenses = summaryEntries
    .filter(
      (item) => item.direction === "EXPENSE" && item.paymentStatus === "PAID"
    )
    .reduce((sum, item) => sum + item.amount, 0);

  const pendingExpenses = summaryEntries
    .filter(
      (item) => item.direction === "EXPENSE" && item.paymentStatus === "PENDING"
    )
    .reduce((sum, item) => sum + item.amount, 0);

  const totalTax = summaryEntries.reduce(
    (sum, item) => sum + (item.taxAmount || 0),
    0
  );

  const netProfit = totalIncome - totalExpenses;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">
            Finance Entries
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full EUR ledger for income, expenses, tax, agencies, tours, and
            groups.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/finance"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Finance Dashboard
          </Link>

          <Link
            href="/admin/finance/expenses/create"
            className="rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Add Finance Entry
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-green-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-green-700">Total Income</p>
          <p className="mt-2 text-3xl font-bold text-green-800">
            {formatCurrency(totalIncome, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-red-700">Total Expenses</p>
          <p className="mt-2 text-3xl font-bold text-red-800">
            {formatCurrency(totalExpenses, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-blue-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-blue-700">Net Profit</p>
          <p
            className={`mt-2 text-3xl font-bold ${
              netProfit >= 0 ? "text-blue-800" : "text-red-700"
            }`}
          >
            {formatCurrency(netProfit, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-700">VAT / Tax</p>
          <p className="mt-2 text-3xl font-bold text-amber-800">
            {formatCurrency(totalTax, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Paid Income</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(paidIncome, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending Income</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(pendingIncome, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Paid Expenses</p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(paidExpenses, "EUR")}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending Expenses</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">
            {formatCurrency(pendingExpenses, "EUR")}
          </p>
        </div>
      </div>

      <form className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Agency, tour, code, group, vendor, title..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Direction
            </label>
            <select
              name="direction"
              defaultValue={direction}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">All</option>
              {Object.values(FinanceDirection).map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Source
            </label>
            <select
              name="sourceType"
              defaultValue={sourceType}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            >
              <option value="">All</option>
              {Object.values(FinanceSourceType).map((item) => (
                <option key={item} value={item}>
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
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
                  {formatEnumLabel(item)}
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
                  {formatEnumLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              From
            </label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              To
            </label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div className="flex items-end">
            <Link
              href="/admin/finance/expenses"
              className="w-full rounded-xl border px-4 py-2.5 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Reset Filters
            </Link>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1800px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Direction</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Agency / Partner</th>
                <th className="px-4 py-3 font-medium">Group / Package</th>
                <th className="px-4 py-3 font-medium">Vendor / Payer</th>
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">Tour</th>
                <th className="px-4 py-3 font-medium">Departure</th>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Tax</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-t transition hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatDate(expense.expenseDate)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-[#001F3F]">
                      {expense.title}
                    </div>
                    {expense.description && (
                      <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {expense.description}
                      </div>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${getDirectionClass(
                        expense.direction
                      )}`}
                    >
                      {formatEnumLabel(expense.direction)}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {formatEnumLabel(expense.sourceType)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {formatEnumLabel(expense.category)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {expense.partnerCompanyName ||
                          expense.agentNameSnapshot ||
                          "-"}
                      </div>
                      {expense.agentNameSnapshot &&
                        expense.partnerCompanyName && (
                          <div className="text-xs text-slate-500">
                            Agent: {expense.agentNameSnapshot}
                          </div>
                        )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {expense.groupName || expense.customPackageName || "-"}
                      </div>
                      {expense.tourLeaderName && (
                        <div className="text-xs text-slate-500">
                          Leader: {expense.tourLeaderName}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {expense.vendorName || "-"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {expense.booking ? (
                      <Link
                        href={`/admin/bookings/${expense.booking.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {expense.booking.bookingDisplayCode ||
                          expense.booking.bookingReference}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {expense.tour ? (
                      <Link
                        href={`/admin/tours/${expense.tour.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {expense.tour.tourCode
                          ? `${expense.tour.tourCode} — ${expense.tour.title}`
                          : expense.tour.title}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {expense.departureDate
                      ? formatDate(expense.departureDate.date)
                      : "-"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {expense.receiptUrl ? (
                      <div className="flex gap-3">
                        <Link
                          href={expense.receiptUrl}
                          target="_blank"
                          className="text-blue-600 hover:underline"
                        >
                          View PDF
                        </Link>

                        <a
                          href={expense.receiptUrl}
                          download
                          className="text-green-700 hover:underline"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <div>{formatEnumLabel(expense.taxType)}</div>
                    {(expense.taxAmount || 0) > 0 && (
                      <div className="text-xs text-slate-500">
                        {formatCurrency(expense.taxAmount || 0, "EUR")}
                      </div>
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                        expense.paymentStatus
                      )}`}
                    >
                      {formatEnumLabel(expense.paymentStatus)}
                    </span>
                  </td>

                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                      expense.direction === "INCOME"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {expense.direction === "INCOME" ? "+" : "-"}
                    {formatCurrency(expense.amount, "EUR")}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 whitespace-nowrap">
                      <Link
                        href={`/admin/finance/expenses/${expense.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>

                      <DeleteExpenseButton expenseId={expense.id} />
                    </div>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && (
                <tr>
                  <td
                    colSpan={16}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No finance entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Showing {expenses.length} of {totalCount} entries — Page{" "}
            {currentPage} of {totalPages}
          </p>

          <div className="flex gap-2">
            <Link
              href={buildPageHref(Math.max(1, currentPage - 1))}
              className={`rounded-lg border px-4 py-2 text-sm ${
                currentPage <= 1
                  ? "pointer-events-none opacity-50"
                  : "hover:border-[#8B0000] hover:text-[#8B0000]"
              }`}
            >
              Previous
            </Link>

            <Link
              href={buildPageHref(Math.min(totalPages, currentPage + 1))}
              className={`rounded-lg border px-4 py-2 text-sm ${
                currentPage >= totalPages
                  ? "pointer-events-none opacity-50"
                  : "hover:border-[#8B0000] hover:text-[#8B0000]"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}