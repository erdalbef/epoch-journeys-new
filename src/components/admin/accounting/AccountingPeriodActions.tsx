"use client";

import {
  AccountingPeriodStatus,
} from "@prisma/client";

import {
  CheckCircle2,
  LockKeyhole,
  RotateCcw,
  SearchCheck,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AccountingPeriodActionsProps = {
  year: number;
  month: number;
  status: AccountingPeriodStatus;
  monthlyReady: boolean;
};

type Action =
  | "START_REVIEW"
  | "MARK_READY"
  | "CLOSE"
  | "REOPEN";

export default function AccountingPeriodActions({
  year,
  month,
  status,
  monthlyReady,
}: AccountingPeriodActionsProps) {
  const router = useRouter();

  const [busy, setBusy] =
    useState<Action | null>(
      null
    );

  const [message, setMessage] =
    useState<string | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(
      null
    );

  async function runAction(
    action: Action
  ) {
    setBusy(action);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/admin/accounting/period-status",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                year,
                month,
                action,
              }),
          }
        );

      const result =
        (await response.json()) as {
          ok?: boolean;
          message?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ||
            "Unable to update accounting period."
        );
      }

      setMessage(
        result.message ||
          "Accounting period updated successfully."
      );

      router.refresh();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update accounting period."
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status ===
          AccountingPeriodStatus.OPEN && (
          <button
            type="button"
            disabled={
              busy !== null
            }
            onClick={() =>
              runAction(
                "START_REVIEW"
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SearchCheck className="h-4 w-4" />

            {busy ===
            "START_REVIEW"
              ? "Updating..."
              : "Start Review"}
          </button>
        )}

        {status ===
          AccountingPeriodStatus.REVIEW && (
          <button
            type="button"
            disabled={
              busy !== null ||
              !monthlyReady
            }
            onClick={() =>
              runAction(
                "MARK_READY"
              )
            }
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CheckCircle2 className="h-4 w-4" />

            {busy ===
            "MARK_READY"
              ? "Updating..."
              : monthlyReady
                ? "Mark Ready"
                : "Not Ready Yet"}
          </button>
        )}

        {status ===
          AccountingPeriodStatus.READY && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-medium text-indigo-800">
            Send the accountant package
            to mark this period as
            Submitted automatically.
          </div>
        )}

        {status ===
          AccountingPeriodStatus.SUBMITTED && (
          <button
            type="button"
            disabled={
              busy !== null
            }
            onClick={() =>
              runAction(
                "CLOSE"
              )
            }
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LockKeyhole className="h-4 w-4" />

            {busy ===
            "CLOSE"
              ? "Closing..."
              : "Close Period"}
          </button>
        )}

        {status ===
          AccountingPeriodStatus.CLOSED && (
          <button
            type="button"
            disabled={
              busy !== null
            }
            onClick={() =>
              runAction(
                "REOPEN"
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />

            {busy ===
            "REOPEN"
              ? "Reopening..."
              : "Reopen Period"}
          </button>
        )}
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}