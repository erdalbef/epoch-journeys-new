"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Pencil, Plus, Save, Trash2, X } from "lucide-react";

type InstallmentType =
  | "DEPOSIT_1"
  | "DEPOSIT_2"
  | "DEPOSIT_3"
  | "FINAL"
  | "CUSTOM";

type InstallmentStatus =
  | "PENDING"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

type ScheduleItem = {
  id: string;
  type: InstallmentType;
  title: string | null;
  dueDate: string;
  amount: number;
  amountPaid: number;
  status: InstallmentStatus;
  paidAt: string | null;
  notes: string | null;
  allocationCount: number;
  allocatedAmount: number;
};

type Props = {
  bookingId: string;
  bookingReference: string;
  currency: string;
  totalPrice: number;
  amountPaid: number;
  schedules: ScheduleItem[];
};

type FormState = {
  id?: string;
  type: InstallmentType;
  title: string;
  dueDate: string;
  amount: string;
  notes: string;
};

function blankForm(): FormState {
  return {
    type: "DEPOSIT_1",
    title: "",
    dueDate: "",
    amount: "",
    notes: "",
  };
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function typeLabel(type: InstallmentType) {
  switch (type) {
    case "DEPOSIT_1":
      return "Deposit 1";
    case "DEPOSIT_2":
      return "Deposit 2";
    case "DEPOSIT_3":
      return "Deposit 3";
    case "FINAL":
      return "Final Payment";
    default:
      return "Custom";
  }
}

function statusClass(status: InstallmentStatus) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-800";
    case "PARTIALLY_PAID":
      return "bg-amber-100 text-amber-800";
    case "OVERDUE":
      return "bg-red-100 text-red-800";
    case "CANCELLED":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

export default function BookingPaymentSchedule({
  bookingId,
  bookingReference,
  currency,
  totalPrice,
  amountPaid,
  schedules,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const scheduledTotal = useMemo(
    () =>
      schedules
        .filter((item) => item.status !== "CANCELLED")
        .reduce((sum, item) => sum + item.amount, 0),
    [schedules],
  );

  const schedulePaid = useMemo(
    () =>
      schedules
        .filter((item) => item.status !== "CANCELLED")
        .reduce((sum, item) => sum + item.amountPaid, 0),
    [schedules],
  );

  const scheduledBalance = Math.max(0, scheduledTotal - schedulePaid);
  const bookingOutstanding = Math.max(0, totalPrice - amountPaid);
  const unscheduled = totalPrice - scheduledTotal;

  function openNew() {
    setForm(blankForm());
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function openEdit(item: ScheduleItem) {
    setForm({
      id: item.id,
      type: item.type,
      title: item.title ?? "",
      dueDate: item.dueDate.slice(0, 10),
      amount: String(item.amount),
      notes: item.notes ?? "",
    });
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(blankForm());
    setError("");
  }

  function save() {
    setError("");
    setMessage("");

    const amount = Number(form.amount);

    if (!form.dueDate) {
      setError("Please enter the installment due date.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid installment amount.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          form.id
            ? `/api/admin/bookings/${bookingId}/payment-schedules/${form.id}`
            : `/api/admin/bookings/${bookingId}/payment-schedules`,
          {
            method: form.id ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          },
        );

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          setError(data?.error || "Failed to save payment schedule.");
          return;
        }

        setMessage(
          form.id
            ? "Installment updated successfully."
            : "Installment added successfully.",
        );
        setShowForm(false);
        setForm(blankForm());
        router.refresh();
      } catch (saveError) {
        console.error(saveError);
        setError("Something went wrong while saving the installment.");
      }
    });
  }

  function remove(item: ScheduleItem) {
    if (item.allocationCount > 0 || item.amountPaid > 0) {
      setError(
        "This installment has payment activity and cannot be deleted; preserve the financial history instead.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${item.title || typeLabel(item.type)} from ${bookingReference}?`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/bookings/${bookingId}/payment-schedules/${item.id}`,
          { method: "DELETE" },
        );

        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          setError(data?.error || "Failed to delete installment.");
          return;
        }

        setMessage("Installment deleted.");
        router.refresh();
      } catch (deleteError) {
        console.error(deleteError);
        setError("Something went wrong while deleting the installment.");
      }
    });
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Customer Collections
          </p>
          <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
            Payment Schedule
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Set the agreed deposit and final-payment deadlines for this booking.
          </p>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#002b57]"
        >
          <Plus className="h-4 w-4" />
          Add Installment
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Summary label="Booking Total" value={formatCurrency(totalPrice, currency)} />
        <Summary label="Scheduled" value={formatCurrency(scheduledTotal, currency)} />
        <Summary label="Schedule Paid" value={formatCurrency(schedulePaid, currency)} />
        <Summary label="Schedule Balance" value={formatCurrency(scheduledBalance, currency)} />
        <Summary
          label="Booking Outstanding"
          value={formatCurrency(bookingOutstanding, currency)}
        />
      </div>

      {Math.abs(unscheduled) > 0.009 ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            unscheduled > 0
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {unscheduled > 0
            ? `${formatCurrency(unscheduled, currency)} of the booking total is not yet assigned to the payment schedule.`
            : `The payment schedule exceeds the booking total by ${formatCurrency(
                Math.abs(unscheduled),
                currency,
              )}.`}
        </div>
      ) : schedules.length > 0 ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          The payment schedule matches the booking total.
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {showForm ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-bold text-[#001F3F]">
              {form.id ? "Edit Installment" : "Add Installment"}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-2 text-slate-500 hover:bg-white"
              aria-label="Close installment form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Installment Type">
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as InstallmentType,
                  }))
                }
                className={inputClass}
              >
                <option value="DEPOSIT_1">Deposit 1</option>
                <option value="DEPOSIT_2">Deposit 2</option>
                <option value="DEPOSIT_3">Deposit 3</option>
                <option value="FINAL">Final Payment</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </Field>

            <Field label="Title">
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className={inputClass}
                placeholder="Optional custom label"
              />
            </Field>

            <Field label="Due Date *">
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dueDate: event.target.value }))
                }
                className={inputClass}
              />
            </Field>

            <Field label={`Amount (${currency}) *`}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
                className={inputClass}
              />
            </Field>

            <div className="flex items-end">
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-4 text-sm font-semibold text-white hover:bg-[#6f0000] disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isPending ? "Saving..." : form.id ? "Update" : "Add Installment"}
              </button>
            </div>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              className={`${inputClass} min-h-24 py-3`}
            />
          </Field>
        </div>
      ) : null}

      {schedules.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed bg-slate-50 p-8 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-3 font-semibold text-[#001F3F]">No payment schedule yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add the booking deposits and final-payment deadline.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-3 font-semibold">Installment</th>
                <th className="pb-3 font-semibold">Due Date</th>
                <th className="pb-3 text-right font-semibold">Amount</th>
                <th className="pb-3 text-right font-semibold">Paid</th>
                <th className="w-32 pb-3 pr-5 text-right font-semibold">Balance</th>
                <th className="w-36 pb-3 pl-5 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((item) => {
                const balance = Math.max(0, item.amount - item.amountPaid);
                const locked = item.allocationCount > 0 || item.amountPaid > 0;

                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-4">
                      <div className="font-semibold text-[#001F3F]">
                        {item.title || typeLabel(item.type)}
                      </div>
                      {item.notes ? (
                        <div className="mt-1 text-xs text-slate-500">{item.notes}</div>
                      ) : null}
                    </td>
                    <td className="py-4">{formatDate(item.dueDate)}</td>
                    <td className="py-4 text-right font-medium">
                      {formatCurrency(item.amount, currency)}
                    </td>
                    <td className="py-4 text-right">
                      {formatCurrency(item.amountPaid, currency)}
                    </td>
                    <td className="py-4 pr-5 text-right font-semibold">
                      {formatCurrency(balance, currency)}
                    </td>
                    <td className="py-4 pl-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                          item.status,
                        )}`}
                      >
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          disabled={locked}
                          className="rounded-lg border p-2 text-slate-600 hover:border-[#001F3F] hover:text-[#001F3F] disabled:cursor-not-allowed disabled:opacity-40"
                          title={locked ? "Payment activity exists; editing is locked." : "Edit installment"}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => remove(item)}
                          disabled={locked}
                          className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title={locked ? "Payment activity exists; deletion is locked." : "Delete installment"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-bold text-[#001F3F]">{value}</p>
    </div>
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

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
