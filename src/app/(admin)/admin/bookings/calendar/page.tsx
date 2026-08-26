import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type PageProps = {
  searchParams: Promise<{
    year?: string;
    month?: string;
  }>;
};

function monthName(year: number, month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function dateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function statusClass(status: string) {
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

function previousMonth(year: number, month: number) {
  if (month === 1) {
    return {
      year: year - 1,
      month: 12,
    };
  }

  return {
    year,
    month: month - 1,
  };
}

function nextMonth(year: number, month: number) {
  if (month === 12) {
    return {
      year: year + 1,
      month: 1,
    };
  }

  return {
    year,
    month: month + 1,
  };
}

export default async function BookingCalendarPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (
    !session?.user ||
    session.user.role !== Role.ADMIN
  ) {
    redirect("/admin-login");
  }

  const params = await searchParams;

  const now = new Date();

  const parsedYear = Number(params.year);
  const parsedMonth = Number(params.month);

  const year =
    Number.isInteger(parsedYear) &&
    parsedYear >= 2000 &&
    parsedYear <= 2100
      ? parsedYear
      : now.getUTCFullYear();

  const month =
    Number.isInteger(parsedMonth) &&
    parsedMonth >= 1 &&
    parsedMonth <= 12
      ? parsedMonth
      : now.getUTCMonth() + 1;

  const monthStart = new Date(
    Date.UTC(year, month - 1, 1)
  );

  const nextMonthStart = new Date(
    Date.UTC(year, month, 1)
  );

  const bookings = await db.booking.findMany({
    where: {
      OR: [
        {
          departureDateSnapshot: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        {
          travelStartDateSnapshot: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      ],
    },

    orderBy: [
      {
        departureDateSnapshot: "asc",
      },
      {
        createdAt: "asc",
      },
    ],

    select: {
      id: true,

      bookingReference: true,
      bookingDisplayCode: true,

      status: true,
      paymentStatus: true,

      tourTitleSnapshot: true,
      groupName: true,

      agencyNameSnapshot: true,
      agentNameSnapshot: true,

      departureDateSnapshot: true,
      travelStartDateSnapshot: true,
      travelEndDateSnapshot: true,

      numberOfGuests: true,
      finalPax: true,
      estimatedPax: true,

      currency: true,
      totalPrice: true,
    },
  });

  const bookingsByDate =
    new Map<string, typeof bookings>();

  for (const booking of bookings) {
    const bookingDate =
      booking.travelStartDateSnapshot ??
      booking.departureDateSnapshot;

    if (!bookingDate) {
      continue;
    }

    const key = dateKey(bookingDate);

    const existing =
      bookingsByDate.get(key) ?? [];

    existing.push(booking);

    bookingsByDate.set(
      key,
      existing
    );
  }

  const firstDayOfWeek =
    monthStart.getUTCDay();

  const daysInMonth =
    new Date(
      Date.UTC(year, month, 0)
    ).getUTCDate();

  const calendarCells:
    Array<{
      day: number | null;
      date: Date | null;
    }> = [];

  for (
    let i = 0;
    i < firstDayOfWeek;
    i += 1
  ) {
    calendarCells.push({
      day: null,
      date: null,
    });
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    calendarCells.push({
      day,
      date: new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      ),
    });
  }

  while (
    calendarCells.length % 7 !== 0
  ) {
    calendarCells.push({
      day: null,
      date: null,
    });
  }

  const prev = previousMonth(
    year,
    month
  );

  const next = nextMonth(
    year,
    month
  );

  const todayKey = dateKey(now);

  const monthBookingCount =
    bookings.length;

  const monthGuestCount =
    bookings.reduce(
      (total, booking) =>
        total +
        (
          booking.finalPax ??
          booking.estimatedPax ??
          booking.numberOfGuests ??
          0
        ),
      0
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <CalendarDays className="h-4 w-4" />
            Operations Calendar
          </div>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#001F3F]">
            Booking Calendar
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View confirmed and upcoming
            bookings by travel date.
          </p>
        </div>

        <Link
          href="/admin/bookings/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003566]"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Link>
      </div>

      {/* ================================================== */}
      {/* SUMMARY */}
      {/* ================================================== */}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Bookings This Month
          </p>

          <p className="mt-2 text-3xl font-bold text-[#001F3F]">
            {monthBookingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Expected Travelers
          </p>

          <p className="mt-2 text-3xl font-bold text-[#001F3F]">
            {monthGuestCount}
          </p>
        </div>
      </div>

      {/* ================================================== */}
      {/* CALENDAR */}
      {/* ================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/admin/bookings/calendar?year=${prev.year}&month=${prev.month}`}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>

          <div className="text-center">
            <h2 className="text-xl font-bold text-[#001F3F]">
              {monthName(
                year,
                month
              )}
            </h2>

            <Link
              href="/admin/bookings/calendar"
              className="mt-1 inline-block text-xs font-semibold text-blue-600 hover:underline"
            >
              Today
            </Link>
          </div>

          <Link
            href={`/admin/bookings/calendar?year=${next.year}&month=${next.month}`}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 text-center">
            <p className="text-sm font-medium text-slate-600">
              No bookings scheduled for{" "}
              {monthName(
                year,
                month
              )}.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              New bookings will
              automatically appear on this
              calendar.
            </p>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {[
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ].map((day) => (
                <div
                  key={day}
                  className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarCells.map(
                (
                  cell,
                  index
                ) => {
                  if (
                    !cell.day ||
                    !cell.date
                  ) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-36 border-b border-r border-slate-100 bg-slate-50/50"
                      />
                    );
                  }

                  const key =
                    dateKey(
                      cell.date
                    );

                  const dayBookings =
                    bookingsByDate.get(
                      key
                    ) ?? [];

                  const isToday =
                    key === todayKey;

                  return (
                    <div
                      key={key}
                      className="min-h-36 border-b border-r border-slate-100 p-2"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={
                            isToday
                              ? "flex h-7 w-7 items-center justify-center rounded-full bg-[#001F3F] text-xs font-bold text-white"
                              : "flex h-7 w-7 items-center justify-center text-xs font-semibold text-slate-600"
                          }
                        >
                          {
                            cell.day
                          }
                        </span>

                        {dayBookings.length >
                        0 ? (
                          <span className="text-[10px] font-semibold text-slate-400">
                            {
                              dayBookings.length
                            }{" "}
                            booking
                            {dayBookings.length ===
                            1
                              ? ""
                              : "s"}
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        {dayBookings.map(
                          (
                            booking
                          ) => {
                            const reference =
                              booking.bookingDisplayCode ||
                              booking.bookingReference;

                            const client =
                              booking.agencyNameSnapshot ||
                              booking.agentNameSnapshot ||
                              booking.groupName ||
                              "Client";

                            const pax =
                              booking.finalPax ??
                              booking.estimatedPax ??
                              booking.numberOfGuests ??
                              0;

                            return (
                              <Link
                                key={
                                  booking.id
                                }
                                href={`/admin/bookings/${booking.id}`}
                                className={`block rounded-lg border p-2 text-xs transition hover:shadow-sm ${statusClass(
                                  booking.status
                                )}`}
                              >
                                <p className="truncate font-bold">
                                  {
                                    booking.tourTitleSnapshot
                                  }
                                </p>

                                <p className="mt-0.5 truncate opacity-80">
                                  {
                                    reference
                                  }
                                </p>

                                <p className="mt-1 truncate text-[11px] opacity-75">
                                  {
                                    client
                                  }
                                </p>

                                <p className="mt-1 text-[10px] font-semibold opacity-75">
                                  {
                                    pax
                                  }{" "}
                                  pax ·{" "}
                                  {
                                    booking.status
                                  }
                                </p>
                              </Link>
                            );
                          }
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}