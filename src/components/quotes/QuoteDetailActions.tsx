"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  quoteId: string;
  pdfUrl?: string | null;
  clientPdfUrl?: string | null;
  agentClientPdfUrl?: string | null;
};

type ActionType =
  | "internal"
  | "client"
  | "agent"
  | "send-client"
  | "send-agent";

export default function QuoteDetailActions({
  quoteId,
  pdfUrl,
  clientPdfUrl,
  agentClientPdfUrl,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<ActionType | null>(null);

  async function handleGenerate(type: "internal" | "client" | "agent") {
    try {
      setLoading(type);

      const endpoint =
        type === "internal"
          ? `/api/quotes/${quoteId}/pdf`
          : type === "client"
            ? `/api/quotes/${quoteId}/client-pdf`
            : `/api/quotes/${quoteId}/agent-client-pdf`;

      const res = await fetch(endpoint, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!data.ok) {
        throw new Error(data.error || "Failed to generate PDF.");
      }

      toast.success(
        type === "internal"
          ? "Internal PDF generated"
          : type === "client"
            ? "Partner PDF generated"
            : "Agent client PDF generated"
      );

      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "PDF generation failed";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  }

  async function handleSend(type: "client" | "agent") {
    try {
      setLoading(type === "client" ? "send-client" : "send-agent");

      const endpoint =
        type === "client"
          ? `/api/quotes/${quoteId}/send-client-pdf`
          : `/api/quotes/${quoteId}/send-agent-client-pdf`;

      const res = await fetch(endpoint, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!data.ok) {
        throw new Error(data.error || "Failed to send email.");
      }

      toast.success(
        type === "client"
          ? "Partner PDF email sent"
          : "Agent client PDF email sent"
      );

      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Email sending failed";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold">PDF Actions</h3>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border p-3">
          <p className="font-medium">Internal</p>
          <p className="mb-2 text-sm text-gray-500">Full costing version</p>

          <button
            onClick={() => handleGenerate("internal")}
            disabled={!!loading}
            className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            {loading === "internal" ? "Generating..." : "Generate"}
          </button>

          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-sm underline"
            >
              Open
            </a>
          )}
        </div>

        <div className="rounded-md border p-3">
          <p className="font-medium">Partner</p>
          <p className="mb-2 text-sm text-gray-500">Your branded PDF</p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleGenerate("client")}
              disabled={!!loading}
              className="rounded bg-blue-900 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {loading === "client" ? "Generating..." : "Generate"}
            </button>

            <button
              onClick={() => handleSend("client")}
              disabled={!!loading}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              {loading === "send-client" ? "Sending..." : "Send Email"}
            </button>
          </div>

          {clientPdfUrl && (
            <a
              href={clientPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-sm underline"
            >
              Open
            </a>
          )}
        </div>

        <div className="rounded-md border p-3">
          <p className="font-medium">Agent Client</p>
          <p className="mb-2 text-sm text-gray-500">White-label for client</p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleGenerate("agent")}
              disabled={!!loading}
              className="rounded bg-red-800 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {loading === "agent" ? "Generating..." : "Generate"}
            </button>

            <button
              onClick={() => handleSend("agent")}
              disabled={!!loading}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              {loading === "send-agent" ? "Sending..." : "Send Email"}
            </button>
          </div>

          {agentClientPdfUrl && (
            <a
              href={agentClientPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-sm underline"
            >
              Open
            </a>
          )}
        </div>
      </div>
    </div>
  );
}