type BookingAlertSource = {
  id: string;
  bookingReference: string;
  bookingDisplayCode: string | null;
  tourTitleSnapshot: string;
  paymentStatus: string;
  status: string;
  amountDue: number;
  paymentDueDate: Date | null;
  departureDateSnapshot: Date;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function differenceInDays(from: Date, to: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.floor((b - a) / msPerDay);
}

export function buildBookingAlerts(bookings: BookingAlertSource[]) {
  const today = new Date();

  const overduePayments = bookings.filter((booking) => {
    if (!booking.paymentDueDate) return false;
    if (booking.paymentStatus === "PAID" || booking.paymentStatus === "REFUNDED") {
      return false;
    }

    return differenceInDays(today, booking.paymentDueDate) < 0 && booking.amountDue > 0;
  });

  const dueSoonPayments = bookings.filter((booking) => {
    if (!booking.paymentDueDate) return false;
    if (booking.paymentStatus === "PAID" || booking.paymentStatus === "REFUNDED") {
      return false;
    }

    const diff = differenceInDays(today, booking.paymentDueDate);
    return diff >= 0 && diff <= 7 && booking.amountDue > 0;
  });

  const upcomingDepartures = bookings.filter((booking) => {
    const diff = differenceInDays(today, booking.departureDateSnapshot);
    return diff >= 0 && diff <= 7 && booking.status !== "CANCELLED";
  });

  const unpaidBookings = bookings.filter((booking) => {
    return booking.paymentStatus === "UNPAID" || booking.paymentStatus === "PARTIALLY_PAID";
  });

  return {
    overduePayments,
    dueSoonPayments,
    upcomingDepartures,
    unpaidBookings,
  };
}