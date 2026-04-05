"use client";

import { useRouter } from "next/navigation";

type Props = {
  quote: any;
};

export default function QuoteDetailsView({ quote }: Props) {
  const router = useRouter();

  async function finalizeQuote() {
    const actorId = "ADMIN_USER_ID_HERE";

    const res = await fetch(`/api/quotes/${quote.id}/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actorId }),
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.error || "Failed to finalize quote.");
      return;
    }

    alert("Quote finalized. It is ready to be sent, but has not been emailed yet.");
    router.refresh();
  }

  async function sendQuote() {
    const confirmed = window.confirm(
      `Send this quote manually to ${quote.recipientEmail || "the recipient"}?`
    );

    if (!confirmed) return;

    const actorId = "ADMIN_USER_ID_HERE";

    const res = await fetch(`/api/quotes/${quote.id}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actorId }),
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.error || "Failed to send quote.");
      return;
    }

    alert("Quote sent successfully.");
    router.refresh();
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
            <p><strong>Reference:</strong> {quote.quoteReference || "-"}</p>
            <p><strong>Purpose:</strong> {quote.purpose}</p>
            <p><strong>Currency:</strong> {quote.currency}</p>
            <p><strong>Recipient:</strong> {quote.recipientName || "-"}</p>
            <p><strong>Email:</strong> {quote.recipientEmail || "-"}</p>
            <p><strong>Tour:</strong> {quote.tour?.title || "-"}</p>
            <p>
              <strong>Departure:</strong>{" "}
              {quote.departureDate?.date
                ? new Date(quote.departureDate.date).toLocaleDateString()
                : "-"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <h2 className="mb-3 text-lg font-semibold">Audit</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Finalized At:</strong>{" "}
              {quote.finalizedAt ? new Date(quote.finalizedAt).toLocaleString() : "-"}
            </p>
            <p>
              <strong>Finalized By:</strong>{" "}
              {quote.finalizedBy?.fullName || quote.finalizedBy?.email || "-"}
            </p>
            <p>
              <strong>Sent At:</strong>{" "}
              {quote.sentAt ? new Date(quote.sentAt).toLocaleString() : "-"}
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
          {quote.items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between border-b pb-2 text-sm">
              <div>
                <div className="font-medium">{item.title}</div>
                {item.description ? <div className="text-gray-500">{item.description}</div> : null}
              </div>
              <div className="text-right">
                <div>{item.total.toFixed(2)} {quote.currency}</div>
                <div className="text-gray-500">Qty {item.quantity}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 max-w-sm space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{quote.subtotal.toFixed(2)} {quote.currency}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>{quote.discountTotal.toFixed(2)} {quote.currency}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{quote.taxTotal.toFixed(2)} {quote.currency}</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{quote.totalAmount.toFixed(2)} {quote.currency}</span></div>
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-3 text-lg font-semibold">Activity</h2>
        <div className="space-y-3 text-sm">
          {quote.activities.map((activity: any) => (
            <div key={activity.id} className="border-b pb-2">
              <div className="font-medium">{activity.action}</div>
              <div className="text-gray-600">{activity.message || "-"}</div>
              <div className="text-gray-500">
                {new Date(activity.createdAt).toLocaleString()} · {activity.actor?.fullName || activity.actor?.email || "System"}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}