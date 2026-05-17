"use client";

import { useState } from "react";
import { toast } from "sonner";

type Mode = "client" | "agent";

type Props = {
  quoteId: string;
  mode?: Mode;
  disabled?: boolean;
};

type SendResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export default function SendClientQuoteButton({
  quoteId,
  mode = "client",
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (loading || disabled) return;

    try {
      setLoading(true);

      const endpoint =
        mode === "client"
          ? `/api/quotes/${quoteId}/send-client-pdf`
          : `/api/quotes/${quoteId}/send-agent-client-pdf`;

      const res = await fetch(endpoint, {
        method: "POST",
      });

      const contentType = res.headers.get("content-type") ?? "";
      let data: SendResponse = {};

      if (contentType.includes("application/json")) {
        data = (await res.json()) as SendResponse;
      } else {
        const text = await res.text();
        throw new Error(
          text || `Server returned non-JSON response (${res.status}).`
        );
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send email.");
      }

      toast.success(
        data.message ||
          (mode === "client"
            ? "Partner PDF email sent successfully."
            : "Agent PDF email sent successfully.")
      );
    } catch (error) {
      console.error("Failed to send quote email:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to send email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={loading || disabled}
      className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
        mode === "client" ? "bg-blue-900" : "bg-red-800"
      }`}
      title={
        disabled
          ? "Generate the PDF first and complete required fields."
          : undefined
      }
    >
      {loading
        ? "Sending..."
        : mode === "client"
        ? "Send Partner PDF"
        : "Send Agent PDF"}
    </button>
  );
}