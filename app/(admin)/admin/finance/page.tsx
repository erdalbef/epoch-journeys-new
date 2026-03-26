import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role, Prisma } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/payments/formatCurrency";
import { getSmartPaymentClass } from "@/lib/payments/paymentBadges";
import { getSmartPaymentLabel } from "@/lib/payments/paymentStatus";

type SearchParams = {
  from?: string;
  to?: string;
  agent?: string;
  tour?: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

function getLast12MonthKeys() {
  const result: string[] = [];
  const today = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    result.push(getMonthKey(d));
  }

  return result;
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = (await searchParams) ?? {};

  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";
  const agent = params.agent?.trim() ?? "";
  const tour = params.tour?.trim() ?? "";

  const where: Prisma.BookingWhereInput = {
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(agent
      ? {
          OR: [
            {
              agentNameSnapshot: {
                contains: agent,
                mode: "insensitive",
              },
            },
            {
              agencyNameSnapshot: {
                contains: agent,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(tour
      ? {
          tourTitleSnapshot: {
            contains: tour,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const bookings = await db.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      bookingReference: true,
      bookingDisplayCode: true,
      totalPrice: true,
      amountPaid: true,
      amountDue: true,
      paymentDueDate: true,
      commissionAmount: true,
      netAmount: true,
      currency: true,
      paymentStatus: true,
      departureDateSnapshot: true,
      tourTitleSnapshot: true,
      agentNameSnapshot: true,
      agencyNameSnapshot: true,
      createdAt: true,
    },
  });

  const totalSales = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const totalPaid = bookings.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalDue = bookings.reduce((sum, b) => sum + b.amountDue, 0);
  const totalCommission = bookings.reduce((sum, b) => sum + b.commissionAmount, 0);
  const totalNet = bookings.reduce((sum, b) => sum + b.netAmount, 0);

  const paidCount = bookings.filter((b) => b.paymentStatus === "PAID").length;
  const partialCount = bookings.filter(
    (b) => b.paymentStatus === "PARTIALLY_PAID"
  ).length;
  const unpaidCount = bookings.filter((b) => b.paymentStatus === "UNPAID").length;
  const refundedCount = bookings.filter(
    (b) => b.paymentStatus === "REFUNDED"
  ).length;

  const monthKeys = getLast12MonthKeys();

  const monthlyMap = new Map<
    string,
    {
      sales: number;
      paid: number;
      due: number;
      bookings: number;
    }
  >();

  for (const key of monthKeys) {
    monthlyMap.set(key, {
      sales: 0,
      paid: 0,
      due: 0,
      bookings: 0,
    });
  }

  for (const booking of bookings) {
    const key = getMonthKey(new Date(booking.createdAt));

    if (!monthlyMap.has(key)) continue;

    const current = monthlyMap.get(key)!;
    current.sales += booking.totalPrice;
    current.paid += booking.amountPaid;
    current.due += booking.amountDue;
    current.bookings += 1;
  }

  const monthlyData = monthKeys.map((key) => ({
    key,
    label: getMonthLabel(key),
    sales: monthlyMap.get(key)?.sales ?? 0,
    paid: monthlyMap.get(key)?.paid ?? 0,
    due: monthlyMap.get(key)?.due ?? 0,
    bookings: monthlyMap.get(key)?.bookings ?? 0,
  }));

  const maxSales = Math.max(...monthlyData.map((m) => m.sales), 1);
  const maxPaid = Math.max(...monthlyData.map((m) => m.paid), 1);

  const exportHref = (() => {
    const search = new URLSearchParams();
    if (from) search.set("from", from);
    if (to) search.set("to", to);
    if (agent) search.set("agent", agent);
    if (tour) search.set("tour", tour);

    const query = search.toString();
    return query
      ? `/api/admin/finance/export?${query}`
      : "/api/admin/finance/export";
  })();

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">Finance Overview</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor sales, payments, outstanding balances, commission, net totals,
            and monthly finance trends.
          </p>
        </div>

        <Link
          href={exportHref}
          className="inline-flex rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
        >
          Export CSV
        </Link>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">Filters</h2>

        <form className="grid gap-4 md:grid-cols-4">
          <div>
            <label
              htmlFor="from"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              From
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from}
              className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              To
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={to}
              className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="agent"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Agent / Agency
            </label>
            <input
              id="agent"
              name="agent"
              defaultValue={agent}
              placeholder="Search by agent or agency"
              className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="tour"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Tour
            </label>
            <input
              id="tour"
              name="tour"
              defaultValue={tour}
              placeholder="Search by tour"
              className="w-full rounded-xl border px-4 py-2 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div className="md:col-span-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-[#001F3F] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Apply Filters
            </button>

            <Link
              href="/admin/finance"
              className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-500">Sales</p>
          <p className="text-xl font-semibold">{formatCurrency(totalSales)}</p>
        </div>

        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-xl font-semibold text-green-700">
            {formatCurrency(totalPaid)}
          </p>
        </div>

        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-xl font-semibold text-red-700">
            {formatCurrency(totalDue)}
          </p>
        </div>

        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-500">Commission</p>
          <p className="text-xl font-semibold text-green-700">
            {formatCurrency(totalCommission)}
          </p>
        </div>

        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-500">Net</p>
          <p className="text-xl font-semibold">{formatCurrency(totalNet)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Monthly Sales
            </h2>
            <p className="text-sm text-muted-foreground">
              Total booking value created per month
            </p>
          </div>

          <div className="flex h-72 items-end gap-3 overflow-x-auto">
            {monthlyData.map((item) => {
              const heightPercent = Math.max((item.sales / maxSales) * 100, 4);

              return (
                <div
                  key={item.key}
                  className="flex min-w-14 flex-1 flex-col items-center justify-end"
                >
                  <div className="mb-2 text-center text-[11px] text-slate-500">
                    {item.sales > 0 ? formatCurrency(item.sales) : "—"}
                  </div>

                  <div className="flex h-52 items-end">
                    <div
                      className="w-10 rounded-t-md bg-[#001F3F]"
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.label}: ${formatCurrency(item.sales)}`}
                    />
                  </div>

                  <div className="mt-2 text-xs font-medium text-slate-700">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Monthly Paid
            </h2>
            <p className="text-sm text-muted-foreground">
              Cash actually received per month
            </p>
          </div>

          <div className="flex h-72 items-end gap-3 overflow-x-auto">
            {monthlyData.map((item) => {
              const heightPercent = Math.max((item.paid / maxPaid) * 100, 4);

              return (
                <div
                  key={item.key}
                  className="flex min-w-14 flex-1 flex-col items-center justify-end"
                >
                  <div className="mb-2 text-center text-[11px] text-slate-500">
                    {item.paid > 0 ? formatCurrency(item.paid) : "—"}
                  </div>

                  <div className="flex h-52 items-end">
                    <div
                      className="w-10 rounded-t-md bg-green-600"
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.label}: ${formatCurrency(item.paid)}`}
                    />
                  </div>

                  <div className="mt-2 text-xs font-medium text-slate-700">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Paid</div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {paidCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Partial</div>
          <div className="mt-2 text-2xl font-bold text-blue-700">
            {partialCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Unpaid</div>
          <div className="mt-2 text-2xl font-bold text-red-700">
            {unpaidCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase text-muted-foreground">Refunded</div>
          <div className="mt-2 text-2xl font-bold text-slate-700">
            {refundedCount}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Ref</th>
              <th className="p-2 text-left">Agent</th>
              <th className="p-2 text-left">Tour</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-left">Departure</th>
              <th className="p-2 text-left">Total</th>
              <th className="p-2 text-left">Paid</th>
              <th className="p-2 text-left">Due</th>
              <th className="p-2 text-left">Payment Status</th>
              <th className="p-2 text-left">Commission</th>
              <th className="p-2 text-left">Net</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-6 text-center text-muted-foreground">
                  No finance records found.
                </td>
              </tr>
            ) : (
              bookings.map((b) => {
                const paymentLabel = getSmartPaymentLabel(
                  b.paymentStatus,
                  b.amountDue,
                  b.paymentDueDate
                );

                return (
                  <tr key={b.id} className="border-t">
                    <td className="p-2">
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="font-medium text-[#001F3F] hover:text-[#8B0000]"
                      >
                        {b.bookingDisplayCode || b.bookingReference}
                      </Link>
                    </td>

                    <td className="p-2">
                      <div>{b.agentNameSnapshot || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.agencyNameSnapshot || "-"}
                      </div>
                    </td>

                    <td className="p-2">{b.tourTitleSnapshot}</td>

                    <td className="p-2">{formatDate(b.createdAt)}</td>

                    <td className="p-2">{formatDate(b.departureDateSnapshot)}</td>

                    <td className="p-2">{formatCurrency(b.totalPrice, b.currency)}</td>

                    <td className="p-2 text-green-700">
                      {formatCurrency(b.amountPaid, b.currency)}
                    </td>

                    <td className="p-2 text-red-700">
                      {formatCurrency(b.amountDue, b.currency)}
                    </td>

                    <td className="p-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getSmartPaymentClass(
                          paymentLabel
                        )}`}
                      >
                        {paymentLabel}
                      </span>
                    </td>

                    <td className="p-2 text-green-700">
                      {formatCurrency(b.commissionAmount, b.currency)}
                    </td>

                    <td className="p-2">{formatCurrency(b.netAmount, b.currency)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}