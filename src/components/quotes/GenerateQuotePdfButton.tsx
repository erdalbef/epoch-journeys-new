"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function GenerateQuotePdfButton({
  quoteId,
  existingPdfUrl,
}: {
  quoteId: string;
  existingPdfUrl?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(existingPdfUrl || null);

  async function handleGenerate() {
    try {
      setLoading(true);

      const res = await fetch(`/api/quotes/${quoteId}/pdf`, {
        method: "POST",
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        quote?: {
          pdfUrl?: string | null;
        };
      };

      if (!data.ok) {
        throw new Error(data.error || "Failed to generate PDF.");
      }

      const newPdfUrl = data.quote?.pdfUrl || null;
      if (!newPdfUrl) {
        throw new Error("PDF was generated but no URL was returned.");
      }

      setPdfUrl(newPdfUrl);
      toast.success("Internal PDF generated");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate PDF."
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
        disabled={loading}
        className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
      >
        {loading ? "Generating..." : "Internal PDF"}
      </button>

      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border px-4 py-2 text-sm"
        >
          Open Internal PDF
        </a>
      ) : null}
    </div>
  );
}