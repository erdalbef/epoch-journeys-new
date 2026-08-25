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

  const canCreateCreditNote =
    type === "INVOICE" &&
    [
      "ISSUED",
      "SENT",
      "PARTIALLY_PAID",
      "PAID",
    ].includes(status);

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
        await response
          .json()
          .catch(
            () => null,
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

  async function deleteDocument(
    testDelete: boolean,
  ) {
    const warning =
      testDelete
        ? [
            "DELETE TEST DOCUMENT?",
            "",
            "This will permanently remove this sales document.",
            "",
            "If it is issued, its generated accounting document will also be removed.",
            "",
            "Use this ONLY for test documents created while developing the module.",
            "",
            "This action cannot be undone.",
          ].join("\n")
        : [
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

    setBusy(
      testDelete
        ? "delete-test"
        : "delete",
    );

    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/finance/sales-documents/${id}${
            testDelete
              ? "?test=true"
              : ""
          }`,
          {
            method:
              "DELETE",
          },
        );

      const data =
        (await response
          .json()
          .catch(
            () => null,
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
      <div className="flex flex-wrap gap-2">
        {status ===
          "DRAFT" && (
          <button
            type="button"
            onClick={() =>
              act(
                "issue",
              )
            }
            disabled={
              Boolean(
                busy,
              )
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
        )}

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
            onClick={() =>
              deleteDocument(
                false,
              )
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
            "delete"
              ? "Deleting..."
              : "Delete Draft"}
          </button>
        )}

        {status !==
          "DRAFT" && (
          <button
            type="button"
            onClick={() =>
              deleteDocument(
                true,
              )
            }
            disabled={
              Boolean(
                busy,
              )
            }
            className={
              testDeleteButton
            }
          >
            {busy ===
            "delete-test"
              ? "Deleting..."
              : "Delete Test Document"}
          </button>
        )}
      </div>

      {status !==
        "DRAFT" && (
        <p className="text-xs text-red-600">
          Delete Test Document
          is for development
          cleanup only. Do not
          use it for genuine
          issued accounting
          documents.
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

const testDeleteButton =
  "rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";