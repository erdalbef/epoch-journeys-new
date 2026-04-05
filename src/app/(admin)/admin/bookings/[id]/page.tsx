import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import PaymentScheduleManager from "@/components/admin/bookings/PaymentScheduleManager";

function formatCurrency(value: number | null | undefined, currency = "EUR") {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatText(value: string | null | undefined) {
  if (!value || value.trim() === "") return "—";
  return value;
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value ? "Yes" : "No";
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return "—";
  return `${value}${suffix}`;
}

function getPaymentProgress(
  amountPaid: number | null | undefined,
  total: number | null | undefined
) {
  if (!total || total <= 0 || !amountPaid) return 0;
  return Math.min(100, Math.round((amountPaid / total) * 100));
}

function getBookingStatusClasses(status: string | null | undefined) {
  const base = "inline-flex rounded-full border px-3 py-1 text-xs font-semibold";

  switch (status) {
    case "PENDING":
      return `${base} border-amber-200 bg-amber-100 text-amber-800`;
    case "CONFIRMED":
      return `${base} border-green-200 bg-green-100 text-green-800`;
    case "ON_REQUEST":
      return `${base} border-blue-200 bg-blue-100 text-blue-800`;
    case "CANCELLED":
      return `${base} border-red-200 bg-red-100 text-red-800`;
    case "WAITLIST":
      return `${base} border-purple-200 bg-purple-100 text-purple-800`;
    default:
      return `${base} border-gray-200 bg-gray-100 text-gray-800`;
  }
}

function getPaymentStatusClasses(status: string | null | undefined) {
  const base = "inline-flex rounded-full border px-3 py-1 text-xs font-semibold";

  switch (status) {
    case "UNPAID":
      return `${base} border-red-200 bg-red-100 text-red-800`;
    case "PARTIALLY_PAID":
      return `${base} border-amber-200 bg-amber-100 text-amber-800`;
    case "PAID":
      return `${base} border-green-200 bg-green-100 text-green-800`;
    case "REFUNDED":
      return `${base} border-slate-200 bg-slate-100 text-slate-800`;
    default:
      return `${base} border-gray-200 bg-gray-100 text-gray-800`;
  }
}

function getPayoutStatusClasses(status: string | null | undefined) {
  const base = "inline-flex rounded-full border px-3 py-1 text-xs font-semibold";

  switch (status) {
    case "PENDING":
      return `${base} border-amber-200 bg-amber-100 text-amber-800`;
    case "APPROVED":
      return `${base} border-blue-200 bg-blue-100 text-blue-800`;
    case "PAID":
      return `${base} border-green-200 bg-green-100 text-green-800`;
    case "CANCELLED":
      return `${base} border-red-200 bg-red-100 text-red-800`;
    default:
      return `${base} border-gray-200 bg-gray-100 text-gray-800`;
  }
}

function getInstallmentStatusClasses(status: string | null | undefined) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-800";
    case "OVERDUE":
      return "bg-red-100 text-red-800";
    case "PARTIALLY_PAID":
      return "bg-amber-100 text-amber-800";
    case "PENDING":
      return "bg-gray-100 text-gray-800";
    case "CANCELLED":
      return "bg-slate-100 text-slate-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getInstallmentProgressBarClasses(status: string | null | undefined) {
  switch (status) {
    case "PAID":
      return "bg-green-600";
    case "OVERDUE":
      return "bg-red-600";
    case "PARTIALLY_PAID":
      return "bg-amber-500";
    case "CANCELLED":
      return "bg-slate-500";
    default:
      return "bg-gray-500";
  }
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          travelAgency: true,
          phone: true,
          partnerType: true,
        },
      },
      tour: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
      departureDate: {
        select: {
          id: true,
          date: true,
          season: true,
          status: true,
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          allocations: {
            include: {
              paymentSchedule: true,
            },
          },
        },
      },
      paymentSubmissions: {
        orderBy: {
          createdAt: "desc",
        },
      },
      paymentSchedules: {
        orderBy: [
          {
            dueDate: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      },
      passengers: {
        orderBy: {
          createdAt: "asc",
        },
      },
      roomAssignments: {
        orderBy: {
          createdAt: "asc",
        },
      },
      payout: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
          currency: true,
          paidAt: true,
          approvedAt: true,
          paymentMethod: true,
          paymentReference: true,
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  const paymentProgress = getPaymentProgress(
    booking.amountPaid,
    booking.totalPrice
  );

  const financialHealth = booking.paymentStatus;

  const destinations =
    Array.isArray(booking.destinationsSnapshot) &&
    booking.destinationsSnapshot.length > 0
      ? booking.destinationsSnapshot.join(", ")
      : "—";

  const now = new Date();

  const nextInstallment =
    booking.paymentSchedules.find(
      (item) =>
        item.status !== "PAID" &&
        item.status !== "CANCELLED" &&
        new Date(item.dueDate) >= now
    ) ?? null;

  const overdueInstallments = booking.paymentSchedules.filter(
    (item) =>
      item.status !== "PAID" &&
      item.status !== "CANCELLED" &&
      new Date(item.dueDate) < now
  );

  const overdueAmount = overdueInstallments.reduce(
    (sum, item) => sum + Math.max(0, item.amount - item.amountPaid),
    0
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-gray-500">Admin / Bookings / Detail</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Booking Detail
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Financial overview, payment tracking, commercial snapshot, and
            operational booking data.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/bookings"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Bookings
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Booking Reference</p>
          <p className="mt-2 break-all text-sm font-semibold text-gray-900">
            {booking.bookingReference}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Display Code</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {formatText(booking.bookingDisplayCode)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Booking Status</p>
          <div className="mt-3">
            <span className={getBookingStatusClasses(booking.status)}>
              {formatStatus(booking.status)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Payment Status</p>
          <div className="mt-3">
            <span className={getPaymentStatusClasses(booking.paymentStatus)}>
              {formatStatus(booking.paymentStatus)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Financial Health</p>
          <div className="mt-3">
            {financialHealth === "PAID" && (
              <span className="inline-flex rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                Fully Paid
              </span>
            )}

            {financialHealth === "PARTIALLY_PAID" && (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Partially Paid
              </span>
            )}

            {financialHealth === "UNPAID" && (
              <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                Unpaid
              </span>
            )}

            {financialHealth === "REFUNDED" && (
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                Refunded
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Price</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(booking.totalPrice, booking.currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Gross Amount</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(booking.grossAmount, booking.currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Commission</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(booking.commissionAmount, booking.currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Amount Paid</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(booking.amountPaid, booking.currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Amount Due</p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(booking.amountDue, booking.currency)}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Payment Schedule Management
          </h2>
        </div>

        <div className="p-6">
          <PaymentScheduleManager
            bookingId={booking.id}
            currency={booking.currency}
            schedules={booking.paymentSchedules.map((item) => ({
              id: item.id,
              type: item.type,
              title: item.title,
              dueDate: item.dueDate.toISOString(),
              amount: item.amount,
              amountPaid: item.amountPaid,
              status: item.status,
              paidAt: item.paidAt ? item.paidAt.toISOString() : null,
              notes: item.notes,
            }))}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Installment Breakdown
          </h2>
        </div>

        <div className="space-y-4 p-6">
          {booking.paymentSchedules.length === 0 ? (
            <p className="text-sm text-gray-500">No payment schedule defined.</p>
          ) : (
            booking.paymentSchedules.map((item) => {
              const remaining = Math.max(0, item.amount - item.amountPaid);
              const progress =
                item.amount > 0
                  ? Math.min(
                      100,
                      Math.round((item.amountPaid / item.amount) * 100)
                    )
                  : 0;

              return (
                <div
                  key={item.id}
                  className="space-y-3 rounded-xl border bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-gray-900">
                      {item.title || formatStatus(item.type)}
                    </p>

                    <span
                      className={`rounded px-2 py-1 text-xs ${getInstallmentStatusClasses(
                        item.status
                      )}`}
                    >
                      {formatStatus(item.status)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    Due: {formatDate(item.dueDate)}
                  </p>

                  <div className="flex justify-between text-sm">
                    <span>
                      Paid: {formatCurrency(item.amountPaid, booking.currency)}
                    </span>
                    <span>
                      Total: {formatCurrency(item.amount, booking.currency)}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all ${getInstallmentProgressBarClasses(
                        item.status
                      )}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className="text-sm text-gray-600">
                    Remaining:{" "}
                    <span className="font-medium text-gray-900">
                      {formatCurrency(remaining, booking.currency)}
                    </span>
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border bg-white shadow-sm xl:col-span-2">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Financial Summary
            </h2>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Currency
              </p>
              <p className="mt-1 text-sm text-gray-900">{booking.currency}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Booking Type
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatStatus(booking.bookingType)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Net Amount
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatCurrency(booking.netAmount, booking.currency)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Price Per Person Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatCurrency(
                  booking.pricePerPersonSnapshot,
                  booking.currency
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Early Discount %
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatNumber(booking.earlyDiscountPercentSnapshot, "%")}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Early Discount Deadline
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(booking.earlyDiscountDeadlineSnapshot)}
              </p>
            </div>
          </div>

          <div className="border-t px-6 pb-6 pt-2">
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-500">Payment Progress</span>
                <span className="font-medium text-gray-900">
                  {paymentProgress}%
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-green-600 transition-all"
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Paid: {formatCurrency(booking.amountPaid, booking.currency)}
                </span>
                <span>
                  Total: {formatCurrency(booking.totalPrice, booking.currency)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Payment Timeline
            </h2>
          </div>

          <div className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Next Installment Due
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {nextInstallment
                  ? `${formatDate(nextInstallment.dueDate)} • ${formatCurrency(
                      Math.max(
                        0,
                        nextInstallment.amount - nextInstallment.amountPaid
                      ),
                      booking.currency
                    )}`
                  : "No upcoming installment"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Overdue Installments
              </p>
              <div className="mt-1">
                {overdueInstallments.length > 0 ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-800">
                      {overdueInstallments.length} overdue installment
                      {overdueInstallments.length > 1 ? "s" : ""}
                    </p>
                    <p className="mt-1 text-sm text-red-700">
                      Outstanding overdue amount:{" "}
                      {formatCurrency(overdueAmount, booking.currency)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-900">
                    No overdue installments
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Created
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDateTime(booking.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Last Updated
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDateTime(booking.updatedAt)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border bg-white shadow-sm xl:col-span-2">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Agent Commercial Snapshot
            </h2>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Agent Name Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.agentNameSnapshot)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Agent Email Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.agentEmailSnapshot)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Agent Phone Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.agentPhoneSnapshot)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Agency Name Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.agencyNameSnapshot)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Partner Type Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatStatus(booking.partnerTypeSnapshot)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Membership Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.membershipSnapshot)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Commission Rate Snapshot
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatNumber(booking.commissionRateSnapshot, "%")}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payout Per Pax Snapshot
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatCurrency(
                  booking.payoutPerPaxSnapshot,
                  booking.currency
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Live Agent Record
            </h2>
          </div>

          <div className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                User
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {booking.user?.fullName || booking.user?.email || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.user?.email)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Travel Agency
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.user?.travelAgency)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Partner Type
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatStatus(booking.user?.partnerType)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border bg-white shadow-sm xl:col-span-2">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Booking Snapshot
            </h2>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tour Title Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.tourTitleSnapshot)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Category Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.categorySnapshot)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Departure Date Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(booking.departureDateSnapshot)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Season Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatStatus(booking.seasonSnapshot)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Destinations
              </p>
              <p className="mt-1 text-sm text-gray-900">{destinations}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Duration Snapshot
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {booking.durationSnapshot ?? "—"}
                {booking.durationSnapshot ? " days" : ""}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Number of Guests
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {booking.numberOfGuests ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pax Estimate / Final
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {booking.estimatedPax ?? "—"} / {booking.finalPax ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Adults / Children / Infants
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {booking.adults ?? "—"} / {booking.children ?? "—"} /{" "}
                {booking.infants ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Land Only / Flights
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatBoolean(booking.landOnly)} /{" "}
                {formatBoolean(booking.needsFlights)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Group Name
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.groupName)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Group Leader
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.groupLeaderName)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Room Summary
            </h2>
          </div>

          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-gray-500">Single Rooms</span>
              <span className="font-medium text-gray-900">
                {booking.singleRooms ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-gray-500">Double Rooms</span>
              <span className="font-medium text-gray-900">
                {booking.doubleRooms ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-gray-500">Twin Rooms</span>
              <span className="font-medium text-gray-900">
                {booking.twinRooms ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-gray-500">Triple Rooms</span>
              <span className="font-medium text-gray-900">
                {booking.tripleRooms ?? 0}
              </span>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Room Assignments
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {booking.roomAssignments.length}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Passengers
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {booking.passengers.length}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border bg-white shadow-sm xl:col-span-2">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Agent Payout
            </h2>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Commission Earned
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatCurrency(booking.commissionAmount, booking.currency)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payout Status
              </p>
              <div className="mt-2">
                {booking.payout ? (
                  <span className={getPayoutStatusClasses(booking.payout.status)}>
                    {formatStatus(booking.payout.status)}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Not Assigned
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payout Amount
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {booking.payout
                  ? formatCurrency(
                      booking.payout.totalAmount,
                      booking.payout.currency
                    )
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Approved At
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {booking.payout ? formatDate(booking.payout.approvedAt) : "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Paid At
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {booking.payout ? formatDate(booking.payout.paidAt) : "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payment Method
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.payout?.paymentMethod)}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payment Reference
              </p>
              <p className="mt-1 break-all text-sm text-gray-900">
                {formatText(booking.payout?.paymentReference)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Commercial Summary
            </h2>
          </div>

          <div className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Commission Rate
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatNumber(booking.commissionRateSnapshot, "%")}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payout Per Pax
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatCurrency(booking.payoutPerPaxSnapshot, booking.currency)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Gross Less Commission
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatCurrency(booking.netAmount, booking.currency)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Payment Records
            </h2>
          </div>

          <div className="p-6">
            {booking.payments.length === 0 ? (
              <p className="text-sm text-gray-500">No payment records yet.</p>
            ) : (
              <div className="space-y-4">
                {booking.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatStatus(payment.status)}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                      <p>
                        <span className="font-medium">Method:</span>{" "}
                        {formatStatus(payment.method)}
                      </p>
                      <p>
                        <span className="font-medium">Paid At:</span>{" "}
                        {formatDateTime(payment.paidAt)}
                      </p>
                      <p>
                        <span className="font-medium">Reference:</span>{" "}
                        {formatText(payment.reference)}
                      </p>
                      <p>
                        <span className="font-medium">Received By:</span>{" "}
                        {formatText(payment.receivedBy)}
                      </p>
                    </div>

                    {payment.notes ? (
                      <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
                        {payment.notes}
                      </p>
                    ) : null}

                    <div className="mt-4 rounded-lg border bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Allocation
                      </p>

                      {payment.allocations.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-600">
                          Not allocated
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {payment.allocations.map((alloc) => (
                            <div
                              key={alloc.id}
                              className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 text-sm"
                            >
                              <span className="text-gray-700">
                                {alloc.paymentSchedule.title ||
                                  formatStatus(alloc.paymentSchedule.type)}
                              </span>

                              <span className="font-medium text-gray-900">
                                {formatCurrency(alloc.amount, booking.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Payment Submissions
            </h2>
          </div>

          <div className="p-6">
            {booking.paymentSubmissions.length === 0 ? (
              <p className="text-sm text-gray-500">
                No payment submissions yet.
              </p>
            ) : (
              <div className="space-y-4">
                {booking.paymentSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(submission.amount, submission.currency)}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatStatus(submission.status)}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                      <p>
                        <span className="font-medium">Method:</span>{" "}
                        {formatText(submission.method)}
                      </p>
                      <p>
                        <span className="font-medium">Submitted:</span>{" "}
                        {formatDateTime(submission.createdAt)}
                      </p>
                      <p>
                        <span className="font-medium">Reviewed At:</span>{" "}
                        {formatDateTime(submission.reviewedAt)}
                      </p>
                      <p>
                        <span className="font-medium">Proof URL:</span>{" "}
                        {formatText(submission.proofUrl)}
                      </p>
                    </div>

                    {submission.note ? (
                      <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
                        {submission.note}
                      </p>
                    ) : null}

                    {submission.reviewNote ? (
                      <p className="mt-2 whitespace-pre-line text-sm text-gray-700">
                        <span className="font-medium">Review Note:</span>{" "}
                        {submission.reviewNote}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Lead & Customer Details
            </h2>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Customer Name
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.customerName)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Customer Email
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.customerEmail)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Customer Phone
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.customerPhone)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Lead First Name
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.leadFirstName)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Lead Last Name
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.leadLastName)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Lead Email
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.leadEmail)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Lead Phone
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatText(booking.leadPhone)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Internal Notes
            </h2>
          </div>

          <div className="space-y-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Notes
              </p>
              <p className="mt-2 whitespace-pre-line rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-900">
                {formatText(booking.notes)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Special Requests
              </p>
              <p className="mt-2 whitespace-pre-line rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-900">
                {formatText(booking.specialRequests)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Internal Notes
              </p>
              <p className="mt-2 whitespace-pre-line rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-900">
                {formatText(booking.internalNotes)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}