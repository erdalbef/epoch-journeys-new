import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type PageProps = {
  searchParams: {
    search?: string;
    bookingStatus?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

export default async function CommissionsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-signin");
  }

  const search = searchParams.search?.trim() || "";
  const bookingStatus = searchParams.bookingStatus || "";
  const paymentStatus = searchParams.paymentStatus || "";
  const dateFrom = searchParams.dateFrom || "";
  const dateTo = searchParams.dateTo || "";

  const bookings = await db.booking.findMany({
    where: {
      userId: session.user.id,
      ...(search
        ? {
            OR: [
              {
                bookingReference: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                tour: {
                  title: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
      ...(bookingStatus ? { status: bookingStatus as never } : {}),
      ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      bookingReference: true,
      status: true,
      paymentStatus: true,
      grossAmount: true,
      commissionAmount: true,
      netAmount: true,
      currency: true,
      createdAt: true,
      tour: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const exportHref = `/b2b/commissions/export/bookings?search=${search}&bookingStatus=${bookingStatus}&paymentStatus=${paymentStatus}&dateFrom=${dateFrom}&dateTo=${dateTo}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Commissions
          </h1>
          <p className="text-sm text-muted-foreground">
            View your booking earnings and payouts.
          </p>
        </div>

        <a
          href={exportHref}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Export CSV
        </a>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Reference</th>
              <th className="px-4 py-3 text-left">Tour</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Payment</th>
              <th className="px-4 py-3 text-left">Gross</th>
              <th className="px-4 py-3 text-left">Commission</th>
              <th className="px-4 py-3 text-left">Net</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No commission records found.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {booking.bookingReference}
                  </td>

                  <td className="px-4 py-3">
                    {booking.tour?.title || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {booking.status}
                  </td>

                  <td className="px-4 py-3">
                    {booking.paymentStatus}
                  </td>

                  <td className="px-4 py-3">
                    {booking.grossAmount?.toFixed(2)} {booking.currency}
                  </td>

                  <td className="px-4 py-3 text-green-600 font-medium">
                    {booking.commissionAmount?.toFixed(2)} {booking.currency}
                  </td>

                  <td className="px-4 py-3">
                    {booking.netAmount?.toFixed(2)} {booking.currency}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Back */}
      <div>
        <Link
          href="/b2b/dashboard"
          className="text-sm text-slate-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}