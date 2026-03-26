import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import BookingsCalendarClient from "@/components/admin/bookings/BookingsCalendarClient";

type SearchParams = {
  month?: string;
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getCalendarStart(date: Date) {
  const first = getMonthStart(date);
  const day = first.getDay();
  return new Date(first.getFullYear(), first.getMonth(), first.getDate() - day);
}

function getCalendarEnd(date: Date) {
  const last = getMonthEnd(date);
  const day = last.getDay();
  return new Date(last.getFullYear(), last.getMonth(), last.getDate() + (6 - day));
}

function parseMonthParam(month?: string) {
  if (!month) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null;
  }

  return new Date(year, monthIndex, 1);
}

function getMonthParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export default async function AdminBookingsCalendarPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const params = (await searchParams) ?? {};
  const today = new Date();
  const selectedMonth =
    parseMonthParam(params.month) ??
    new Date(today.getFullYear(), today.getMonth(), 1);

  const monthStart = getMonthStart(selectedMonth);
  const monthEnd = getMonthEnd(selectedMonth);
  const calendarStart = getCalendarStart(selectedMonth);
  const calendarEnd = getCalendarEnd(selectedMonth);

  const bookings = await db.booking.findMany({
    where: {
      departureDateSnapshot: {
        gte: calendarStart,
        lte: new Date(
          calendarEnd.getFullYear(),
          calendarEnd.getMonth(),
          calendarEnd.getDate(),
          23,
          59,
          59,
          999
        ),
      },
      status: {
        not: "CANCELLED",
      },
    },
    orderBy: [{ departureDateSnapshot: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      bookingReference: true,
      bookingDisplayCode: true,
      tourTitleSnapshot: true,
      agentNameSnapshot: true,
      agencyNameSnapshot: true,
      numberOfGuests: true,
      amountDue: true,
      totalPrice: true,
      currency: true,
      status: true,
      paymentStatus: true,
      departureDateSnapshot: true,
    },
  });

  const monthBookings = bookings.filter((b) => {
    const d = new Date(b.departureDateSnapshot);
    return (
      d >= monthStart &&
      d <= new Date(
        monthEnd.getFullYear(),
        monthEnd.getMonth(),
        monthEnd.getDate(),
        23,
        59,
        59,
        999
      )
    );
  });

  const totalBookings = monthBookings.length;
  const totalPax = monthBookings.reduce(
    (sum, booking) => sum + booking.numberOfGuests,
    0
  );
  const totalOutstanding = monthBookings.reduce(
    (sum, booking) => sum + booking.amountDue,
    0
  );
  const totalSales = monthBookings.reduce(
    (sum, booking) => sum + booking.totalPrice,
    0
  );

  const prevMonth = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() - 1,
    1
  );
  const nextMonth = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    1
  );

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001F3F]">Bookings Calendar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Month view of upcoming departures and bookings.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/bookings"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            All Bookings
          </Link>

          <Link
            href="/admin/dashboard"
            className="rounded-xl bg-[#001F3F] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Month Bookings" value={totalBookings} />
        <SummaryCard title="Month Pax" value={totalPax} />
        <SummaryCard
          title="Outstanding"
          value={formatCurrency(totalOutstanding)}
          tone="red"
        />
        <SummaryCard
          title="Month Sales"
          value={formatCurrency(totalSales)}
          tone="green"
        />
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/bookings/calendar?month=${getMonthParam(prevMonth)}`}
              className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Previous
            </Link>

            <div className="min-w-55 text-center text-xl font-semibold text-[#001F3F]">
              {getMonthLabel(selectedMonth)}
            </div>

            <Link
              href={`/admin/bookings/calendar?month=${getMonthParam(nextMonth)}`}
              className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Next
            </Link>
          </div>

          <Link
            href={`/admin/bookings/calendar?month=${getMonthParam(new Date())}`}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            Current Month
          </Link>
        </div>
      </section>

      <BookingsCalendarClient
        selectedMonthIso={selectedMonth.toISOString()}
        bookings={bookings.map((booking) => ({
          ...booking,
          departureDateSnapshot: booking.departureDateSnapshot.toISOString(),
        }))}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string | number;
  tone?: "green" | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-700"
      : tone === "red"
      ? "text-red-700"
      : "text-[#001F3F]";

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-xs uppercase text-muted-foreground">{title}</div>
      <div className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}