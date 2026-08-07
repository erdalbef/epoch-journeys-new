"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BankAccount = {
  id: string;
  name: string;
  currency: string;
};

export default function SupplierPayableActions({
  payableId,
  approvalStatus,
  paymentStatus,
  balance,
  currency,
  bankAccounts,
}: {
  payableId: string;
  approvalStatus: string;
  paymentStatus: string;
  balance: number;
  currency: string;
  bankAccounts: BankAccount[];
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(balance > 0 ? balance.toFixed(2) : "");
  const [bankAccountId, setBankAccountId] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");

  async function changeApproval(action: "submit" | "approve" | "reject" | "cancel") {
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/supplier-payables/${payableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(data.error || "Update failed.");

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setLoading(false);
    }
  }

  async function recordPayment(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/supplier-payables/${payableId}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(amount),
            bankAccountId: bankAccountId || null,
            method,
            reference: reference.trim() || null,
          }),
        },
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(data.error || "Payment failed.");

      setReference("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Payment failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">Approval controls</h2>
        <p className="mt-1 text-sm text-slate-500">
          A payable must be approved before supplier payments can be recorded.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {approvalStatus === "DRAFT" && (
            <Button
              disabled={loading}
              onClick={() => changeApproval("submit")}
              label="Submit for Approval"
            />
          )}

          {approvalStatus === "PENDING_APPROVAL" && (
            <>
              <Button
                disabled={loading}
                onClick={() => changeApproval("approve")}
                label="Approve"
                primary
              />
              <Button
                disabled={loading}
                onClick={() => changeApproval("reject")}
                label="Reject"
              />
            </>
          )}

          {!["CANCELLED", "REJECTED"].includes(approvalStatus) &&
            paymentStatus !== "PAID" && (
              <Button
                disabled={loading}
                onClick={() => changeApproval("cancel")}
                label="Cancel Payable"
                danger
              />
            )}
        </div>
      </section>

      {approvalStatus === "APPROVED" &&
        paymentStatus !== "PAID" &&
        paymentStatus !== "CANCELLED" &&
        balance > 0 && (
          <form
            onSubmit={recordPayment}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="font-bold text-slate-950">Record supplier payment</h2>
            <p className="mt-1 text-sm text-slate-500">
              Partial payments are supported. Current balance: {currency}{" "}
              {balance.toFixed(2)}. Recording the payment also posts the matching
              cash-out entry to the Bank Ledger.
            </p>

            <div className="mt-4 grid gap-3">
              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </span>
                <input
                  type="number"
                  min="0.01"
                  max={balance}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Method
                </span>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  {["BANK_TRANSFER", "STRIPE", "PAYPAL", "CASH", "OTHER"].map(
                    (item) => (
                      <option key={item} value={item}>
                        {item.replaceAll("_", " ")}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bank account
                </span>
                <select
                  required
                  value={bankAccountId}
                  onChange={(event) => setBankAccountId(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="">Select bank / cash account...</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {account.currency}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reference
                </span>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  placeholder="Bank transfer reference..."
                />
              </label>
            </div>

            <button
              disabled={loading}
              className="mt-4 rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Recording..." : "Record Payment"}
            </button>
          </form>
        )}
    </div>
  );
}

function Button({
  label,
  onClick,
  disabled,
  primary = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
        primary
          ? "bg-[#001F3F] text-white"
          : danger
            ? "bg-red-50 text-red-700"
            : "border border-slate-200 bg-white text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}
