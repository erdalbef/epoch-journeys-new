"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Allocation = {
  id: string;
  amount: number;
  paymentSchedule: {
    id: string;
    title: string | null;
    type: string;
    amount: number;
    amountPaid: number;
    status: string;
    dueDate: string;
  };
};

type ScheduleOption = {
  id: string;
  title: string | null;
  type: string;
  amount: number;
  amountPaid: number;
  status: string;
  dueDate: string;
};

type Props = {
  bookingId: string;
  paymentId: string;
  paymentAmount: number;
  currency: string;
  allocations: Allocation[];
  schedules: ScheduleOption[];
  isLocked: boolean;
  lockedAt: string | null;
  lockReason: string | null;
};

type EditableAllocation = {
  paymentScheduleId: string;
  amount: string;
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClasses(status: string | null | undefined) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-800";
    case "OVERDUE":
      return "bg-red-100 text-red-800";
    case "PARTIALLY_PAID":
      return "bg-amber-100 text-amber-800";
    case "CANCELLED":
      return "bg-slate-100 text-slate-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

export default function PaymentAllocationEditor({
  bookingId,
  paymentId,
  paymentAmount,
  currency,
  allocations,
  schedules,
  isLocked,
  lockedAt,
  lockReason,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [rows, setRows] = useState<EditableAllocation[]>(
    allocations.length > 0
      ? allocations.map((allocation) => ({
          paymentScheduleId: allocation.paymentSchedule.id,
          amount: String(allocation.amount),
        }))
      : []
  );

  const parsedRows = useMemo(() => {
    return rows.map((row) => {
      const schedule =
        schedules.find((item) => item.id === row.paymentScheduleId) ?? null;

      const numericAmount = Number(row.amount);
      const amount =
        Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0;

      const remainingInstallmentBalance = schedule
        ? Math.max(0, schedule.amount - schedule.amountPaid)
        : 0;

      const exceedsInstallmentTotal = schedule ? amount > schedule.amount : false;
      const exceedsRemainingBalance = schedule
        ? amount > remainingInstallmentBalance
        : false;

      return {
        ...row,
        schedule,
        amount,
        remainingInstallmentBalance,
        exceedsInstallmentTotal,
        exceedsRemainingBalance,
      };
    });
  }, [rows, schedules]);

  const selectedIds = parsedRows
    .map((row) => row.paymentScheduleId)
    .filter((value) => value.trim() !== "");

  const duplicateScheduleIds = selectedIds.filter(
    (id, index) => selectedIds.indexOf(id) !== index
  );

  const hasDuplicateSchedules = duplicateScheduleIds.length > 0;

  const allocatedTotal = parsedRows.reduce((sum, row) => sum + row.amount, 0);
  const remainingAmount = Math.max(0, paymentAmount - allocatedTotal);
  const isOverAllocated = allocatedTotal > paymentAmount + 0.000001;

  const hasPerRowErrors = parsedRows.some(
    (row) =>
      row.exceedsInstallmentTotal ||
      row.exceedsRemainingBalance ||
      (row.paymentScheduleId.trim() !== "" && row.amount <= 0)
  );

  const hasBlockingErrors = hasDuplicateSchedules || isOverAllocated || hasPerRowErrors;

  function addRow() {
    setRows((current) => [...current, { paymentScheduleId: "", amount: "" }]);
  }

  function updateRow(index: number, field: "paymentScheduleId" | "amount", value: string) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
  }

  function resetRows() {
    setRows(
      allocations.length > 0
        ? allocations.map((allocation) => ({
            paymentScheduleId: allocation.paymentSchedule.id,
            amount: String(allocation.amount),
          }))
        : []
    );
  }

  function clearRows() {
    setRows([]);
  }

  function autoFillOldestFirst() {
    const sortedSchedules = [...schedules]
      .filter((schedule) => schedule.status !== "CANCELLED")
      .map((schedule) => ({
        ...schedule,
        remainingBalance: Math.max(0, schedule.amount - schedule.amountPaid),
      }))
      .filter((schedule) => schedule.remainingBalance > 0)
      .sort((a, b) => {
        const byDate =
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (byDate !== 0) return byDate;

        const priority = (value: string) => {
          switch (value) {
            case "OVERDUE":
              return 0;
            case "PARTIALLY_PAID":
              return 1;
            case "PENDING":
              return 2;
            case "PAID":
              return 3;
            default:
              return 4;
          }
        };

        return priority(a.status) - priority(b.status);
      });

    let remaining = paymentAmount;
    const nextRows: EditableAllocation[] = [];

    for (const schedule of sortedSchedules) {
      if (remaining <= 0) break;

      const allocation = Math.min(remaining, schedule.remainingBalance);
      if (allocation <= 0) continue;

      nextRows.push({
        paymentScheduleId: schedule.id,
        amount: String(roundToTwo(allocation)),
      });

      remaining = roundToTwo(remaining - allocation);
    }

    setRows(nextRows);

    if (nextRows.length === 0) {
      toast.message("No unpaid installments available for auto fill.");
      return;
    }

    if (remaining > 0) {
      toast.success(
        `Auto fill applied. ${formatCurrency(remaining, currency)} remains unallocated.`
      );
      return;
    }

    toast.success("Auto fill applied to oldest unpaid installments.");
  }

  async function save() {
    const filtered = rows
      .filter(
        (row) =>
          row.paymentScheduleId.trim() !== "" &&
          row.amount.trim() !== "" &&
          Number(row.amount) > 0
      )
      .map((row) => ({
        paymentScheduleId: row.paymentScheduleId,
        amount: Number(row.amount),
      }));

    const uniqueIds = new Set(filtered.map((row) => row.paymentScheduleId));
    if (uniqueIds.size !== filtered.length) {
      toast.error("Each installment can only be selected once.");
      return;
    }

    const total = filtered.reduce((sum, row) => sum + row.amount, 0);
    if (total > paymentAmount + 0.000001) {
      toast.error("Allocated total cannot exceed payment amount.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/bookings/${bookingId}/payments/${paymentId}/allocations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              allocations: filtered,
            }),
          }
        );

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          toast.error(data.error || "Failed to update allocations.");
          return;
        }

        toast.success("Payment allocations updated.");
        setIsEditing(false);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("Failed to update allocations.");
      }
    });
  }

  async function toggleLock(action: "lock" | "unlock") {
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/admin/bookings/${bookingId}/payments/${paymentId}/lock`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action,
              reason:
                action === "lock"
                  ? "Locked by admin after allocation review"
                  : undefined,
            }),
          }
        );

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          toast.error(data.error || "Failed to update allocation lock.");
          return;
        }

        toast.success(
          action === "lock"
            ? "Allocation locked."
            : "Allocation unlocked."
        );

        setIsEditing(false);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("Failed to update allocation lock.");
      }
    });
  }

  return (
    <div className="mt-4 rounded-lg border bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Allocation
        </p>

        <div className="flex flex-wrap gap-2">
          {isLocked ? (
            <button
              type="button"
              onClick={() => toggleLock("unlock")}
              className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
              disabled={isPending}
            >
              Unlock
            </button>
          ) : (
            <button
              type="button"
              onClick={() => toggleLock("lock")}
              className="rounded-md border border-green-300 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
              disabled={isPending}
            >
              Lock
            </button>
          )}

          {!isEditing && !isLocked ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit Allocation
            </button>
          ) : null}

          {isEditing && !isLocked ? (
            <>
              <button
                type="button"
                onClick={autoFillOldestFirst}
                className="rounded-md border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                disabled={isPending}
              >
                Auto Fill
              </button>
              <button
                type="button"
                onClick={clearRows}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                disabled={isPending}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  resetRows();
                  setIsEditing(false);
                }}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                disabled={isPending || hasBlockingErrors}
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {isLocked ? (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p className="font-medium">Allocation is locked.</p>
          <p className="mt-1">
            Locked at: {formatDateTime(lockedAt)}
          </p>
          <p className="mt-1">
            Reason: {lockReason || "—"}
          </p>
        </div>
      ) : null}

      {!isEditing ? (
        allocations.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Not allocated</p>
        ) : (
          <div className="mt-2 space-y-2">
            {allocations.map((allocation) => (
              <div
                key={allocation.id}
                className="rounded-md bg-gray-50 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-gray-700">
                      {allocation.paymentSchedule.title ||
                        formatStatus(allocation.paymentSchedule.type)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Due: {formatDate(allocation.paymentSchedule.dueDate)}
                    </p>
                  </div>

                  <span className="font-medium text-gray-900">
                    {formatCurrency(allocation.amount, currency)}
                  </span>
                </div>
              </div>
            ))}

            <div className="mt-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600">
              Total allocated:{" "}
              {formatCurrency(
                allocations.reduce((sum, item) => sum + item.amount, 0),
                currency
              )}
            </div>
          </div>
        )
      ) : !isLocked ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Auto Fill will suggest allocations using the oldest unpaid installments first.
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-gray-600">No allocation rows yet.</p>
          ) : null}

          {hasDuplicateSchedules ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Duplicate installment selected. Each installment can only appear once.
            </div>
          ) : null}

          {isOverAllocated ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Allocated total exceeds payment amount by{" "}
              {formatCurrency(allocatedTotal - paymentAmount, currency)}.
            </div>
          ) : null}

          {!isOverAllocated && remainingAmount > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              There is still {formatCurrency(remainingAmount, currency)} left unallocated.
            </div>
          ) : null}

          {parsedRows.map((row, index) => (
            <div
              key={`${row.paymentScheduleId}-${index}`}
              className="grid gap-3 rounded-md border bg-gray-50 p-3 md:grid-cols-[1fr_140px_auto]"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Installment
                </label>
                <select
                  value={row.paymentScheduleId}
                  onChange={(e) =>
                    updateRow(index, "paymentScheduleId", e.target.value)
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select installment</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {(schedule.title || formatStatus(schedule.type)) +
                        ` • ${formatDate(schedule.dueDate)} • ${formatCurrency(
                          schedule.amount,
                          currency
                        )}`}
                    </option>
                  ))}
                </select>

                {row.schedule ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span
                        className={`rounded px-2 py-1 ${getStatusClasses(
                          row.schedule.status
                        )}`}
                      >
                        {formatStatus(row.schedule.status)}
                      </span>
                      <span>
                        Currently paid:{" "}
                        {formatCurrency(row.schedule.amountPaid, currency)}
                      </span>
                      <span>
                        Total: {formatCurrency(row.schedule.amount, currency)}
                      </span>
                      <span>
                        Remaining:{" "}
                        {formatCurrency(row.remainingInstallmentBalance, currency)}
                      </span>
                    </div>

                    {row.exceedsInstallmentTotal ? (
                      <p className="text-xs text-red-700">
                        Entered amount exceeds the installment total.
                      </p>
                    ) : null}

                    {!row.exceedsInstallmentTotal && row.exceedsRemainingBalance ? (
                      <p className="text-xs text-amber-700">
                        Entered amount exceeds the remaining unpaid balance of this
                        installment.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.amount}
                  onChange={(e) => updateRow(index, "amount", e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add Allocation
          </button>

          <div className="rounded-md border border-dashed border-gray-300 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-600">Payment amount</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(paymentAmount, currency)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-gray-600">Allocated total</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(allocatedTotal, currency)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-gray-600">Unallocated remainder</span>
              <span
                className={`font-medium ${
                  remainingAmount > 0 ? "text-amber-700" : "text-gray-900"
                }`}
              >
                {formatCurrency(remainingAmount, currency)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}