"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    clientPdfUrl?: string | null;
    agentClientPdfUrl?: string | null;
  };
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

  const isConverted = quote.status === "CONVERTED";
  const isCancelled = quote.status === "CANCELLED";

  async function parseResponse(res: Response): Promise<BasicResponse> {
    const contentType = res.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      const text = await res.text();
      throw new Error(
        text || `Server returned non-JSON response (${res.status}).`
      );
    }

    return (await res.json()) as BasicResponse;
  }

  async function handleGenerate(
    url: string,
    field: "pdfUrl" | "clientPdfUrl" | "agentClientPdfUrl"
  ) {
    setLoading(true);

    try {
      const res = await fetch(url, { method: "POST" });

      const contentType = res.headers.get("content-type") ?? "";
      let data: GenerateResponse = {};

      if (contentType.includes("application/json")) {
        data = (await res.json()) as GenerateResponse;
      } else {
        const text = await res.text();
        throw new Error(
          text || `Server returned non-JSON response (${res.status}).`
        );
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate PDF.");
      }

      const generatedUrl = data.quote?.[field];

      if (!generatedUrl) {
        throw new Error("PDF was generated, but the file URL was not returned.");
      }

      window.open(generatedUrl, "_blank");
      router.refresh();
    } catch (err) {
      console.error("PDF generation error:", err);
      alert(err instanceof Error ? err.message : "Error generating PDF.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate() {
    setLoading(true);

    try {
      const res = await fetch(`/api/quotes/${quote.id}/duplicate`, {
        method: "POST",
      });

      const data = await parseResponse(res);

      if (!res.ok || !data.ok || !data.quote?.id) {
        throw new Error(data.error || "Failed to duplicate quote.");
      }

      router.push(`/admin/quotes/${data.quote.id}`);
      router.refresh();
    } catch (err) {
      console.error("Duplicate quote error:", err);
      alert(err instanceof Error ? err.message : "Failed to duplicate quote.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConvert() {
    if (isConverted || isCancelled) return;

    const confirmed = window.confirm(
      "Are you sure you want to convert this quote to a booking?"
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/quotes/${quote.id}/convert-to-booking`, {
        method: "POST",
      });

      const data = await parseResponse(res);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to convert quote to booking.");
      }

      if (data.booking?.id) {
        router.push(`/admin/bookings/${data.booking.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Convert quote error:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to convert quote to booking."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (isConverted) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this quote? This action cannot be undone."
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "DELETE",
      });

      const data = await parseResponse(res);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to delete quote.");
      }

      router.push("/admin/quotes");
      router.refresh();
    } catch (err) {
      console.error("Delete quote error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete quote.");
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
            Generate PDFs, send proposals, duplicate, convert, or delete this
            quote.
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Status: {quote.status}
        </span>
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
                handleGenerate(`/api/quotes/${quote.id}/pdf`, "pdfUrl")
              }
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Working..." : "Internal PDF"}
            </button>

            <button
              type="button"
              onClick={() =>
                handleGenerate(
                  `/api/quotes/${quote.id}/client-pdf`,
                  "clientPdfUrl"
                )
              }
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Working..." : "Client PDF"}
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
              {loading ? "Working..." : "Agent PDF"}
            </button>

            {quote.pdfUrl && (
              <button
                type="button"
                onClick={() => window.open(quote.pdfUrl!, "_blank")}
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                View Internal
              </button>
            )}

            {quote.clientPdfUrl && (
              <button
                type="button"
                onClick={() => window.open(quote.clientPdfUrl!, "_blank")}
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                View Client
              </button>
            )}

            {quote.agentClientPdfUrl && (
              <button
                type="button"
                onClick={() => window.open(quote.agentClientPdfUrl!, "_blank")}
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                View Agent
              </button>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            Email Sending
          </h3>

          <div className="flex flex-wrap gap-3">
            <SendClientQuoteButton
              quoteId={quote.id}
              mode="client"
              disabled={loading || !quote.clientPdfUrl}
            />

            <SendClientQuoteButton
              quoteId={quote.id}
              mode="agent"
              disabled={loading || !quote.agentClientPdfUrl}
            />
          </div>

          {(!quote.clientPdfUrl || !quote.agentClientPdfUrl) && (
            <p className="mt-2 text-xs text-slate-500">
              Generate the related PDF before sending it by email.
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            Quote Management
          </h3>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={loading}
              className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Duplicate
            </button>

            <button
              type="button"
              onClick={handleConvert}
              disabled={loading || isConverted || isCancelled}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              title={
                isConverted
                  ? "This quote has already been converted."
                  : isCancelled
                  ? "Cancelled quotes cannot be converted."
                  : undefined
              }
            >
              Convert Quote → Booking
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || isConverted}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              title={
                isConverted ? "Converted quotes should not be deleted." : undefined
              }
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}