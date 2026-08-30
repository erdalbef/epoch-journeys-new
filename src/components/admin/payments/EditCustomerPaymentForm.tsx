"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
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
};

type BankAccountOption = {
  id: string;
  name: string;
  currency: string;
};

type InitialPayment = {
  id: string;
  bookingId: string | null;
  tourId: string | null;
  agencyGroupName: string | null;
  amount: number;
  currency: string;
  bankAccountId: string;
  method: string;
  paidAt: string;
  reference: string | null;
  notes: string | null;
  status: string;
  proofUrl: string | null;
};

type Props = {
  payment: InitialPayment;
  tours: TourOption[];
  bookings: BookingOption[];
  bankAccounts: BankAccountOption[];
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

export default function EditCustomerPaymentForm({
  payment,
  tours,
  bookings,
  bankAccounts,
}: Props) {
  const router = useRouter();
  const [bookingId, setBookingId] = useState(payment.bookingId || "");
  const [tourId, setTourId] = useState(payment.tourId || "");
  const [agencyGroupName, setAgencyGroupName] = useState(payment.agencyGroupName || "");
  const [amount, setAmount] = useState(String(payment.amount));
  const [currency, setCurrency] = useState(payment.currency);
  const [bankAccountId, setBankAccountId] = useState(payment.bankAccountId);
  const [method, setMethod] = useState(payment.method);
  const [paidAt, setPaidAt] = useState(payment.paidAt);
  const [reference, setReference] = useState(payment.reference || "");
  const [notes, setNotes] = useState(payment.notes || "");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      const response = await fetch(`/api/admin/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to update customer payment.");
      }

      if (paymentProof) {
        const proofForm = new FormData();
        proofForm.set("file", paymentProof);

        const proofResponse = await fetch(
          `/api/admin/payments/${payment.id}/proof`,
          {
            method: "POST",
            body: proofForm,
          },
        );

        const proofData = (await proofResponse.json().catch(() => null)) as
          | { success?: boolean; error?: string }
          | null;

        if (!proofResponse.ok || !proofData?.success) {
          toast.warning(
            `Payment was updated, but proof upload failed: ${
              proofData?.error || "Upload failed."
            }`,
          );
          router.refresh();
          return;
        }

        toast.success("Payment updated and proof saved.");
        setPaymentProof(null);
      } else {
        toast.success("Customer payment updated successfully.");
      }

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update customer payment.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function removePayment() {
    if (
      !window.confirm(
        "Permanently delete this payment? The linked ledger transaction and booking allocation will also be removed/recalculated.",
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to delete customer payment.");
      }

      toast.success("Customer payment deleted.");
      router.push("/admin/payments");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete customer payment.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-[#001F3F]">Payment Details</h2>
        <p className="mt-1 text-sm text-slate-500">
          Changes to financial fields are synchronized with the linked Finance Ledger transaction.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tour / Package">
          <select value={tourId} onChange={(e) => chooseTour(e.target.value)} className={inputClass} disabled={Boolean(selectedBooking)}>
            <option value="">Not linked to a tour / package</option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.title}{tour.tourCode ? ` — ${tour.tourCode}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Booking (optional)">
          <select value={bookingId} onChange={(e) => chooseBooking(e.target.value)} className={inputClass}>
            <option value="">No booking selected</option>
            {bookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.bookingDisplayCode || booking.bookingReference} — {booking.tourTitleSnapshot}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Agency / Parish / Group / Customer">
          <input value={agencyGroupName} onChange={(e) => setAgencyGroupName(e.target.value)} className={inputClass} />
        </Field>

        <Field label="Currency *">
          <select
            value={currency}
            onChange={(e) => { setCurrency(e.target.value); setBankAccountId(""); }}
            className={inputClass}
            disabled={Boolean(selectedBooking)}
          >
            {Array.from(new Set(["EUR", "USD", "GBP", ...bankAccounts.map((a) => a.currency)])).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label={`Amount (${currency}) *`}>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>

        <Field label="Receiving Bank Account *">
          <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className={inputClass}>
            <option value="">Select receiving account</option>
            {matchingBanks.map((account) => (
              <option key={account.id} value={account.id}>{account.name} — {account.currency}</option>
            ))}
          </select>
        </Field>

        <Field label="Payment Method *">
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>

        <Field label="Payment Date *">
          <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputClass} />
        </Field>

        <Field label="Bank / Payment Reference">
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
        </Field>

        <Field label="Internal Notes">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="rounded-xl border bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-700">Payment Proof</div>

        {payment.proofUrl ? (
          <a
            href={payment.proofUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Open Current Proof
          </a>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No proof document is attached.
          </p>
        )}

        <div className="mt-4">
          <label className="block text-sm font-semibold text-slate-700">
            {payment.proofUrl ? "Replace Proof (optional)" : "Upload Proof (optional)"}
          </label>

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
            className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />

          <p className="mt-1 text-xs text-slate-500">
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
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View Selected Proof
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={removePayment}
          disabled={deleting || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Deleting..." : "Delete Payment"}
        </button>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push("/admin/payments")} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">
            Back
          </button>
          <button type="submit" disabled={loading || deleting} className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#6f0000] disabled:opacity-50">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
