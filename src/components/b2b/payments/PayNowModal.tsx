"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  bookingReference: string;
  amountDue: number;
  currency: string;
  triggerLabel?: string;
  triggerClassName?: string;
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function PayNowModal({
  bookingId,
  bookingReference,
  amountDue,
  currency,
  triggerLabel = "Submit Payment",
  triggerClassName = "rounded-lg bg-[#8B0000] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6f0000]",
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(amountDue));
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setAmount(String(amountDue));
    setMethod("BANK_TRANSFER");
    setNote("");
    setFile(null);
    setError("");
    setSuccess("");
  }

  function openModal() {
    resetForm();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }

    if (numericAmount > amountDue) {
      setError("Amount cannot be greater than amount due.");
      return;
    }

    if (!file) {
      setError("Please upload payment proof before submitting.");
      return;
    }

    startTransition(async () => {
      try {
        const uploadForm = new FormData();
        uploadForm.append("file", file);

        const uploadRes = await fetch("/api/upload/payment-proof", {
          method: "POST",
          body: uploadForm,
        });

        const uploadData = (await uploadRes.json()) as {
          success?: boolean;
          url?: string;
          error?: string;
        };

        if (!uploadRes.ok || !uploadData.url) {
          setError(uploadData.error || "Failed to upload file.");
          return;
        }

        const formData = new FormData();
        formData.append("bookingId", bookingId);
        formData.append("amount", amount);
        formData.append("currency", currency);
        formData.append("method", method);
        formData.append("note", note);
        formData.append("proofUrl", uploadData.url);

        const res = await fetch("/api/b2b/payments/submit", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as {
          success?: boolean;
          error?: string;
        };

        if (!res.ok) {
          setError(data.error || "Failed to submit payment.");
          return;
        }

        setSuccess("Payment submitted successfully.");

        setTimeout(() => {
          closeModal();
          router.refresh();
        }, 900);
      } catch (err) {
        console.error("Payment submit error:", err);
        setError("Something went wrong.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#001F3F]">
                  Submit Payment Proof
                </h2>
                <p className="text-sm text-gray-500">Ref: {bookingReference}</p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded border px-2 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mb-4 rounded-xl border bg-gray-50 p-4">
              <div className="text-sm text-gray-600">Amount Due</div>
              <div className="text-lg font-bold text-red-700">
                {formatCurrency(amountDue, currency)}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Amount</label>
                <input
                  type="number"
                  min="0"
                  max={amountDue}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Maximum allowed: {formatCurrency(amountDue, currency)}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Upload Proof (PDF or Image){" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Required. Your payment will be reviewed by admin.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  rows={4}
                  placeholder="Optional transfer details, sender name, bank reference, etc."
                />
              </div>

              {error ? <div className="text-sm text-red-600">{error}</div> : null}
              {success ? (
                <div className="text-sm text-green-600">{success}</div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#001F3F] px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                  {isPending ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}