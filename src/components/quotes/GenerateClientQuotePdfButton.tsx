"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function GenerateClientQuotePdfButton({
  quoteId,
  existingPdfUrl,
  disabled = false,
}: {
  quoteId: string;
  existingPdfUrl?: string | null;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(existingPdfUrl || null);

  async function handleGenerate() {
    try {
      setLoading(true);

      const res = await fetch(`/api/quotes/${quoteId}/client-pdf`, {
        method: "POST",
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        quote?: {
          clientPdfUrl?: string | null;
        };
      };

      if (!data.ok) {
        throw new Error(data.error || "Failed to generate client PDF.");
      }

      const newPdfUrl = data.quote?.clientPdfUrl || null;
      if (!newPdfUrl) {
        throw new Error("Client PDF was generated but no URL was returned.");
      }

      setPdfUrl(newPdfUrl);
      toast.success("Client PDF generated successfully");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate client PDF."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading || disabled}
        className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
        title={disabled ? "Complete the client-facing fields first" : undefined}
      >
        {loading ? "Generating..." : "Client PDF"}
      </button>

      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border px-4 py-2 text-sm"
        >
          Open Client PDF
        </a>
      ) : null}
    </div>
  );
}