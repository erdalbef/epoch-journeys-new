"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  bookingReference: string;
  amountDue: number;
  currency: string;
};

export default function PayNowModal({
  bookingId,
  bookingReference,
  amountDue,
  currency,
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

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
          setOpen(false);
          router.refresh();
        }, 800);
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
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[#8B0000] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6f0000]"
      >
        Submit Payment
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#001F3F]">
                  Submit Payment Proof
                </h2>
                <p className="text-sm text-gray-500">
                  Ref: {bookingReference}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border px-2 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mb-4 rounded-xl border bg-gray-50 p-4">
              <div className="text-sm text-gray-600">Amount Due</div>
              <div className="text-lg font-bold text-red-700">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency,
                }).format(amountDue)}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm">Payment Method</label>
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
                <label className="mb-1 block text-sm">
                  Upload Proof (PDF or Image) <span className="text-red-600">*</span>
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
                <label className="mb-1 block text-sm">Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  rows={4}
                />
              </div>

              {error ? <div className="text-sm text-red-600">{error}</div> : null}
              {success ? (
                <div className="text-sm text-green-600">{success}</div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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