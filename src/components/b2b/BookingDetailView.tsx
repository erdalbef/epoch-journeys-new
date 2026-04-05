import Link from "next/link";

import PayNowModal from "@/components/b2b/payments/PayNowModal";

type PassengerItem = {
  id: string;
  title: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: string | null;
  dateOfBirth: Date | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  passportNumber: string | null;
  passportExpiry: Date | null;
  roomType: string | null;
  isLeadPassenger: boolean;
};

type PaymentItem = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  paidAt: Date | null;
  receivedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PaymentSubmissionItem = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  note: string | null;
  proofUrl: string | null;
  status: string;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    fullName: string | null;
    email: string | null;
  };
};

type BookingUserInfo = {
  fullName: string | null;
  travelAgency: string | null;
};

type BookingDetailViewProps = {
  booking: {
    id: string;
    bookingReference: string;
    bookingType: string;
    status: string;
    createdAt: Date;
    departureDateSnapshot: Date | string | null;
    tourTitleSnapshot: string;
    numberOfGuests: number;
    adults: number;
    children: number;
    infants: number;
    grossAmount: number;
    commissionAmount: number;
    netAmount: number;
    totalPrice: number;
    amountPaid: number;
    amountDue: number;
    paymentStatus: string;
    paymentDueDate: Date | null;
    notes: string | null;
    specialRequests: string | null;
    user: BookingUserInfo | null;
    passengers: PassengerItem[];
    payments: PaymentItem[];
    paymentSubmissions: PaymentSubmissionItem[];
    currency?: string | null;
    bookingDisplayCode?: string | null;
  };
  currentUser: {
    fullName: string | null;
    travelAgency: string | null;
    partnerType: string | null;
  } | null;
  backHref: string;
  backLabel: string;
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysDiff(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getSmartPaymentLabel(
  paymentStatus: string,
  amountDue: number,
  paymentDueDate: Date | null
) {
  if (paymentStatus === "PAID") return "PAID";
  if (paymentStatus === "REFUNDED") return "REFUNDED";

  if (!paymentDueDate) {
    return paymentStatus === "PARTIALLY_PAID" ? "PARTIAL" : "PENDING";
  }

  const diff = daysDiff(new Date(), new Date(paymentDueDate));

  if (amountDue > 0 && diff < 0) return "OVERDUE";
  if (amountDue > 0 && diff <= 7) return "DUE SOON";
  if (paymentStatus === "PARTIALLY_PAID") return "PARTIAL";

  return "UNPAID";
}

function getSmartPaymentClass(label: string) {
  switch (label) {
    case "PAID":
      return "border-green-200 bg-green-100 text-green-700";
    case "OVERDUE":
      return "border-red-200 bg-red-100 text-red-700";
    case "DUE SOON":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "PARTIAL":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "REFUNDED":
      return "border-purple-200 bg-purple-100 text-purple-700";
    default:
      return "border-gray-200 bg-gray-100 text-gray-700";
  }
}

function getBookingStatusClass(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "border-green-200 bg-green-100 text-green-700";
    case "PENDING":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "CANCELLED":
      return "border-red-200 bg-red-100 text-red-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getPaymentRecordStatusClass(status: string) {
  switch (status) {
    case "PAID":
    case "RECEIVED":
    case "CONFIRMED":
      return "border-green-200 bg-green-100 text-green-700";
    case "PARTIAL":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "FAILED":
    case "REJECTED":
      return "border-red-200 bg-red-100 text-red-700";
    case "PENDING":
    default:
      return "border-amber-200 bg-amber-100 text-amber-700";
  }
}

function getSubmissionStatusClass(status: string) {
  switch (status) {
    case "APPROVED":
      return "border-green-200 bg-green-100 text-green-700";
    case "REJECTED":
      return "border-red-200 bg-red-100 text-red-700";
    case "PENDING":
    default:
      return "border-amber-200 bg-amber-100 text-amber-700";
  }
}

function getPassengerFullName(passenger: {
  title: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return [
    passenger.title,
    passenger.firstName,
    passenger.middleName,
    passenger.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeRoomType(roomType: string | null | undefined) {
  if (!roomType) return "Unassigned";

  const normalized = roomType.toUpperCase();

  if (normalized.includes("SINGLE")) return "Single";
  if (normalized.includes("DOUBLE")) return "Double";
  if (normalized.includes("TWIN")) return "Twin";
  if (normalized.includes("TRIPLE")) return "Triple";

  return roomType;
}

function getRoomBreakdown(passengers: PassengerItem[]) {
  const counts: Record<string, number> = {
    Single: 0,
    Double: 0,
    Twin: 0,
    Triple: 0,
    Unassigned: 0,
  };

  for (const passenger of passengers) {
    const roomType = normalizeRoomType(passenger.roomType);

    if (roomType in counts) {
      counts[roomType] += 1;
    } else {
      counts.Unassigned += 1;
    }
  }

  return counts;
}

export default function BookingDetailView({
  booking,
  currentUser,
  backHref,
  backLabel,
}: BookingDetailViewProps) {
  const isGroupLeader = currentUser?.partnerType === "GROUP_LEADER";
  const earningsLabel = isGroupLeader ? "Payout" : "Commission";
  const paymentLabel = getSmartPaymentLabel(
    booking.paymentStatus,
    booking.amountDue,
    booking.paymentDueDate
  );

  const passengerCount = booking.passengers.length;
  const expectedPassengers = booking.numberOfGuests || 0;
  const missingPassengers = Math.max(expectedPassengers - passengerCount, 0);
  const isGroupBooking = booking.bookingType === "GROUP";

  const addPassengerHref = `/b2b/bookings/${booking.id}/passengers/new`;
  const uploadPassengerListHref = `/b2b/support?bookingId=${booking.id}&type=passengers`;

  const safeGuestCount = booking.numberOfGuests > 0 ? booking.numberOfGuests : 1;
  const pricePerPerson = booking.grossAmount / safeGuestCount;

  const roomBreakdown = getRoomBreakdown(booking.passengers);
  const currency = booking.currency || "EUR";
  const bookingCode = booking.bookingDisplayCode || booking.bookingReference;

  const totalRecordedPayments = booking.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  const totalSubmittedPayments = booking.paymentSubmissions.reduce(
    (sum, submission) => sum + submission.amount,
    0
  );

  const pendingSubmissionCount = booking.paymentSubmissions.filter(
    (submission) => submission.status === "PENDING"
  ).length;

  const latestSubmission = booking.paymentSubmissions[0];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B0000]">
                Booking Detail
              </p>

              <h1 className="mt-2 text-2xl font-bold text-[#001F3F] md:text-3xl">
                {isGroupBooking ? "Group Booking" : "Booking"} {bookingCode}
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {isGroupBooking
                  ? "Operational and financial overview for this group booking, including payments, passenger records, and room details."
                  : "Review booking details, payment progress, commercial totals, and traveler records."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                Created: {formatDate(booking.createdAt)}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getBookingStatusClass(
                  booking.status
                )}`}
              >
                {booking.status}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getSmartPaymentClass(
                  paymentLabel
                )}`}
              >
                {paymentLabel}
              </span>

              <span className="rounded-full border bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {booking.bookingType}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/api/b2b/bookings/${booking.id}/voucher`}
              className="rounded-xl bg-[#8B0000] px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              Download Voucher
            </Link>

            <Link
              href={backHref}
              className="rounded-xl border px-4 py-2 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              {backLabel}
            </Link>

            <PayNowModal
              bookingId={booking.id}
              bookingReference={bookingCode}
              amountDue={booking.amountDue}
              currency={currency}
              triggerLabel="Submit Payment Proof"
              triggerClassName="rounded-xl border px-4 py-2 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
            />

            {latestSubmission?.status === "APPROVED" ? (
              <a
                href={`/api/b2b/payments/${latestSubmission.id}/receipt`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border px-4 py-2 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
              >
                Download Receipt
              </a>
            ) : (
              <Link
                href={`/b2b/payments`}
                className="rounded-xl border px-4 py-2 text-center text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
              >
                View Payments
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Gross Amount
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {formatCurrency(booking.grossAmount, currency)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {earningsLabel}
          </div>
          <div className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(booking.commissionAmount, currency)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Net Amount
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {formatCurrency(booking.netAmount, currency)}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Balance Due
          </div>
          <div className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(booking.amountDue, currency)}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#001F3F]">
                  Financial Summary
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Commercial totals and payment view for this booking.
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getSmartPaymentClass(
                  paymentLabel
                )}`}
              >
                {paymentLabel}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="text-xs uppercase text-muted-foreground">
                  Gross
                </div>
                <div className="mt-2 text-lg font-semibold text-[#001F3F]">
                  {formatCurrency(booking.grossAmount, currency)}
                </div>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="text-xs uppercase text-muted-foreground">
                  {earningsLabel}
                </div>
                <div className="mt-2 text-lg font-semibold text-green-700">
                  {formatCurrency(booking.commissionAmount, currency)}
                </div>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="text-xs uppercase text-muted-foreground">
                  Net
                </div>
                <div className="mt-2 text-lg font-semibold text-[#001F3F]">
                  {formatCurrency(booking.netAmount, currency)}
                </div>
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="text-xs uppercase text-muted-foreground">
                  Per Person
                </div>
                <div className="mt-2 text-lg font-semibold text-[#001F3F]">
                  {formatCurrency(pricePerPerson, currency)}
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="border-b bg-slate-50 px-6 py-4">
              <h3 className="text-sm font-semibold text-[#001F3F]">
                Invoice Breakdown
              </h3>
            </div>

            <div className="divide-y text-sm">
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-muted-foreground">Gross Amount</span>
                <span className="font-medium text-[#001F3F]">
                  {formatCurrency(booking.grossAmount, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-muted-foreground">{earningsLabel}</span>
                <span className="font-medium text-green-700">
                  - {formatCurrency(booking.commissionAmount, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between px-6 py-4">
                <span className="font-semibold text-[#001F3F]">Net Amount</span>
                <span className="font-semibold text-[#001F3F]">
                  {formatCurrency(booking.netAmount, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-medium text-green-700">
                  {formatCurrency(booking.amountPaid, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 px-6 py-5">
                <span className="font-semibold text-[#001F3F]">Balance Due</span>
                <span className="text-lg font-bold text-red-700">
                  {formatCurrency(booking.amountDue, currency)}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Booking Snapshot
            </h2>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground">Tour</div>
                <div className="font-medium text-[#001F3F]">
                  {booking.tourTitleSnapshot}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Departure</div>
                <div className="font-medium">
                  {formatDate(booking.departureDateSnapshot)}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Reference</div>
                <div className="font-medium">{bookingCode}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Booking Type</div>
                <div className="font-medium">{booking.bookingType}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Due Date</div>
                <div className="font-medium">
                  {formatDate(booking.paymentDueDate)}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Account Summary
            </h2>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground">Partner</div>
                <div className="font-medium text-[#001F3F]">
                  {currentUser?.fullName || booking.user?.fullName || "-"}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Travel Agency</div>
                <div className="font-medium text-[#001F3F]">
                  {currentUser?.travelAgency || booking.user?.travelAgency || "-"}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">{earningsLabel}</div>
                <div className="font-medium text-green-700">
                  {formatCurrency(booking.commissionAmount, currency)}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Occupancy / Room Breakdown
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              {Object.entries(roomBreakdown).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3"
                >
                  <span className="text-muted-foreground">{key}</span>
                  <span
                    className={
                      key === "Unassigned"
                        ? "font-semibold text-amber-600"
                        : "font-semibold text-[#001F3F]"
                    }
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Recorded Payments
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {booking.payments.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Total received records: {formatCurrency(totalRecordedPayments, currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Submitted Proofs
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {booking.paymentSubmissions.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Submitted amount: {formatCurrency(totalSubmittedPayments, currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Pending Review
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {pendingSubmissionCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Waiting for admin review
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Price Per Person
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {formatCurrency(pricePerPerson, currency)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Payment History
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recorded payments already posted to this booking.
            </p>
          </div>

          <PayNowModal
            bookingId={booking.id}
            bookingReference={bookingCode}
            amountDue={booking.amountDue}
            currency={currency}
            triggerLabel="Submit Payment"
            triggerClassName="rounded-xl bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          />
        </div>

        {booking.payments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No payment records have been posted yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-245 text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Method</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                  <th className="pb-3 pr-4 font-medium">Received By</th>
                  <th className="pb-3 pr-4 font-medium">Notes</th>
                </tr>
              </thead>

              <tbody>
                {booking.payments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(payment.paidAt || payment.createdAt)}
                    </td>

                    <td className="py-3 pr-4 font-medium text-[#001F3F]">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {payment.method}
                    </td>

                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getPaymentRecordStatusClass(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {payment.reference || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {payment.receivedBy || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {payment.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Payment Submissions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Payment proofs submitted for admin review.
            </p>
          </div>

          {latestSubmission?.status === "APPROVED" ? (
            <a
              href={`/api/b2b/payments/${latestSubmission.id}/receipt`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-[#8B0000] hover:underline"
            >
              Download Latest Receipt
            </a>
          ) : null}
        </div>

        {booking.paymentSubmissions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No payment proof submissions yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-287.5 text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Submitted</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Method</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Submitted By</th>
                  <th className="pb-3 pr-4 font-medium">Proof</th>
                  <th className="pb-3 pr-4 font-medium">Receipt</th>
                  <th className="pb-3 pr-4 font-medium">Note</th>
                  <th className="pb-3 pr-4 font-medium">Review</th>
                </tr>
              </thead>

              <tbody>
                {booking.paymentSubmissions.map((submission) => (
                  <tr key={submission.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDateTime(submission.createdAt)}
                    </td>

                    <td className="py-3 pr-4 font-medium text-[#001F3F]">
                      {formatCurrency(submission.amount, submission.currency)}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {submission.method}
                    </td>

                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getSubmissionStatusClass(
                          submission.status
                        )}`}
                      >
                        {submission.status}
                      </span>
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {submission.user.fullName || submission.user.email || "-"}
                    </td>

                    <td className="py-3 pr-4">
                      {submission.proofUrl ? (
                        <a
                          href={submission.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-[#8B0000] hover:underline"
                        >
                          View Proof
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    <td className="py-3 pr-4">
                      {submission.status === "APPROVED" ? (
                        <a
                          href={`/api/b2b/payments/${submission.id}/receipt`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-[#8B0000] hover:underline"
                        >
                          Download Receipt
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {submission.note || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {submission.reviewNote
                        ? `${submission.reviewNote} (${formatDate(
                            submission.reviewedAt
                          )})`
                        : submission.reviewedAt
                        ? `Reviewed ${formatDate(submission.reviewedAt)}`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {isGroupBooking ? "Pilgrims Expected" : "Guests"}
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {booking.numberOfGuests}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Passenger Records
          </div>
          <div className="mt-2 text-2xl font-bold text-[#001F3F]">
            {passengerCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Missing Passenger Info
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {missingPassengers}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Amount Due
          </div>
          <div className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(booking.amountDue, currency)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Traveler Breakdown
        </h2>

        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="text-muted-foreground">Adults</div>
            <div className="mt-1 text-lg font-semibold text-[#001F3F]">
              {booking.adults}
            </div>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="text-muted-foreground">Children</div>
            <div className="mt-1 text-lg font-semibold text-[#001F3F]">
              {booking.children}
            </div>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="text-muted-foreground">Infants</div>
            <div className="mt-1 text-lg font-semibold text-[#001F3F]">
              {booking.infants}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Passenger List
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review current passenger records for this booking.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 text-right">
            <div className="flex flex-wrap gap-3">
              <Link
                href={addPassengerHref}
                className="text-sm font-medium text-[#8B0000] hover:underline"
              >
                Add Passenger
              </Link>

              <Link
                href={uploadPassengerListHref}
                className="text-sm font-medium text-[#8B0000] hover:underline"
              >
                Upload Passenger List
              </Link>
            </div>

            <span className="text-xs text-muted-foreground">
              For large groups, send your list to our team for upload assistance.
            </span>
          </div>
        </div>

        {booking.passengers.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No passengers added yet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-300 text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Phone</th>
                  <th className="pb-3 pr-4 font-medium">Gender</th>
                  <th className="pb-3 pr-4 font-medium">Date of Birth</th>
                  <th className="pb-3 pr-4 font-medium">Nationality</th>
                  <th className="pb-3 pr-4 font-medium">Passport No.</th>
                  <th className="pb-3 pr-4 font-medium">Passport Expiry</th>
                  <th className="pb-3 pr-4 font-medium">Room Type</th>
                  <th className="pb-3 pr-4 font-medium">Lead Passenger</th>
                  <th className="pb-3 pr-4 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {booking.passengers.map((passenger) => (
                  <tr key={passenger.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-[#001F3F]">
                      {getPassengerFullName(passenger)}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.email || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.phone || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.gender || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(passenger.dateOfBirth)}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.nationality || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.passportNumber || "-"}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(passenger.passportExpiry)}
                    </td>

                    <td className="py-3 pr-4 text-muted-foreground">
                      {passenger.roomType || "-"}
                    </td>

                    <td className="py-3 pr-4">
                      <span
                        className={
                          passenger.isLeadPassenger
                            ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                            : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                        }
                      >
                        {passenger.isLeadPassenger ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="py-3 pr-4">
                      <Link
                        href={`/b2b/passengers/${passenger.id}/edit`}
                        className="text-xs font-medium text-[#8B0000] hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isGroupBooking && (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Group Status
          </h2>

          <div className="mt-4 grid gap-4 text-sm md:grid-cols-4">
            <div>
              <div className="text-muted-foreground">Passengers Added</div>
              <div className="font-semibold text-[#001F3F]">
                {passengerCount} / {booking.numberOfGuests}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Payment Status</div>
              <div className="font-semibold">{paymentLabel}</div>
            </div>

            <div>
              <div className="text-muted-foreground">Balance</div>
              <div className="font-semibold text-amber-600">
                {formatCurrency(booking.amountDue, currency)}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Departure</div>
              <div className="font-semibold">
                {formatDate(booking.departureDateSnapshot)}
              </div>
            </div>
          </div>
        </section>
      )}

      {(booking.notes || booking.specialRequests) && (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
            Notes & Special Requests
          </h2>

          <div className="space-y-4 text-sm">
            {booking.notes && (
              <div>
                <div className="mb-1 font-medium text-[#001F3F]">Notes</div>
                <p className="rounded-xl border bg-slate-50 p-4 text-muted-foreground">
                  {booking.notes}
                </p>
              </div>
            )}

            {booking.specialRequests && (
              <div>
                <div className="mb-1 font-medium text-[#001F3F]">
                  Special Requests
                </div>
                <p className="rounded-xl border bg-slate-50 p-4 text-muted-foreground">
                  {booking.specialRequests}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#001F3F]">
          {isGroupBooking ? "Group Actions" : "Booking Actions"}
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/b2b/support?bookingId=${booking.id}`}
            className="rounded-xl border p-4 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Request Change
          </Link>

          <PayNowModal
            bookingId={booking.id}
            bookingReference={bookingCode}
            amountDue={booking.amountDue}
            currency={currency}
            triggerLabel="Submit Payment Proof"
            triggerClassName="rounded-xl border p-4 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          />

          <Link
            href={uploadPassengerListHref}
            className="rounded-xl border p-4 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Upload Passenger List
          </Link>

          <Link
            href={`/api/b2b/bookings/${booking.id}/voucher`}
            className="rounded-xl border p-4 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Download Documents
          </Link>
        </div>
      </section>
    </div>
  );
}