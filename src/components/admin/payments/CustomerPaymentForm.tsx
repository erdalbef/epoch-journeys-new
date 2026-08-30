"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

type TourOption = {
  id: string;
  title: string;
  tourCode: string | null;
  currency: string;
};

type BookingOption = {
  id: string;
  bookingReference: string;
  bookingDisplayCode: string | null;
  tourId: string;
  tourTitleSnapshot: string;
  agencyNameSnapshot: string | null;
  agentNameSnapshot: string | null;
  groupName: string | null;
  customerName: string | null;
  currency: string;
  totalPrice: number;
  amountPaid: number;
  amountDue: number;
};

type BankAccountOption = {
  id: string;
  name: string;
  currency: string;
};

type Props = {
  tours: TourOption[];
  bookings: BookingOption[];
  bankAccounts: BankAccountOption[];
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

export default function CustomerPaymentForm({
  tours,
  bookings,
  bankAccounts,
}: Props) {
  const router = useRouter();

  const [bookingId, setBookingId] = useState("");
  const [tourId, setTourId] = useState("");
  const [agencyGroupName, setAgencyGroupName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [bankAccountId, setBankAccountId] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [paidAt, setPaidAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === bookingId) ?? null,
    [bookingId, bookings],
  );

  const matchingBanks = useMemo(
    () => bankAccounts.filter((account) => account.currency === currency),
    [bankAccounts, currency],
  );

  function chooseBooking(value: string) {
    setBookingId(value);

    const booking = bookings.find((item) => item.id === value);

    if (!booking) return;

    setTourId(booking.tourId);
    setCurrency(booking.currency);
    setAgencyGroupName(
      booking.agencyNameSnapshot ||
        booking.agentNameSnapshot ||
        booking.groupName ||
        booking.customerName ||
        "",
    );
    setBankAccountId("");
  }

  function chooseTour(value: string) {
    setTourId(value);

    const tour = tours.find((item) => item.id === value);

    if (tour && !bookingId) {
      setCurrency(tour.currency || "EUR");
      setBankAccountId("");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    if (!bankAccountId) {
      toast.error("Select the Epoch bank account that received the payment.");
      return;
    }

    if (!bookingId && !tourId && !agencyGroupName.trim()) {
      toast.error(
        "Enter an Agency / Parish / Group / Customer or select a Tour / Package.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: bookingId || null,
          tourId: tourId || null,
          agencyGroupName: agencyGroupName.trim() || null,
          amount: numericAmount,
          currency,
          bankAccountId,
          method,
          paidAt,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: string;
            payment?: {
              id: string;
            };
          }
        | null;

      if (!response.ok || !data?.success || !data.payment?.id) {
        throw new Error(data?.error || "Failed to record customer payment.");
      }

      if (paymentProof) {
        const proofForm = new FormData();
        proofForm.set("file", paymentProof);

        const proofResponse = await fetch(
          `/api/admin/payments/${data.payment.id}/proof`,
          {
            method: "POST",
            body: proofForm,
          },
        );

        const proofData = (await proofResponse.json().catch(() => null)) as
          | {
              success?: boolean;
              error?: string;
            }
          | null;

        if (!proofResponse.ok || !proofData?.success) {
          toast.warning(
            `Payment was recorded, but the proof could not be saved: ${
              proofData?.error || "Upload failed."
            }`,
          );
        } else {
          toast.success(
            "Customer payment recorded and proof saved in Finance Documents.",
          );
        }
      } else {
        toast.success("Customer payment recorded successfully.");
      }

      router.push("/admin/payments");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to record customer payment.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-bold text-[#001F3F]">
          Customer Receipt Details
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Booking is optional. Link the receipt to the tour/package and
          agency/parish/group whenever that information is available.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tour / Package">
          <select
            value={tourId}
            onChange={(event) => chooseTour(event.target.value)}
            className={inputClass}
            disabled={Boolean(selectedBooking)}
          >
            <option value="">Not linked to a tour / package</option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.title}
                {tour.tourCode ? ` — ${tour.tourCode}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Booking (optional)">
          <select
            value={bookingId}
            onChange={(event) => chooseBooking(event.target.value)}
            className={inputClass}
          >
            <option value="">No booking selected</option>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.bookingDisplayCode || booking.bookingReference} —{" "}
                {booking.tourTitleSnapshot}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Agency / Parish / Group / Customer">
          <input
            value={agencyGroupName}
            onChange={(event) => setAgencyGroupName(event.target.value)}
            className={inputClass}
            placeholder="e.g. GLORY TOURS / JOSSIE"
          />
        </Field>

        <Field label="Currency *">
          <select
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value);
              setBankAccountId("");
            }}
            className={inputClass}
            disabled={Boolean(selectedBooking)}
          >
            {Array.from(
              new Set([
                "EUR",
                "USD",
                "GBP",
                ...bankAccounts.map((account) => account.currency),
              ]),
            ).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Amount (${currency}) *`}>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
            placeholder="0.00"
          />
        </Field>

        <Field label="Receiving Bank Account *">
          <select
            value={bankAccountId}
            onChange={(event) => setBankAccountId(event.target.value)}
            className={inputClass}
          >
            <option value="">Select receiving account</option>
            {matchingBanks.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} — {account.currency}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Payment Method *">
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className={inputClass}
          >
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>

        <Field label="Payment Date *">
          <input
            type="date"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Bank / Payment Reference">
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className={inputClass}
            placeholder="Transfer / receipt reference"
          />
        </Field>

        <Field label="Internal Notes">
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Payment Proof (optional)">
          <div className="space-y-2">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;

                if (!file) {
                  setPaymentProof(null);
                  return;
                }

                const allowed = [
                  "application/pdf",
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                ];

                if (!allowed.includes(file.type)) {
                  toast.error("Only PDF, JPG, PNG and WEBP files are allowed.");
                  event.target.value = "";
                  setPaymentProof(null);
                  return;
                }

                if (file.size > 10 * 1024 * 1024) {
                  toast.error("Payment proof must be smaller than 10 MB.");
                  event.target.value = "";
                  setPaymentProof(null);
                  return;
                }

                setPaymentProof(file);
              }}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />

            <p className="text-xs text-slate-500">
              Optional. PDF, JPG, PNG or WEBP, maximum 10 MB.
            </p>

            {paymentProof ? (
              <button
                type="button"
                onClick={() => {
                  const url = URL.createObjectURL(paymentProof);
                  window.open(url, "_blank", "noopener,noreferrer");
                  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Proof
              </button>
            ) : null}
          </div>
        </Field>
      </div>

      {selectedBooking ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>
            {selectedBooking.bookingDisplayCode ||
              selectedBooking.bookingReference}
          </strong>{" "}
          is selected. The payment will update the booking balance and will be
          automatically allocated to its oldest open installment(s).
          <div className="mt-2">
            Outstanding:{" "}
            <strong>
              {selectedBooking.amountDue.toFixed(2)}{" "}
              {selectedBooking.currency}
            </strong>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          No booking is selected. This will be recorded as a standalone
          customer receipt and can still be linked to a Tour / Package and
          Agency / Parish / Group.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Recording..." : "Record Received Payment"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
