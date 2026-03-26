"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type CalendarBooking = {
  id: string;
  bookingReference: string;
  bookingDisplayCode: string | null;
  tourTitleSnapshot: string;
  agentNameSnapshot: string | null;
  agencyNameSnapshot: string | null;
  numberOfGuests: number;
  amountDue: number;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus: string;
  departureDateSnapshot: string;
};

type Props = {
  selectedMonthIso: string;
  bookings: CalendarBooking[];
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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

function buildCalendarDays(date: Date) {
  const start = getCalendarStart(date);
  const end = getCalendarEnd(date);
  const days: Date[] = [];

  for (
    let d = new Date(start);
    d <= end;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    days.push(new Date(d));
  }

  return days;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getBookingStatusClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-amber-100 text-amber-700";
    case "ON_REQUEST":
      return "bg-blue-100 text-blue-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    case "WAITLIST":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getPaymentStatusClass(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "PARTIALLY_PAID":
      return "bg-blue-100 text-blue-700";
    case "UNPAID":
      return "bg-red-100 text-red-700";
    case "REFUNDED":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function BookingsCalendarClient({
  selectedMonthIso,
  bookings,
}: Props) {
  const selectedMonth = useMemo(() => new Date(selectedMonthIso), [selectedMonthIso]);
  const [openDateKey, setOpenDateKey] = useState<string | null>(null);

  const days = useMemo(() => buildCalendarDays(selectedMonth), [selectedMonth]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();

    for (const booking of bookings) {
      const key = toDateKey(new Date(booking.departureDateSnapshot));
      const current = map.get(key) ?? [];
      current.push(booking);
      map.set(key, current);
    }

    return map;
  }, [bookings]);

  const modalBookings = openDateKey ? bookingsByDate.get(openDateKey) ?? [] : [];
  const modalTotalPax = modalBookings.reduce((sum, item) => sum + item.numberOfGuests, 0);
  const modalTotalDue = modalBookings.reduce((sum, item) => sum + item.amountDue, 0);

  return (
    <>
      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-sm font-semibold text-slate-600">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="border-r p-3 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayKey = toDateKey(day);
            const items = bookingsByDate.get(dayKey) ?? [];
            const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();
            const isToday = toDateKey(day) === toDateKey(new Date());
            const totalPax = items.reduce((sum, item) => sum + item.numberOfGuests, 0);

            let loadLevel: "normal" | "medium" | "high" = "normal";
            if (totalPax >= 30) loadLevel = "high";
            else if (totalPax >= 20) loadLevel = "medium";

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => {
                  if (items.length > 0) setOpenDateKey(dayKey);
                }}
                className={`min-h-45 border-r border-b p-3 text-left align-top last:border-r-0 ${
                  !isCurrentMonth
                    ? "bg-slate-50/70 text-slate-400"
                    : loadLevel === "high"
                    ? "bg-red-50"
                    : loadLevel === "medium"
                    ? "bg-amber-50"
                    : "bg-white"
                } ${items.length > 0 ? "cursor-pointer hover:bg-slate-50" : "cursor-default"}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      isToday
                        ? "bg-[#001F3F] text-white"
                        : isCurrentMonth
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  {items.length > 0 ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full bg-[#8B0000]/10 px-2 py-0.5 text-xs font-semibold text-[#8B0000]">
                        {items.length}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          loadLevel === "high"
                            ? "text-red-700"
                            : loadLevel === "medium"
                            ? "text-amber-700"
                            : "text-slate-600"
                        }`}
                      >
                        {totalPax} pax
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {items.length === 0 ? (
                    <div className="text-xs text-slate-300">—</div>
                  ) : (
                    items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-2"
                      >
                        <div className="truncate text-xs font-semibold text-[#001F3F]">
                          {item.bookingDisplayCode || item.bookingReference}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-600">
                          {item.tourTitleSnapshot}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {item.numberOfGuests} pax
                        </div>
                      </div>
                    ))
                  )}

                  {items.length > 3 ? (
                    <div className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      +{items.length - 3} more
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {openDateKey ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b p-6">
              <div>
                <h2 className="text-2xl font-bold text-[#001F3F]">
                  {formatDate(openDateKey)}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {modalBookings.length} booking{modalBookings.length === 1 ? "" : "s"} ·{" "}
                  {modalTotalPax} pax · Outstanding {formatCurrency(modalTotalDue)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenDateKey(null)}
                className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-6">
              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 text-left">Booking</th>
                      <th className="p-3 text-left">Tour</th>
                      <th className="p-3 text-left">Agent / Agency</th>
                      <th className="p-3 text-left">Pax</th>
                      <th className="p-3 text-left">Total</th>
                      <th className="p-3 text-left">Outstanding</th>
                      <th className="p-3 text-left">Booking Status</th>
                      <th className="p-3 text-left">Payment Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {modalBookings.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">
                          <Link
                            href={`/admin/bookings/${item.id}`}
                            className="font-medium text-[#001F3F] hover:text-[#8B0000]"
                          >
                            {item.bookingDisplayCode || item.bookingReference}
                          </Link>
                          <div className="mt-1 text-xs text-slate-500">
                            Ref: {item.bookingReference}
                          </div>
                        </td>

                        <td className="p-3">{item.tourTitleSnapshot}</td>

                        <td className="p-3">
                          <div>{item.agentNameSnapshot || "-"}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {item.agencyNameSnapshot || "-"}
                          </div>
                        </td>

                        <td className="p-3">{item.numberOfGuests}</td>

                        <td className="p-3 font-medium">
                          {formatCurrency(item.totalPrice, item.currency)}
                        </td>

                        <td className="p-3 font-medium text-red-700">
                          {formatCurrency(item.amountDue, item.currency)}
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getBookingStatusClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusClass(
                              item.paymentStatus
                            )}`}
                          >
                            {item.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}