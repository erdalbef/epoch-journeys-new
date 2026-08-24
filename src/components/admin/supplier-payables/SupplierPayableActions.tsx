"use client";

import {
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

type BankAccount = {
  id: string;
  name: string;
  currency: string;
};

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function todayEuropean() {
  const now = new Date();

  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const year =
    now.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatDateTyping(
  value: string,
) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 8);

  if (
    digits.length <= 2
  ) {
    return digits;
  }

  if (
    digits.length <= 4
  ) {
    return `${digits.slice(
      0,
      2,
    )}/${digits.slice(
      2,
    )}`;
  }

  return `${digits.slice(
    0,
    2,
  )}/${digits.slice(
    2,
    4,
  )}/${digits.slice(
    4,
  )}`;
}

function parseEuropeanDate(
  value: string,
) {
  const match =
    value
      .trim()
      .match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/,
      );

  if (!match) {
    return null;
  }

  const day =
    Number(match[1]);

  const month =
    Number(match[2]);

  const year =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        12,
        0,
        0,
      ),
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    return null;
  }

  return `${String(
    year,
  ).padStart(
    4,
    "0",
  )}-${String(
    month,
  ).padStart(
    2,
    "0",
  )}-${String(
    day,
  ).padStart(
    2,
    "0",
  )}`;
}

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
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    amount,
    setAmount,
  ] = useState(
    balance > 0
      ? balance.toFixed(2)
      : "",
  );

  const [
    paymentDate,
    setPaymentDate,
  ] = useState(
    todayEuropean(),
  );

  const [
    bankAccountId,
    setBankAccountId,
  ] = useState("");

  const [
    method,
    setMethod,
  ] = useState(
    "BANK_TRANSFER",
  );

  const [
    reference,
    setReference,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    paymentProof,
    setPaymentProof,
  ] =
    useState<File | null>(
      null,
    );

  async function changeApproval(
    action:
      | "submit"
      | "approve"
      | "reject"
      | "cancel",
  ) {
    setLoading(true);

    try {
      const response =
        await fetch(
          `/api/admin/supplier-payables/${payableId}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action,
              }),
          },
        );

      const data =
        (await response.json()) as {
          error?: string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Update failed.",
        );
      }

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Update failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handlePaymentProof(
    file: File | null,
  ) {
    if (!file) {
      setPaymentProof(
        null,
      );

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
        "Payment proof must be smaller than 10 MB.",
      );

      return;
    }

    setPaymentProof(
      file,
    );
  }

  async function recordPayment(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      toast.error(
        "Payment amount must be greater than zero.",
      );

      return;
    }

    if (
      numericAmount >
      balance
    ) {
      toast.error(
        "Payment cannot exceed the outstanding balance.",
      );

      return;
    }

    if (
      !bankAccountId
    ) {
      toast.error(
        "Please select the bank or cash account.",
      );

      return;
    }

    const parsedPaymentDate =
      parseEuropeanDate(
        paymentDate,
      );

    if (
      !parsedPaymentDate
    ) {
      toast.error(
        "Payment date must use DD/MM/YYYY format.",
      );

      return;
    }

    setLoading(true);

    const formData =
      new FormData();

    formData.set(
      "amount",
      String(
        numericAmount,
      ),
    );

    formData.set(
      "paymentDate",
      parsedPaymentDate,
    );

    formData.set(
      "bankAccountId",
      bankAccountId,
    );

    formData.set(
      "method",
      method,
    );

    if (
      reference.trim()
    ) {
      formData.set(
        "reference",
        reference.trim(),
      );
    }

    if (
      notes.trim()
    ) {
      formData.set(
        "notes",
        notes.trim(),
      );
    }

    if (
      paymentProof
    ) {
      formData.set(
        "paymentProof",
        paymentProof,
      );
    }

    try {
      const response =
        await fetch(
          `/api/admin/supplier-payables/${payableId}/payments`,
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
          .catch(
            () =>
              null,
          )) as {
          success?: boolean;
          error?: string;
        } | null;

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Payment failed.",
        );
      }

      toast.success(
        paymentProof
          ? "Supplier payment recorded and proof saved in Finance Documents."
          : "Supplier payment recorded successfully.",
      );

      setReference("");
      setNotes("");
      setPaymentProof(
        null,
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Payment failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">
          Approval controls
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          A payable must be
          approved before
          supplier payments
          can be recorded.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {approvalStatus ===
            "DRAFT" && (
            <Button
              disabled={
                loading
              }
              onClick={() =>
                changeApproval(
                  "submit",
                )
              }
              label="Submit for Approval"
            />
          )}

          {approvalStatus ===
            "PENDING_APPROVAL" && (
            <>
              <Button
                disabled={
                  loading
                }
                onClick={() =>
                  changeApproval(
                    "approve",
                  )
                }
                label="Approve"
                primary
              />

              <Button
                disabled={
                  loading
                }
                onClick={() =>
                  changeApproval(
                    "reject",
                  )
                }
                label="Reject"
              />
            </>
          )}

          {![
            "CANCELLED",
            "REJECTED",
          ].includes(
            approvalStatus,
          ) &&
            paymentStatus !==
              "PAID" && (
              <Button
                disabled={
                  loading
                }
                onClick={() =>
                  changeApproval(
                    "cancel",
                  )
                }
                label="Cancel Payable"
                danger
              />
            )}
        </div>
      </section>

      {approvalStatus ===
        "APPROVED" &&
        paymentStatus !==
          "PAID" &&
        paymentStatus !==
          "CANCELLED" &&
        balance > 0 && (
          <form
            onSubmit={
              recordPayment
            }
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="font-bold text-slate-950">
              Record supplier
              payment
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Partial payments
              are supported.
              Current balance:{" "}
              <strong>
                {currency}{" "}
                {balance.toFixed(
                  2,
                )}
              </strong>
              . Recording the
              payment also
              posts the
              matching
              cash-out entry
              to the Bank
              Ledger.
            </p>

            <div className="mt-5 grid gap-4">
              <label>
                <span
                  className={
                    labelClass
                  }
                >
                  Amount
                </span>

                <input
                  type="number"
                  min="0.01"
                  max={
                    balance
                  }
                  step="0.01"
                  required
                  value={
                    amount
                  }
                  onChange={(
                    event,
                  ) =>
                    setAmount(
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </label>

              <label>
                <span
                  className={
                    labelClass
                  }
                >
                  Payment Date
                </span>

                <EuropeanDateInput
                  value={
                    paymentDate
                  }
                  onChange={
                    setPaymentDate
                  }
                />
              </label>

              <label>
                <span
                  className={
                    labelClass
                  }
                >
                  Method
                </span>

                <select
                  value={
                    method
                  }
                  onChange={(
                    event,
                  ) =>
                    setMethod(
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  {[
                    "BANK_TRANSFER",
                    "STRIPE",
                    "PAYPAL",
                    "CASH",
                    "OTHER",
                  ].map(
                    (
                      item,
                    ) => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {item.replaceAll(
                          "_",
                          " ",
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span
                  className={
                    labelClass
                  }
                >
                  Bank account
                </span>

                <select
                  required
                  value={
                    bankAccountId
                  }
                  onChange={(
                    event,
                  ) =>
                    setBankAccountId(
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Select bank /
                    cash
                    account...
                  </option>

                  {bankAccounts.map(
                    (
                      account,
                    ) => (
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
                        }{" "}
                        ·{" "}
                        {
                          account.currency
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span
                  className={
                    labelClass
                  }
                >
                  Reference
                </span>

                <input
                  value={
                    reference
                  }
                  onChange={(
                    event,
                  ) =>
                    setReference(
                      event
                        .target
                        .value,
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="Bank transfer reference..."
                />
              </label>

              <label>
                <span
                  className={
                    labelClass
                  }
                >
                  Notes
                </span>

                <textarea
                  value={
                    notes
                  }
                  onChange={(
                    event,
                  ) =>
                    setNotes(
                      event
                        .target
                        .value,
                    )
                  }
                  rows={3}
                  className={
                    textareaClass
                  }
                  placeholder="Optional payment notes..."
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#8B0000]">
                  <FileText className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Payment proof
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Optional.
                    Upload a bank
                    transfer
                    confirmation,
                    receipt or
                    other payment
                    proof. It will
                    also appear in
                    Finance
                    Documents.
                  </p>
                </div>
              </div>

              {!paymentProof ? (
                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-center hover:border-[#001F3F]/40">
                  <Upload className="h-5 w-5 text-slate-400" />

                  <span className="mt-2 text-sm font-semibold text-slate-700">
                    Select payment
                    proof
                  </span>

                  <span className="mt-1 text-xs text-slate-500">
                    PDF, JPG, PNG
                    or WEBP ·
                    Maximum 10 MB
                  </span>

                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(
                      event,
                    ) =>
                      handlePaymentProof(
                        event
                          .target
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
                        paymentProof.name
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {(
                        paymentProof.size /
                        1024 /
                        1024
                      ).toFixed(
                        2,
                      )}{" "}
                      MB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPaymentProof(
                        null,
                      )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-[#8B0000]"
                    aria-label="Remove payment proof"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                loading
              }
              className="mt-5 rounded-xl bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#760000] disabled:opacity-50"
            >
              {loading
                ? "Recording..."
                : "Record Payment"}
            </button>
          </form>
        )}
    </div>
  );
}

function EuropeanDateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  const pickerRef =
    useRef<HTMLInputElement>(
      null,
    );

  const isoValue =
    parseEuropeanDate(
      value,
    ) || "";

  function openCalendar() {
    const picker =
      pickerRef.current;

    if (!picker) {
      return;
    }

    if (
      typeof picker.showPicker ===
      "function"
    ) {
      picker.showPicker();
      return;
    }

    picker.click();
  }

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        value={value}
        maxLength={10}
        onChange={(
          event,
        ) =>
          onChange(
            formatDateTyping(
              event
                .target
                .value,
            ),
          )
        }
        className={`${inputClass} pr-12`}
      />

      <button
        type="button"
        onClick={
          openCalendar
        }
        title="Open calendar"
        aria-label="Open calendar"
        className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#001F3F]"
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      <input
        ref={
          pickerRef
        }
        type="date"
        tabIndex={-1}
        value={
          isoValue
        }
        onChange={(
          event,
        ) => {
          const selected =
            event
              .target
              .value;

          if (
            !selected
          ) {
            onChange(
              "",
            );
            return;
          }

          const [
            year,
            month,
            day,
          ] =
            selected.split(
              "-",
            );

          onChange(
            `${day}/${month}/${year}`,
          );
        }}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        aria-hidden="true"
      />
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
      disabled={
        disabled
      }
      onClick={
        onClick
      }
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

const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#001F3F]/40";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#001F3F]/40";