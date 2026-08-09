"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PaymentMethod,
  RefundReason,
  RefundStatus,
} from "@prisma/client";
import {
  FileText,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

type PaymentOption = {
  id: string;
  amount: number;
  currency: string;
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
};

type BankAccountOption = {
  id: string;
  name: string;
  currency: string;
};

type Props = {
  bookingId: string;
  currency: string;
  amountPaid: number;
  refundableAmount: number;
  payments: PaymentOption[];
  bankAccounts: BankAccountOption[];
};

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function formatMoney(
  value: number,
  currency: string,
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "No paid date";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Invalid date";
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function formatEnumLabel(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

const refundReasons =
  Object.values(
    RefundReason,
  );

const refundStatuses =
  Object.values(
    RefundStatus,
  ).filter(
    (status) =>
      status !==
      RefundStatus.CANCELLED,
  );

const paymentMethods =
  Object.values(
    PaymentMethod,
  );

export default function RefundForm({
  bookingId,
  currency,
  amountPaid,
  refundableAmount,
  payments,
  bankAccounts,
}: Props) {
  const router = useRouter();

  const [
    paymentId,
    setPaymentId,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<RefundStatus>(
    RefundStatus.PENDING,
  );

  const [
    reason,
    setReason,
  ] = useState<RefundReason>(
    RefundReason.OTHER,
  );

  const [
    reasonDetails,
    setReasonDetails,
  ] = useState("");

  const [
    bankAccountId,
    setBankAccountId,
  ] = useState("");

  const [
    method,
    setMethod,
  ] = useState<PaymentMethod>(
    PaymentMethod.BANK_TRANSFER,
  );

  const [
    refundDate,
    setRefundDate,
  ] = useState("");

  const [
    reference,
    setReference,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    refundProof,
    setRefundProof,
  ] = useState<File | null>(
    null,
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const matchingBankAccounts =
    useMemo(
      () =>
        bankAccounts.filter(
          (account) =>
            account.currency ===
            currency,
        ),
      [
        bankAccounts,
        currency,
      ],
    );

  const selectedPayment =
    payments.find(
      (payment) =>
        payment.id ===
        paymentId,
    );

  const amountNumber =
    Number(amount || 0);

  const afterRefund =
    Math.max(
      0,
      refundableAmount -
        (Number.isFinite(
          amountNumber,
        )
          ? amountNumber
          : 0),
    );

  function handleRefundProof(
    file: File | null,
  ) {
    if (!file) {
      setRefundProof(null);
      return;
    }

    if (
      !ALLOWED_FILE_TYPES.includes(
        file.type,
      )
    ) {
      toast.error(
        "Only PDF, JPG, PNG and WEBP files are allowed.",
      );

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      toast.error(
        "Refund proof must be smaller than 10 MB.",
      );

      return;
    }

    setRefundProof(file);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !Number.isFinite(
        amountNumber,
      ) ||
      amountNumber <= 0
    ) {
      toast.error(
        "Refund amount must be greater than zero.",
      );

      return;
    }

    if (
      amountNumber >
      refundableAmount
    ) {
      toast.error(
        `Maximum refundable amount is ${formatMoney(
          refundableAmount,
          currency,
        )}.`,
      );

      return;
    }

    if (!bankAccountId) {
      toast.error(
        "Please select the bank or cash account for this refund.",
      );

      return;
    }

    if (
      status ===
        RefundStatus.PAID &&
      !method
    ) {
      toast.error(
        "Payment method is required for a paid refund.",
      );

      return;
    }

    setSubmitting(true);

    const formData =
      new FormData();

    formData.set(
      "bookingId",
      bookingId,
    );

    if (paymentId) {
      formData.set(
        "paymentId",
        paymentId,
      );
    }

    formData.set(
      "bankAccountId",
      bankAccountId,
    );

    formData.set(
      "amount",
      String(amountNumber),
    );

    formData.set(
      "currency",
      currency,
    );

    formData.set(
      "status",
      status,
    );

    if (
      status ===
      RefundStatus.PAID
    ) {
      formData.set(
        "method",
        method,
      );
    }

    formData.set(
      "reason",
      reason,
    );

    if (
      reasonDetails.trim()
    ) {
      formData.set(
        "reasonDetails",
        reasonDetails.trim(),
      );
    }

    if (refundDate) {
      formData.set(
        "refundDate",
        refundDate,
      );
    }

    if (reference.trim()) {
      formData.set(
        "reference",
        reference.trim(),
      );
    }

    if (notes.trim()) {
      formData.set(
        "notes",
        notes.trim(),
      );
    }

    if (refundProof) {
      formData.set(
        "refundProof",
        refundProof,
      );
    }

    try {
      const response =
        await fetch(
          "/api/admin/refunds",
          {
            method:
              "POST",
            body:
              formData,
          },
        );

      const data =
        (await response
          .json()
          .catch(() => null)) as {
          success?: boolean;
          error?: string;
          financeDocument?: {
            id: string;
          } | null;
        } | null;

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Failed to create refund.",
        );
      }

      if (
        status ===
        RefundStatus.PAID
      ) {
        toast.success(
          refundProof
            ? "Refund recorded, posted to the Bank Ledger, and proof saved in Finance Documents."
            : "Refund recorded and posted to the Bank Ledger.",
        );
      } else {
        toast.success(
          refundProof
            ? "Refund record created and supporting document saved in Finance Documents."
            : "Refund record created successfully.",
        );
      }

      setPaymentId("");
      setAmount("");

      setStatus(
        RefundStatus.PENDING,
      );

      setReason(
        RefundReason.OTHER,
      );

      setReasonDetails("");
      setBankAccountId("");

      setMethod(
        PaymentMethod.BANK_TRANSFER,
      );

      setRefundDate("");
      setReference("");
      setNotes("");
      setRefundProof(null);

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create refund.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (amountPaid <= 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Customer Refund
        </h2>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">
            No customer payment
            has been received for
            this booking, so there
            is currently nothing
            to refund.
          </p>
        </div>
      </section>
    );
  }

  if (
    refundableAmount <= 0
  ) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Customer Refund
        </h2>

        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            There is no remaining
            refundable balance for
            this booking.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8B0000]">
          Customer Money Out
        </p>

        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          Customer Refund
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Create a partial or
          full customer refund
          while preserving the
          original payment
          history.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Gross Received"
          value={formatMoney(
            amountPaid,
            currency,
          )}
        />

        <SummaryCard
          label="Refundable"
          value={formatMoney(
            refundableAmount,
            currency,
          )}
          strong
        />

        <SummaryCard
          label="After This Refund"
          value={formatMoney(
            afterRefund,
            currency,
          )}
        />
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-5 space-y-5"
      >
        <div>
          <label
            className={
              labelClass
            }
          >
            Original Payment
          </label>

          <select
            value={paymentId}
            onChange={(event) =>
              setPaymentId(
                event.target
                  .value,
              )
            }
            className={
              inputClass
            }
          >
            <option value="">
              General booking
              refund
            </option>

            {payments.map(
              (payment) => (
                <option
                  key={
                    payment.id
                  }
                  value={
                    payment.id
                  }
                >
                  {formatMoney(
                    payment.amount,
                    payment.currency,
                  )}
                  {" · "}
                  {formatDate(
                    payment.paidAt ??
                      payment.createdAt,
                  )}
                  {payment.reference
                    ? ` · ${payment.reference}`
                    : ""}
                </option>
              ),
            )}
          </select>

          {selectedPayment ? (
            <p className="mt-1.5 text-xs text-slate-500">
              Selected original
              payment:{" "}
              {formatMoney(
                selectedPayment.amount,
                selectedPayment.currency,
              )}
              .
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500">
              Optional. Leave
              blank when the refund
              applies generally to
              the booking rather
              than one specific
              receipt.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className={
                labelClass
              }
            >
              Refund Amount *
            </label>

            <input
              type="number"
              min="0.01"
              max={
                refundableAmount
              }
              step="0.01"
              required
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
              placeholder="0.00"
            />
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Currency
            </label>

            <input
              value={currency}
              readOnly
              className={`${inputClass} bg-slate-50`}
            />
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Refund Reason *
            </label>

            <select
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target
                    .value as RefundReason,
                )
              }
              className={
                inputClass
              }
            >
              {refundReasons.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {formatEnumLabel(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Refund Status *
            </label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as RefundStatus,
                )
              }
              className={
                inputClass
              }
            >
              {refundStatuses.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {formatEnumLabel(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Bank / Cash
              Account *
            </label>

            <select
              value={
                bankAccountId
              }
              onChange={(event) =>
                setBankAccountId(
                  event.target
                    .value,
                )
              }
              required
              className={
                inputClass
              }
            >
              <option value="">
                Select account...
              </option>

              {matchingBankAccounts.map(
                (account) => (
                  <option
                    key={
                      account.id
                    }
                    value={
                      account.id
                    }
                  >
                    {
                      account.name
                    }
                    {" · "}
                    {
                      account.currency
                    }
                  </option>
                ),
              )}
            </select>

            {matchingBankAccounts.length ===
              0 && (
              <p className="mt-1.5 text-xs text-amber-700">
                No active{" "}
                {currency} bank/cash
                account is
                available.
              </p>
            )}
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Payment Method
            </label>

            <select
              value={method}
              onChange={(event) =>
                setMethod(
                  event.target
                    .value as PaymentMethod,
                )
              }
              disabled={
                status !==
                RefundStatus.PAID
              }
              className={
                inputClass
              }
            >
              {paymentMethods.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {formatEnumLabel(
                      item,
                    )}
                  </option>
                ),
              )}
            </select>

            {status !==
              RefundStatus.PAID && (
              <p className="mt-1.5 text-xs text-slate-500">
                Required only when
                the refund has
                actually been paid.
              </p>
            )}
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Refund Date
            </label>

            <input
              type="date"
              value={refundDate}
              onChange={(event) =>
                setRefundDate(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
            />
          </div>

          <div>
            <label
              className={
                labelClass
              }
            >
              Reference
            </label>

            <input
              value={reference}
              onChange={(event) =>
                setReference(
                  event.target
                    .value,
                )
              }
              className={
                inputClass
              }
              placeholder="Bank transfer / refund reference"
            />
          </div>
        </div>

        <div>
          <label
            className={
              labelClass
            }
          >
            Reason Details
          </label>

          <textarea
            rows={3}
            value={
              reasonDetails
            }
            onChange={(event) =>
              setReasonDetails(
                event.target
                  .value,
              )
            }
            className={
              textareaClass
            }
            placeholder="Explain the reason for the refund..."
          />
        </div>

        <div>
          <label
            className={
              labelClass
            }
          >
            Internal Notes
          </label>

          <textarea
            rows={3}
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target
                  .value,
              )
            }
            className={
              textareaClass
            }
            placeholder="Internal refund notes..."
          />
        </div>

        {/* ============================================= */}
        {/* REFUND PROOF */}
        {/* ============================================= */}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#8B0000] shadow-sm">
              <FileText className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">
                Refund Proof
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Optional. Upload a
                bank confirmation,
                credit note, refund
                receipt or other
                supporting document.
                It will also appear
                in Finance Documents.
              </p>
            </div>
          </div>

          {!refundProof ? (
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center transition hover:border-[#001F3F]/40">
              <Upload className="h-5 w-5 text-slate-400" />

              <span className="mt-2 text-sm font-semibold text-slate-700">
                Select refund
                document
              </span>

              <span className="mt-1 text-xs text-slate-500">
                PDF, JPG, PNG or
                WEBP · Maximum 10 MB
              </span>

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  handleRefundProof(
                    event.target
                      .files?.[0] ??
                      null,
                  )
                }
                className="sr-only"
              />
            </label>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {
                    refundProof.name
                  }
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {(
                    refundProof.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRefundProof(
                    null,
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-[#8B0000]"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {status ===
          RefundStatus.PAID && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Bank Ledger Posting
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              Saving this refund
              as Paid creates a
              <strong>
                {" "}
                REFUND / OUT
              </strong>{" "}
              transaction against
              the selected bank or
              cash account.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={
            submitting ||
            matchingBankAccounts.length ===
              0
          }
          className="rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Saving..."
            : status ===
                RefundStatus.PAID
              ? "Pay Refund"
              : "Save Refund"}
        </button>
      </form>
    </section>
  );
}

const labelClass =
  "mb-1.5 block text-sm font-semibold text-slate-700";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50 disabled:bg-slate-50 disabled:text-slate-400";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

function SummaryCard({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 font-bold ${
          strong
            ? "text-[#8B0000]"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}