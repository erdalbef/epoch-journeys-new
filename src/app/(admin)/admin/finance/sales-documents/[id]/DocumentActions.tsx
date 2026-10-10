"use client";

import Link from "next/link";
import {
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type Props = {
  id: string;
  type: string;
  status: string;
  email: string | null;
};

export default function DocumentActions({
  id,
  type,
  status,
  email,
}: Props) {
  const router =
    useRouter();

  const [busy, setBusy] =
    useState("");

  const [error, setError] =
    useState("");

  const [issueDate, setIssueDate] =
    useState(() =>
      new Date()
        .toISOString()
        .slice(0, 10),
    );

  const canCreateCreditNote =
    type === "INVOICE" &&
    [
      "ISSUED",
      "SENT",
      "PARTIALLY_PAID",
      "PAID",
    ].includes(status);

  const canDeleteLatestIssued =
    [
      "ISSUED",
      "SENT",
      "PARTIALLY_PAID",
      "PAID",
    ].includes(status);

  async function readJson(
    response: Response,
  ) {
    return response
      .json()
      .catch(
        () => null,
      );
  }

  async function act(
    action: string,
  ) {
    setBusy(action);
    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/finance/sales-documents/${id}/${action}`,
          {
            method:
              "POST",
          },
        );

      const data =
        await readJson(
          response,
        );

      if (
        !response.ok
      ) {
        setError(
          data?.error ||
            "Action failed.",
        );

        return;
      }

      router.refresh();
    } catch {
      setError(
        "Action failed.",
      );
    } finally {
      setBusy("");
    }
  }

  async function issueDocument() {
    if (!issueDate) {
      setError(
        "Please select the Issue Date before issuing the document.",
      );

      return;
    }

    setBusy(
      "issue",
    );

    setError("");

    try {
      const saveResponse =
        await fetch(
          `/api/admin/finance/sales-documents/${id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                issueDate,
              }),
          },
        );

      const saveData =
        await readJson(
          saveResponse,
        );

      if (
        !saveResponse.ok
      ) {
        throw new Error(
          saveData?.error ||
            "Unable to save the Issue Date.",
        );
      }

      const issueResponse =
        await fetch(
          `/api/admin/finance/sales-documents/${id}/issue`,
          {
            method:
              "POST",
          },
        );

      const issueData =
        await readJson(
          issueResponse,
        );

      if (
        !issueResponse.ok
      ) {
        throw new Error(
          issueData?.error ||
            "Unable to issue the document.",
        );
      }

      router.refresh();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Unable to issue the document.",
      );
    } finally {
      setBusy("");
    }
  }

  async function deleteDraft() {
    const warning = [
      "DELETE DRAFT?",
      "",
      "This will permanently delete this draft sales document.",
      "",
      "This action cannot be undone.",
    ].join("\n");

    if (
      !window.confirm(
        warning,
      )
    ) {
      return;
    }

    await deleteDocument(
      "",
      "delete-draft",
    );
  }

  async function deleteLatestIssued() {
    const warning = [
      "DELETE LATEST ISSUED DOCUMENT?",
      "",
      "This is allowed only if this is the latest issued document in its numbering sequence.",
      "",
      "Its generated accounting document will also be removed.",
      "",
      "Continue?",
    ].join("\n");

    if (
      !window.confirm(
        warning,
      )
    ) {
      return;
    }

    await deleteDocument(
      "?latest=true",
      "delete-latest",
    );
  }

  async function deleteDocument(
    query: string,
    busyKey: string,
  ) {
    setBusy(
      busyKey,
    );

    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/finance/sales-documents/${id}${query}`,
          {
            method:
              "DELETE",
          },
        );

      const data =
        (await readJson(
          response,
        )) as {
          success?: boolean;
          message?: string;
          error?: string;
        } | null;

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Unable to delete sales document.",
        );
      }

      router.push(
        "/admin/finance/sales-documents",
      );

      router.refresh();
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof
          Error
          ? caughtError.message
          : "Unable to delete sales document.",
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-3">
      {status ===
        "DRAFT" && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Issue Date
          </label>

          <div className="mt-2 flex flex-wrap items-end gap-2">
            <input
              type="date"
              value={
                issueDate
              }
              onChange={(
                event,
              ) =>
                setIssueDate(
                  event.target
                    .value,
                )
              }
              disabled={
                Boolean(
                  busy,
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#8B0000]"
            />

            <button
              type="button"
              onClick={
                issueDocument
              }
              disabled={
                Boolean(
                  busy,
                ) ||
                !issueDate
              }
              className={
                primary
              }
            >
              {busy ===
              "issue"
                ? "Issuing..."
                : "Issue Document"}
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Select the accounting issue date before issuing. Once issued, the date is locked.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {status !==
          "DRAFT" &&
          status !==
            "CANCELLED" && (
            <a
              href={`/api/admin/finance/sales-documents/${id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className={
                secondary
              }
            >
              Open PDF
            </a>
          )}

        {status !==
          "DRAFT" &&
          status !==
            "CANCELLED" &&
          email && (
            <button
              type="button"
              onClick={() =>
                act(
                  "send",
                )
              }
              disabled={
                Boolean(
                  busy,
                )
              }
              className={
                secondary
              }
            >
              {busy ===
              "send"
                ? "Sending..."
                : "Send by Email"}
            </button>
          )}

        {canCreateCreditNote && (
          <Link
            href={`/admin/finance/sales-documents/create?creditFrom=${encodeURIComponent(
              id,
            )}`}
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Create Credit Note
          </Link>
        )}

        {status ===
          "DRAFT" && (
          <button
            type="button"
            onClick={
              deleteDraft
            }
            disabled={
              Boolean(
                busy,
              )
            }
            className={
              deleteButton
            }
          >
            {busy ===
            "delete-draft"
              ? "Deleting..."
              : "Delete Draft"}
          </button>
        )}

        {canDeleteLatestIssued && (
          <button
            type="button"
            onClick={
              deleteLatestIssued
            }
            disabled={
              Boolean(
                busy,
              )
            }
            className={
              latestDeleteButton
            }
          >
            {busy ===
            "delete-latest"
              ? "Deleting..."
              : "Delete Latest Issued"}
          </button>
        )}
      </div>

      {canDeleteLatestIssued && (
        <p className="text-xs text-amber-700">
          This action is allowed only for the latest issued document. The server will refuse deletion if a later document exists.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}

const primary =
  "rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-50";

const secondary =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000] disabled:cursor-not-allowed disabled:opacity-50";

const deleteButton =
  "rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";

const latestDeleteButton =
  "rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50";
