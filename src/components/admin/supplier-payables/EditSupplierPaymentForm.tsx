"use client";

import { useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  payable: {
    id: string;
    currency: string;
    approvedAmount: number;
    creditAmount: number;
  };
  payment: {
    id: string;
    amount: number;
    currency: string;
    bankAccountId: string | null;
    paymentDate: string;
    method: string;
    reference: string | null;
    notes: string | null;
    hasProof: boolean;
    proofFileName: string | null;
  };
  bankAccounts: Array<{
    id: string;
    name: string;
    currency: string;
  }>;
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function EditSupplierPaymentForm({
  payable,
  payment,
  bankAccounts,
}: Props) {
  const router = useRouter();

  const [amount, setAmount] = useState(String(payment.amount));
  const [bankAccountId, setBankAccountId] = useState(
    payment.bankAccountId || "",
  );
  const [paymentDate, setPaymentDate] = useState(payment.paymentDate);
  const [method, setMethod] = useState(payment.method);
  const [reference, setReference] = useState(payment.reference || "");
  const [notes, setNotes] = useState(payment.notes || "");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const matchingBanks = bankAccounts.filter(
    (account) => account.currency === payable.currency,
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }

    if (!bankAccountId) {
      toast.error("Select the bank or cash account used for this payment.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.set("amount", String(numericAmount));
      formData.set("bankAccountId", bankAccountId);
      formData.set("paymentDate", paymentDate);
      formData.set("method", method);
      formData.set("reference", reference.trim());
      formData.set("notes", notes.trim());

      if (paymentProof) {
        formData.set("paymentProof", paymentProof);
      }

      const response = await fetch(
        `/api/admin/supplier-payables/${payable.id}/payments/${payment.id}`,
        {
          method: "PATCH",
          body: formData,
        },
      );

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error || "Failed to update supplier payment.",
        );
      }

      toast.success(
        paymentProof
          ? "Supplier payment and proof updated."
          : "Supplier payment updated successfully.",
      );

      router.push(`/admin/supplier-payables/${payable.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update supplier payment.",
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
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={`Payment Amount (${payable.currency}) *`}>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Payment Date *">
          <input
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Bank / Cash Account *">
          <select
            value={bankAccountId}
            onChange={(event) => setBankAccountId(event.target.value)}
            className={inputClass}
          >
            <option value="">Select account</option>

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
            <option value="COMPANY_CREDIT_CARD">Company Credit Card</option>
            <option value="CASH">Cash</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>

        <Field label="Bank / Payment Reference">
          <input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Internal Notes">
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="rounded-xl border bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-700">
          Payment Proof
        </div>

        {payment.hasProof ? (
          <div className="mt-2">
            <a
              href={`/api/admin/supplier-payables/${payable.id}/payments/${payment.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open Current Proof
            </a>

            {payment.proofFileName ? (
              <p className="mt-1 text-xs text-slate-500">
                {payment.proofFileName}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm font-medium text-amber-700">
            No payment proof is currently attached.
          </p>
        )}

        <label className="mt-4 block text-sm font-semibold text-slate-700">
          {payment.hasProof
            ? "Replace Payment Proof (optional)"
            : "Upload Payment Proof (optional)"}
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
              toast.error(
                "Only PDF, JPG, PNG and WEBP files are allowed.",
              );
              event.target.value = "";
              setPaymentProof(null);
              return;
            }

            if (file.size > 10 * 1024 * 1024) {
              toast.error(
                "Payment proof must be smaller than 10 MB.",
              );
              event.target.value = "";
              setPaymentProof(null);
              return;
            }

            setPaymentProof(file);
          }}
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />

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

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Approved payable:{" "}
        <strong>
          {payable.currency} {payable.approvedAmount.toFixed(2)}
        </strong>

        {payable.creditAmount > 0 ? (
          <>
            {" "}
            · Credit:{" "}
            <strong>
              {payable.currency} {payable.creditAmount.toFixed(2)}
            </strong>
          </>
        ) : null}

        . The system will prevent the corrected payment total from
        exceeding the net approved payable amount.
      </div>

      <div className="flex justify-end gap-3 border-t pt-5">
        <button
          type="button"
          onClick={() =>
            router.push(`/admin/supplier-payables/${payable.id}`)
          }
          className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#6f0000] disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
