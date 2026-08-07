import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Users } from "lucide-react";
import type { BookingStatus } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type PageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseMonth(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;

  if (month < 0 || month > 11 || year < 2000 || year > 2100) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  return { year, month };
}

function monthParam(year: number, month: number) {
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate(),
  ).padStart(2, "0")}`;
}

function statusClass(status: BookingStatus) {
  switch (status) {
    case "CONFIRMED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "ON_REQUEST":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "WAITLIST":
      return "border-purple-200 bg-purple-50 text-purple-800";
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default async function AdminBookingCalendarPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const params = await searchParams;
  const { year, month } = parseMonth(params.month);

  const monthStart = new Date(year, month, 1);
  const nextMonthStart = new Date(year, month + 1, 1);

  const bookings = await db.booking.findMany({
    where: {
      departureDateSnapshot: {
        gte: monthStart,
        lt: nextMonthStart,
      },
    },
    orderBy: [{ departureDateSnapshot: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      bookingReference: true,
      tourTitleSnapshot: true,
      agencyNameSnapshot: true,
      customerName: true,
      departureDateSnapshot: true,
      numberOfGuests: true,
      status: true,
    },
  });

  const bookingsByDay = new Map<string, typeof bookings>();

  for (const booking of bookings) {
    const key = dateKey(booking.departureDateSnapshot);
    const existing = bookingsByDay.get(key) ?? [];
    existing.push(booking);
    bookingsByDay.set(key, existing);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const mondayOffset = (firstDay + 6) % 7;
  const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  const previous = monthParam(year, month - 1);
  const next = monthParam(year, month + 1);
  const currentMonthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(monthStart);

  const totalGuests = bookings.reduce((sum, booking) => sum + booking.numberOfGuests, 0);
  const confirmed = bookings.filter((booking) => booking.status === "CONFIRMED").length;
  const pending = bookings.filter((booking) => booking.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
            Sales & Operations
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Booking Calendar
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            See bookings by travel date and open any reservation directly from the calendar.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/bookings"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            All Bookings
          </Link>
          <Link
            href="/admin/bookings/new"
            className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
          >
            New Booking
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Bookings this month" value={bookings.length} />
        <SummaryCard label="Confirmed / Pending" value={`${confirmed} / ${pending}`} />
        <SummaryCard label="Travelers departing" value={totalGuests} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <Link
            href={`/admin/bookings/calendar?month=${previous}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>

          <div className="flex items-center gap-2 text-center">
            <CalendarDays className="h-5 w-5 text-[#001F3F]" />
            <h2 className="text-lg font-bold text-slate-950">{currentMonthLabel}</h2>
          </div>

          <Link
            href={`/admin/bookings/calendar?month=${next}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="hidden grid-cols-7 border-b border-slate-200 bg-slate-50 md:grid">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7">
          {Array.from({ length: totalCells }, (_, index) => {
            const dayNumber = index - mondayOffset + 1;
            const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;

            if (!isCurrentMonth) {
              return <div key={index} className="hidden min-h-36 border-b border-r border-slate-100 bg-slate-50/50 md:block" />;
            }

            const dayDate = new Date(year, month, dayNumber);
            const key = dateKey(dayDate);
            const dayBookings = bookingsByDay.get(key) ?? [];
            const isToday = dateKey(new Date()) === key;

            return (
              <div key={key} className="min-h-36 border-b border-r border-slate-100 p-2.5 md:p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                      isToday ? "bg-[#001F3F] text-white" : "text-slate-700"
                    }`}
                  >
                    {dayNumber}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-[11px] font-medium text-slate-400">
                      {dayBookings.length} booking{dayBookings.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {dayBookings.slice(0, 4).map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/admin/bookings/${booking.id}`}
                      className={`block rounded-lg border px-2 py-1.5 text-xs transition hover:shadow-sm ${statusClass(
                        booking.status,
                      )}`}
                      title={`${booking.bookingReference} · ${booking.tourTitleSnapshot}`}
                    >
                      <div className="truncate font-semibold">{booking.bookingReference}</div>
                      <div className="mt-0.5 truncate opacity-80">{booking.tourTitleSnapshot}</div>
                      <div className="mt-1 flex items-center gap-1 opacity-70">
                        <Users className="h-3 w-3" />
                        {booking.numberOfGuests}
                        <span>·</span>
                        <span className="truncate">
                          {booking.agencyNameSnapshot || booking.customerName || "Direct"}
                        </span>
                      </div>
                    </Link>
                  ))}

                  {dayBookings.length > 4 && (
                    <div className="px-1 text-[11px] font-semibold text-slate-500">
                      +{dayBookings.length - 4} more
                    </div>
                  )}

                  {dayBookings.length === 0 && (
                    <div className="hidden pt-4 text-center text-[11px] text-slate-300 md:block">—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 text-xs">
        <Legend label="Confirmed" className="border-emerald-200 bg-emerald-50 text-emerald-800" />
        <Legend label="Pending" className="border-amber-200 bg-amber-50 text-amber-800" />
        <Legend label="On Request" className="border-blue-200 bg-blue-50 text-blue-800" />
        <Legend label="Waitlist" className="border-purple-200 bg-purple-50 text-purple-800" />
        <Legend label="Cancelled" className="border-red-200 bg-red-50 text-red-700" />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Legend({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full border px-2.5 py-1 font-semibold ${className}`}>{label}</span>;
}
