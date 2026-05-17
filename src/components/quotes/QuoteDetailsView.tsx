"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

type QuoteStatus =
  | "DRAFT"
  | "FINALIZED"
  | "SENT"
  | "CANCELLED"
  | "CONVERTED";

type QuoteItemView = {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  total: number;
};

type QuoteActivityView = {
  id: string;
  action: string;
  message: string | null;
  createdAt: string | Date;
  actor: {
    fullName: string | null;
    email: string | null;
  } | null;
};

type QuoteDetails = {
  id: string;
  title: string | null;
  quoteReference: string | null;
  quoteNumber: number;
  status: QuoteStatus;
  purpose: string;
  currency: string;
  recipientName: string | null;
  recipientEmail: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  finalizedAt: string | Date | null;
  sentAt: string | Date | null;
  tour: {
    title: string;
  } | null;
  departureDate: {
    date: string | Date;
  } | null;
  finalizedBy: {
    fullName: string | null;
    email: string | null;
  } | null;
  sentBy: {
    fullName: string | null;
    email: string | null;
  } | null;
  items: QuoteItemView[];
  activities: QuoteActivityView[];
};

type Props = {
  quote: QuoteDetails;
};

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString();
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString();
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function QuoteDetailsView({ quote }: Props) {
  const router = useRouter();

  async function finalizeQuote() {
    try {
      const res = await fetch(`/api/quotes/${quote.id}/finalize`, {
        method: "POST",
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to finalize quote.");
      }

      toast.success("Quote finalized. It is ready to be sent.");
      router.refresh();
    } catch (error) {
      console.error("Finalize quote failed", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to finalize quote."
      );
    }
  }

  async function sendQuote() {
    const confirmed = window.confirm(
      `Send this quote manually to ${quote.recipientEmail || "the recipient"}?`
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/quotes/${quote.id}/send`, {
        method: "POST",
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to send quote.");
      }

      toast.success("Quote sent successfully.");
      router.refresh();
    } catch (error) {
      console.error("Send quote failed", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send quote."
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {quote.title || `Quote ${quote.quoteReference || quote.quoteNumber}`}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Status: <strong>{quote.status}</strong>
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href={`/admin/quotes/${quote.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border px-4 py-2 text-sm"
          >
            Preview PDF
          </a>

          {quote.status === "DRAFT" && (
            <button
              onClick={finalizeQuote}
              className="rounded-md bg-black px-4 py-2 text-sm text-white"
            >
              Finalize Quote
            </button>
          )}

          {quote.status === "FINALIZED" && (
            <button
              onClick={sendQuote}
              className="rounded-md bg-black px-4 py-2 text-sm text-white"
            >
              Send Quote
            </button>
          )}
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border p-5">
          <h2 className="mb-3 text-lg font-semibold">Quote Details</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Reference:</strong> {quote.quoteReference || "-"}
            </p>
            <p>
              <strong>Purpose:</strong> {quote.purpose}
            </p>
            <p>
              <strong>Currency:</strong> {quote.currency}
            </p>
            <p>
              <strong>Recipient:</strong> {quote.recipientName || "-"}
            </p>
            <p>
              <strong>Email:</strong> {quote.recipientEmail || "-"}
            </p>
            <p>
              <strong>Tour:</strong> {quote.tour?.title || "-"}
            </p>
            <p>
              <strong>Departure:</strong> {formatDate(quote.departureDate?.date)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <h2 className="mb-3 text-lg font-semibold">Audit</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Finalized At:</strong> {formatDateTime(quote.finalizedAt)}
            </p>
            <p>
              <strong>Finalized By:</strong>{" "}
              {quote.finalizedBy?.fullName || quote.finalizedBy?.email || "-"}
            </p>
            <p>
              <strong>Sent At:</strong> {formatDateTime(quote.sentAt)}
            </p>
            <p>
              <strong>Sent By:</strong>{" "}
              {quote.sentBy?.fullName || quote.sentBy?.email || "-"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-3 text-lg font-semibold">Items</h2>
        <div className="space-y-3">
          {quote.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b pb-2 text-sm"
            >
              <div>
                <div className="font-medium">{item.title}</div>
                {item.description ? (
                  <div className="text-gray-500">{item.description}</div>
                ) : null}
              </div>
              <div className="text-right">
                <div>{formatMoney(item.total, quote.currency)}</div>
                <div className="text-gray-500">Qty {item.quantity}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 max-w-sm space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoney(quote.subtotal, quote.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>{formatMoney(quote.discountTotal, quote.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatMoney(quote.taxTotal, quote.currency)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(quote.totalAmount, quote.currency)}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-3 text-lg font-semibold">Activity</h2>
        <div className="space-y-3 text-sm">
          {quote.activities.map((activity) => (
            <div key={activity.id} className="border-b pb-2">
              <div className="font-medium">{activity.action}</div>
              <div className="text-gray-600">{activity.message || "-"}</div>
              <div className="text-gray-500">
                {formatDateTime(activity.createdAt)} ·{" "}
                {activity.actor?.fullName || activity.actor?.email || "System"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}