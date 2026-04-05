"use client";

import { useMemo, useState } from "react";
import { BookingInstallmentType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ScheduleItem = {
  id: string;
  type: string;
  title: string | null;
  dueDate: string;
  amount: number;
  amountPaid: number;
  status: string;
  paidAt: string | null;
  notes: string | null;
};

type PaymentScheduleManagerProps = {
  bookingId: string;
  currency?: string;
  schedules: ScheduleItem[];
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function getInstallmentStatusClasses(status: string) {
  const base = "inline-flex rounded-full border px-3 py-1 text-xs font-semibold";

  switch (status) {
    case "PENDING":
      return `${base} border-amber-200 bg-amber-100 text-amber-800`;
    case "PARTIALLY_PAID":
      return `${base} border-blue-200 bg-blue-100 text-blue-800`;
    case "PAID":
      return `${base} border-green-200 bg-green-100 text-green-800`;
    case "OVERDUE":
      return `${base} border-red-200 bg-red-100 text-red-800`;
    case "CANCELLED":
      return `${base} border-slate-200 bg-slate-100 text-slate-800`;
    default:
      return `${base} border-gray-200 bg-gray-100 text-gray-800`;
  }
}

const INSTALLMENT_TYPES = Object.values(BookingInstallmentType);

export default function PaymentScheduleManager({
  bookingId,
  currency = "EUR",
  schedules,
}: PaymentScheduleManagerProps) {
  const router = useRouter();

  const [type, setType] = useState<BookingInstallmentType>("DEPOSIT_1");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [creating, setCreating] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const [paidInputs, setPaidInputs] = useState<Record<string, string>>(
    Object.fromEntries(
      schedules.map((item) => [item.id, String(item.amountPaid ?? 0)])
    )
  );

  const totals = useMemo(() => {
    const activeSchedules = schedules.filter(
      (item) => item.status !== "CANCELLED"
    );

    const scheduled = activeSchedules.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const paid = activeSchedules.reduce(
      (sum, item) => sum + item.amountPaid,
      0
    );

    return {
      scheduled,
      paid,
      remaining: Math.max(scheduled - paid, 0),
    };
  }, [schedules]);

  async function createInstallment() {
    try {
      setCreating(true);

      const parsedAmount = Number(amount);

      if (!dueDate) {
        toast.error("Due date is required.");
        return;
      }

      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error("Amount must be greater than 0.");
        return;
      }

      const response = await fetch(
        `/api/admin/bookings/${bookingId}/payment-schedules`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            title,
            dueDate,
            amount: parsedAmount,
            notes,
          }),
        }
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to create installment.");
      }

      toast.success("Installment added successfully.");
      setType("DEPOSIT_1");
      setTitle("");
      setDueDate("");
      setAmount("");
      setNotes("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create installment."
      );
    } finally {
      setCreating(false);
    }
  }

  async function patchInstallment(
    scheduleId: string,
    payload: Record<string, unknown>,
    successMessage: string
  ) {
    try {
      setWorkingId(scheduleId);

      const response = await fetch(
        `/api/admin/bookings/${bookingId}/payment-schedules/${scheduleId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to update installment.");
      }

      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update installment."
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteInstallment(scheduleId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this installment?"
    );

    if (!confirmed) return;

    try {
      setWorkingId(scheduleId);

      const response = await fetch(
        `/api/admin/bookings/${bookingId}/payment-schedules/${scheduleId}`,
        {
          method: "DELETE",
        }
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete installment.");
      }

      toast.success("Installment deleted.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete installment."
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-gray-50 p-5">
          <p className="text-sm text-gray-500">Scheduled</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(totals.scheduled, currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-gray-50 p-5">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(totals.paid, currency)}
          </p>
        </div>

        <div className="rounded-2xl border bg-gray-50 p-5">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(totals.remaining, currency)}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            Add Installment
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Add Deposit 1, Deposit 2, Deposit 3, Final, or a custom payment.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as BookingInstallmentType)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#8B0000]"
            >
              {INSTALLMENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {formatStatus(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional custom label"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#8B0000]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={createInstallment}
              disabled={creating}
              className="w-full rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Saving..." : "Add Installment"}
            </button>
          </div>

          <div className="md:col-span-2 xl:col-span-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#8B0000]"
            />
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full min-w-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left font-semibold text-gray-700">Type</th>
              <th className="p-3 text-left font-semibold text-gray-700">Title</th>
              <th className="p-3 text-left font-semibold text-gray-700">
                Due Date
              </th>
              <th className="p-3 text-right font-semibold text-gray-700">
                Amount
              </th>
              <th className="p-3 text-right font-semibold text-gray-700">Paid</th>
              <th className="p-3 text-right font-semibold text-gray-700">
                Remaining
              </th>
              <th className="p-3 text-left font-semibold text-gray-700">
                Status
              </th>
              <th className="p-3 text-left font-semibold text-gray-700">
                Paid At
              </th>
              <th className="p-3 text-left font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-sm text-gray-500">
                  No payment installments added yet.
                </td>
              </tr>
            ) : (
              schedules.map((item) => {
                const remaining = Math.max(item.amount - item.amountPaid, 0);
                const isBusy = workingId === item.id;

                return (
                  <tr key={item.id} className="border-t border-gray-200 align-top">
                    <td className="p-3 text-gray-900">{formatStatus(item.type)}</td>

                    <td className="p-3">
                      <div className="font-medium text-gray-900">
                        {formatText(item.title)}
                      </div>
                      {item.notes ? (
                        <div className="mt-1 max-w-xs text-xs text-gray-500">
                          {item.notes}
                        </div>
                      ) : null}
                    </td>

                    <td className="p-3 text-gray-900">{formatDate(item.dueDate)}</td>

                    <td className="p-3 text-right font-medium text-gray-900">
                      {formatCurrency(item.amount, currency)}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={paidInputs[item.id] ?? String(item.amountPaid)}
                          onChange={(e) =>
                            setPaidInputs((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-right text-sm text-gray-900 outline-none focus:border-[#8B0000]"
                        />

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            patchInstallment(
                              item.id,
                              {
                                amountPaid: Number(
                                  paidInputs[item.id] ?? item.amountPaid
                                ),
                              },
                              "Installment updated."
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Save
                        </button>
                      </div>
                    </td>

                    <td className="p-3 text-right font-medium text-red-700">
                      {formatCurrency(remaining, currency)}
                    </td>

                    <td className="p-3">
                      <span className={getInstallmentStatusClasses(item.status)}>
                        {formatStatus(item.status)}
                      </span>
                    </td>

                    <td className="p-3 text-gray-900">{formatDate(item.paidAt)}</td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            patchInstallment(
                              item.id,
                              { action: "MARK_PAID" },
                              "Installment marked as paid."
                            )
                          }
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark Paid
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            patchInstallment(
                              item.id,
                              { action: "RESET" },
                              "Installment reset."
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reset
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            patchInstallment(
                              item.id,
                              { action: "CANCEL" },
                              "Installment cancelled."
                            )
                          }
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => deleteInstallment(item.id)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {schedules.length > 0 ? (
            <tfoot className="bg-gray-50">
              <tr className="border-t border-gray-200 font-semibold">
                <td className="p-3" colSpan={3}>
                  Totals
                </td>
                <td className="p-3 text-right text-gray-900">
                  {formatCurrency(totals.scheduled, currency)}
                </td>
                <td className="p-3 text-right text-green-700">
                  {formatCurrency(totals.paid, currency)}
                </td>
                <td className="p-3 text-right text-red-700">
                  {formatCurrency(totals.remaining, currency)}
                </td>
                <td className="p-3" colSpan={3} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </section>
    </div>
  );
}

function formatText(value: string | null | undefined) {
  if (!value || value.trim() === "") return "—";
  return value;
}