import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

import {
  BookingStatus,
  PaymentStatus,
  BookingType,
  Prisma,
} from "@prisma/client";

type SearchParams = {
  q?: string;
  status?: string;
  payment?: string;
  type?: string;
  page?: string;
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildUrl(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });

  const query = search.toString();
  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const params = (await searchParams) ?? {};

  const q = params.q?.trim() ?? "";
  const status = params.status as BookingStatus | undefined;
  const payment = params.payment as PaymentStatus | undefined;
  const type = params.type as BookingType | undefined;

  const page = Number(params.page ?? "1");
  const pageSize = 25;
  const skip = (page - 1) * pageSize;

  // ✅ FIXED: Proper Prisma typing
  const where: Prisma.BookingWhereInput = {
    ...(status ? { status } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(type ? { bookingType: type } : {}),
    ...(q
      ? {
          OR: [
            { bookingReference: { contains: q, mode: "insensitive" as const } },
            { bookingDisplayCode: { contains: q, mode: "insensitive" as const } },
            { tourTitleSnapshot: { contains: q, mode: "insensitive" as const } },
            { agencyNameSnapshot: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            { groupName: { contains: q, mode: "insensitive" as const } },
            { agentNameSnapshot: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [bookings, totalCount, totals] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        bookingReference: true,
        bookingDisplayCode: true,
        bookingType: true,
        status: true,
        paymentStatus: true,
        numberOfGuests: true,
        totalPrice: true,
        commissionAmount: true,
        netAmount: true,
        currency: true,
        departureDateSnapshot: true,
        tourTitleSnapshot: true,
        agencyNameSnapshot: true,
        agentNameSnapshot: true,
        customerName: true,
        groupName: true,
        createdAt: true,
      },
    }),

    db.booking.count({ where }),

    db.booking.aggregate({
      where,
      _sum: {
        totalPrice: true,
        commissionAmount: true,
        netAmount: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // ✅ FIX: safe access
  const totalSales = totals._sum?.totalPrice ?? 0;
  const totalCommission = totals._sum?.commissionAmount ?? 0;
  const totalNet = totals._sum?.netAmount ?? 0;

  return (
    <div className="space-y-8 p-6">

      <h1 className="text-3xl font-bold text-[#001F3F]">Bookings</h1>

      {/* TOTALS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border p-4 rounded">
          <p className="text-sm text-gray-500">Sales</p>
          <p className="text-xl font-semibold">
            {formatCurrency(totalSales)}
          </p>
        </div>

        <div className="border p-4 rounded">
          <p className="text-sm text-gray-500">Commission</p>
          <p className="text-xl font-semibold">
            {formatCurrency(totalCommission)}
          </p>
        </div>

        <div className="border p-4 rounded">
          <p className="text-sm text-gray-500">Net</p>
          <p className="text-xl font-semibold">
            {formatCurrency(totalNet)}
          </p>
        </div>
      </div>

      {/* TABLE */}
      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Ref</th>
              <th className="p-2 text-left">Tour</th>
              <th className="p-2 text-left">Guests</th>
              <th className="p-2 text-left">Departure</th>
              <th className="p-2 text-left">Total</th>
              <th className="p-2 text-left">Commission</th>
              <th className="p-2 text-left">Net</th>
            </tr>
          </thead>

          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-2">
                  <Link href={`/admin/bookings/${b.id}`}>
                    {b.bookingDisplayCode || b.bookingReference}
                  </Link>
                </td>

                <td className="p-2">{b.tourTitleSnapshot}</td>

                <td className="p-2">{b.numberOfGuests}</td>

                {/* ✅ formatDate now used */}
                <td className="p-2">
                  {formatDate(b.departureDateSnapshot)}
                </td>

                <td className="p-2">
                  {formatCurrency(b.totalPrice)}
                </td>

                <td className="p-2 text-green-700">
                  {formatCurrency(b.commissionAmount)}
                </td>

                <td className="p-2">
                  {formatCurrency(b.netAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between">
        {page > 1 ? (
          <Link href={buildUrl({ ...params, page: String(page - 1) })}>
            Prev
          </Link>
        ) : <span />}

        <span>
          Page {page} / {totalPages}
        </span>

        {page < totalPages ? (
          <Link href={buildUrl({ ...params, page: String(page + 1) })}>
            Next
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}