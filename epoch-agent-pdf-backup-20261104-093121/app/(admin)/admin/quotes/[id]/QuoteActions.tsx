"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";

import SendClientQuoteButton from "@/components/quotes/SendClientQuoteButton";

type QuoteWithRelations = Prisma.QuoteGetPayload<{
  include: {
    items: true;
    tour: true;
    departureDate: true;
  };
}>;

type Props = {
  quote: QuoteWithRelations;
};

type GenerateResponse = {
  ok?: boolean;
  error?: string;
  quote?: {
    pdfUrl?: string | null;
    agentClientPdfUrl?: string | null;
  };
};

type ApprovalReadinessResponse = {
  ok?: boolean;
  error?: string;
  ready?: boolean;
  errors?: string[];
  warnings?: string[];
  savedAt?: string;
};

type BasicResponse = {
  ok?: boolean;
  error?: string;
  quote?: {
    id: string;
  };
  booking?: {
    id: string;
  };
};

export default function QuoteActions({ quote }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [approvalReadiness, setApprovalReadiness] = useState<ApprovalReadinessResponse | null>(null);

  const isDraft = quote.status === "DRAFT";
  const isFinalized = quote.status === "FINALIZED";
  const isSent = quote.status === "SENT";
  const isConverted = quote.status === "CONVERTED";
  const isCancelled = quote.status === "CANCELLED";
  const isApproved = Boolean(quote.approvedAt);

  async function parseResponse(
    res: Response
  ): Promise<BasicResponse> {
    const contentType =
      res.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      const text = await res.text();

      throw new Error(
        text ||
          `Server returned non-JSON response (${res.status}).`
      );
    }

    return (await res.json()) as BasicResponse;
  }

  async function handleGenerate(
    url: string,
    field:
      | "pdfUrl"
      | "agentClientPdfUrl"
  ) {
    setLoading(true);

    try {
      const res = await fetch(url, {
        method: "POST",
      });

      const contentType =
        res.headers.get("content-type") ?? "";

      let data: GenerateResponse = {};

      if (
        contentType.includes("application/json")
      ) {
        data =
          (await res.json()) as GenerateResponse;
      } else {
        const text = await res.text();

        throw new Error(
          text ||
            `Server returned non-JSON response (${res.status}).`
        );
      }

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || "Failed to generate PDF."
        );
      }

      const generatedUrl =
        data.quote?.[field];

      if (!generatedUrl) {
        throw new Error(
          "PDF was generated, but the file URL was not returned."
        );
      }

      window.open(generatedUrl, "_blank");

      router.refresh();
    } catch (err) {
      console.error(
        "PDF generation error:",
        err
      );

      alert(
        err instanceof Error
          ? err.message
          : "Error generating PDF."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate() {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/quotes/${quote.id}/duplicate`,
        {
          method: "POST",
        }
      );

      const data = await parseResponse(res);

      if (
        !res.ok ||
        !data.ok ||
        !data.quote?.id
      ) {
        throw new Error(
          data.error ||
            "Failed to duplicate quote."
        );
      }

      router.push(
        `/admin/quotes/${data.quote.id}`
      );

      router.refresh();
    } catch (err) {
      console.error(
        "Duplicate quote error:",
        err
      );

      alert(
        err instanceof Error
          ? err.message
          : "Failed to duplicate quote."
      );
    } finally {
      setLoading(false);
    }
  }

  /** API actions may receive Next.js HTML error pages instead of JSON. */
  async function readActionJson<T>(response: Response, action: string): Promise<T> {
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      const code = response.status;
      const reason = response.redirected
        ? "The request was redirected; your login session may have expired."
        : code === 404
          ? "The API endpoint was not found. Confirm the approval-readiness route exists and restart the development server."
          : code >= 500
            ? "The server returned an error page. Inspect the 'npm run dev' terminal for the underlying error."
            : "The server returned a non-JSON response. Check your login and server route.";
      throw new Error(`${action}: ${reason} (HTTP ${code}).`);
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new Error(`${action}: the server returned malformed JSON (HTTP ${response.status}).`);
    }
  }

  async function handleReadinessCheck() {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/approval-readiness`, { cache: "no-store" });
      const data = await readActionJson<ApprovalReadinessResponse>(res, "Approval readiness check");
      if (!res.ok || !data.ok) throw new Error(data.error || "Unable to check saved quote readiness.");
      setApprovalReadiness(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to check approval readiness.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalize() {
    if (loading || quote.status !== "DRAFT") return;
    if (!window.confirm("Finalize this draft after validating saved costs and generating its final PDF?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/finalize`, { method: "POST" });
      const data = await readActionJson<{ message?: string; issues?: string[] }>(res, "Finalize quotation");
      if (!res.ok) throw new Error(data.message || data.issues?.join(" | ") || "Unable to finalize quotation.");
      setApprovalReadiness(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Quote finalization failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (
      isConverted ||
      isCancelled ||
      isApproved
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Mark this agency quote as approved? This confirms the commercial offer before booking conversion."
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/quotes/${quote.id}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            approve: true,
          }),
        }
      );

      const data = await parseResponse(res);

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error ||
            "Failed to approve quote."
        );
      }

      router.refresh();
    } catch (err) {
      console.error(
        "Quote approval error:",
        err
      );

      alert(
        err instanceof Error
          ? err.message
          : "Failed to approve quote."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConvert() {
    if (
      isConverted ||
      isCancelled ||
      !isApproved
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to convert this approved quote to a booking?"
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/quotes/${quote.id}/convert`,
        {
          method: "POST",
        }
      );

      const data = await parseResponse(res);

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error ||
            "Failed to convert quote to booking."
        );
      }

      if (data.booking?.id) {
        router.push(
          `/admin/bookings/${data.booking.id}`
        );
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error(
        "Convert quote error:",
        err
      );

      alert(
        err instanceof Error
          ? err.message
          : "Failed to convert quote to booking."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (loading || !(isFinalized || (isSent && !isApproved))) return;
    if (!window.confirm("Cancel this quotation? It will remain in the system for audit and cannot be converted to a booking.")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await readActionJson<BasicResponse>(response, "Cancel quotation");
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not cancel the quotation.");
      }
      setApprovalReadiness(null);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not cancel quotation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!isDraft || loading) return;

    const confirmed = window.confirm(
      `Permanently delete draft ${quote.quoteReference || quote.quoteNumber}? This cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const res = await fetch(
        `/api/quotes/${quote.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await parseResponse(res);

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error ||
            "Failed to delete quote."
        );
      }

      router.push("/admin/quotes");

      router.refresh();
    } catch (err) {
      console.error(
        "Delete quote error:",
        err
      );

      alert(
        err instanceof Error
          ? err.message
          : "Failed to delete quote."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Quote Actions
          </h2>

          <p className="text-sm text-slate-500">
            Create and review PDFs, then manage the quotation using actions appropriate to its current status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Status: {quote.status}
          </span>

          {isApproved && (
            <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Approved
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            PDF Generation
          </h3>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                handleGenerate(
                  `/api/quotes/${quote.id}/pdf`,
                  "pdfUrl"
                )
              }
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading
                ? "Working..."
                : "Internal PDF"}
            </button>

            <button
              type="button"
              onClick={() =>
                handleGenerate(
                  `/api/quotes/${quote.id}/agent-client-pdf`,
                  "agentClientPdfUrl"
                )
              }
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading
                ? "Working..."
                : "Agent PDF"}
            </button>

            {quote.pdfUrl && (
              <button
                type="button"
                onClick={() =>
                  window.open(
                    quote.pdfUrl!,
                    "_blank"
                  )
                }
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                View Internal
              </button>
            )}

            {quote.agentClientPdfUrl && (
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `/api/quotes/${quote.id}/agent-client-pdf`,
                    "_blank"
                  )
                }
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                View Agent
              </button>
            )}
          </div>
        </div>

        {(isFinalized || (isSent && !isApproved)) && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            Email Sending
          </h3>

          <div className="flex flex-wrap gap-3">
            <SendClientQuoteButton
              quoteId={quote.id}
              mode="agent"
              disabled={
                loading ||
                !quote.agentClientPdfUrl
              }
            />
          </div>

          {!quote.agentClientPdfUrl && (
            <p className="mt-2 text-xs text-slate-500">
              Generate the related PDF before
              sending it by email.
            </p>
          )}
        </div>

        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Approval Readiness</h3>
              <p className="text-xs text-slate-600">Checks saved costs and mandatory fields. Drafts remain editable.</p>
            </div>
            <button type="button" onClick={handleReadinessCheck} disabled={loading}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-50">
              Check Approval Readiness
            </button>
          </div>
          {approvalReadiness && (
            <div className="mt-3 space-y-2 text-sm">
              <p className={approvalReadiness.ready ? "font-medium text-emerald-800" : "font-medium text-red-700"}>
                {approvalReadiness.ready ? "Ready: no blocking cost issues detected" : `Not ready: ${approvalReadiness.errors?.length || 0} issue(s) to resolve`}
              </p>
              {(approvalReadiness.errors?.length || 0) > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-red-700">
                  {approvalReadiness.errors?.map((message, index) => <li key={`err-${index}`}>{message}</li>)}
                </ul>
              )}
              {(approvalReadiness.warnings?.length || 0) > 0 && (
                <div className="text-amber-800">
                  <p className="font-medium">Review warnings (not automatic blockers)</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {approvalReadiness.warnings?.map((message, index) => <li key={`warn-${index}`}>{message}</li>)}
                  </ul>
                </div>
              )}
              <p className="text-xs text-slate-500">Based on the last saved quote. Recheck after any edits. Passing does not replace supplier reconfirmation.</p>
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            Quote Management
          </h3>

          <div className="flex flex-wrap gap-3">
            {isDraft && (
              <Link
                href={`/admin/quotes/${quote.id}/edit`}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Edit Draft
              </Link>
            )}

            {isDraft && (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={loading}
                className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Finalize Draft
              </button>
            )}

            <button
              type="button"
              onClick={handleDuplicate}
              disabled={loading}
              className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Duplicate
            </button>

            {isSent && !isApproved && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={loading}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Mark Approved
              </button>
            )}

            {isSent && isApproved && (
              <button
                type="button"
                onClick={handleConvert}
                disabled={loading}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Convert Quote to Booking
              </button>
            )}

            {(isFinalized || (isSent && !isApproved)) && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="rounded-md border border-amber-500 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
              >
                Cancel Quote
              </button>
            )}

            {isDraft && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete Draft
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}