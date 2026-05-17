import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import QuoteActions from "./QuoteActions";

type Props = {
  params: Promise<{ id: string }>;
};

type QuoteWithRelations = Prisma.QuoteGetPayload<{
  include: {
    items: true;
    tour: true;
    departureDate: true;
  };
}>;

export default async function QuoteDetailPage({ params }: Props) {
  const { id } = await params;

  const quote: QuoteWithRelations | null = await db.quote.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
      tour: true,
      departureDate: true,
    },
  });

  if (!quote) {
    return notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {quote.title || "Quote"}
            </h1>

            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-800">Quote Number:</span>{" "}
                {quote.quoteNumber}
              </p>

              <p>
                <span className="font-medium text-slate-800">Reference:</span>{" "}
                {quote.quoteReference || "—"}
              </p>

              <p>
                <span className="font-medium text-slate-800">Status:</span>{" "}
                {quote.status}
              </p>

              <p>
                <span className="font-medium text-slate-800">Purpose:</span>{" "}
                {quote.purpose}
              </p>
            </div>
          </div>

          <div className="text-sm text-slate-500">
            <p>
              <span className="font-medium text-slate-700">Created:</span>{" "}
              {new Date(quote.createdAt).toLocaleString()}
            </p>
            <p className="mt-1">
              <span className="font-medium text-slate-700">Updated:</span>{" "}
              {new Date(quote.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <QuoteActions quote={quote} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Recipient Information
          </h2>

          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Recipient Name:</span>{" "}
              {quote.recipientName || "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">Recipient Email:</span>{" "}
              {quote.recipientEmail || "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">Agent Name:</span>{" "}
              {quote.agentName || "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">Client Name:</span>{" "}
              {quote.clientName || "—"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Tour Information
          </h2>

          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Tour:</span>{" "}
              {quote.tour?.title || "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">Category:</span>{" "}
              {quote.tour?.category || "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">Departure Date:</span>{" "}
              {quote.departureDate?.date
                ? new Date(quote.departureDate.date).toLocaleDateString()
                : "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">Season:</span>{" "}
              {quote.departureDate?.season || "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">Departure Status:</span>{" "}
              {quote.departureDate?.status || "—"}
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Client Offer Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">Document Title:</span>{" "}
              {quote.clientDocumentTitle || "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">Single Price:</span>{" "}
              {quote.clientSinglePrice != null
                ? `€${quote.clientSinglePrice.toFixed(2)}`
                : "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">
                Double / Twin Price:
              </span>{" "}
              {quote.clientDoubleTwinPrice != null
                ? `€${quote.clientDoubleTwinPrice.toFixed(2)}`
                : "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">Triple Price:</span>{" "}
              {quote.clientTriplePrice != null
                ? `€${quote.clientTriplePrice.toFixed(2)}`
                : "—"}
            </p>

            <p>
              <span className="font-medium text-slate-900">Valid Until:</span>{" "}
              {quote.validUntil
                ? new Date(quote.validUntil).toLocaleDateString()
                : "—"}
            </p>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">PDF (Internal):</span>{" "}
              {quote.pdfUrl || "Not generated"}
            </p>

            <p>
              <span className="font-medium text-slate-900">PDF (Client):</span>{" "}
              {quote.clientPdfUrl || "Not generated"}
            </p>

            <p>
              <span className="font-medium text-slate-900">PDF (Agent):</span>{" "}
              {quote.agentClientPdfUrl || "Not generated"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Includes / Excludes / Policies
        </h2>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Includes
            </h3>
            <div className="whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              {quote.clientIncludes || "—"}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Excludes
            </h3>
            <div className="whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              {quote.clientExcludes || "—"}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Payment Policy
            </h3>
            <div className="whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              {quote.paymentPolicy || "—"}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Cancellation Policy
            </h3>
            <div className="whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              {quote.cancellationPolicy || "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Quote Items
        </h2>

        {quote.items.length === 0 ? (
          <p className="text-sm text-slate-500">No quote items found.</p>
        ) : (
          <div className="space-y-3">
            {quote.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{item.title}</p>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.description || "—"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Type: {item.itemType}</span>
                    <span>Qty: {item.quantity}</span>
                    <span>Optional: {item.optional ? "Yes" : "No"}</span>
                  </div>
                </div>

                <div className="text-sm text-slate-700 md:text-right">
                  <p>
                    <span className="font-medium text-slate-900">Unit:</span>{" "}
                    €{item.unitPrice.toFixed(2)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Discount:</span>{" "}
                    €{item.discountAmount.toFixed(2)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Tax:</span>{" "}
                    €{item.taxAmount.toFixed(2)}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    Total: €{item.total.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Notes
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Internal Notes
            </h3>
            <div className="whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              {quote.internalNotes || "—"}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Terms and Notes
            </h3>
            <div className="whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              {quote.termsAndNotes || "—"}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Client Offer Notes
            </h3>
            <div className="whitespace-pre-wrap rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              {quote.clientOfferNotes || "—"}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}