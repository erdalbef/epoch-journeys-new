import { notFound } from "next/navigation";
import { getQuoteById } from "@/lib/quote-queries";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function QuotePdfPage({ params }: Props) {
  const { id } = await params;
  const quote = await getQuoteById(id);

  if (!quote) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-black">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">Quote</h1>
        <p className="mt-2 text-sm">Reference: {quote.quoteReference || quote.quoteNumber}</p>
        <p className="text-sm">Status: {quote.status}</p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Quote Details</h2>
          <p><strong>Title:</strong> {quote.title || "-"}</p>
          <p><strong>Purpose:</strong> {quote.purpose}</p>
          <p><strong>Currency:</strong> {quote.currency}</p>
          <p><strong>Recipient:</strong> {quote.recipientName || "-"}</p>
          <p><strong>Email:</strong> {quote.recipientEmail || "-"}</p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">Tour</h2>
          <p><strong>Tour:</strong> {quote.tour?.title || "-"}</p>
          <p>
            <strong>Departure:</strong>{" "}
            {quote.departureDate?.date ? new Date(quote.departureDate.date).toLocaleDateString() : "-"}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Items</h2>
        <table className="w-full border-collapse border text-sm">
          <thead>
            <tr>
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-right">Qty</th>
              <th className="border p-2 text-right">Unit</th>
              <th className="border p-2 text-right">Discount</th>
              <th className="border p-2 text-right">Tax</th>
              <th className="border p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr key={item.id}>
                <td className="border p-2">{item.title}</td>
                <td className="border p-2 text-right">{item.quantity}</td>
                <td className="border p-2 text-right">{item.unitPrice.toFixed(2)}</td>
                <td className="border p-2 text-right">{item.discountAmount.toFixed(2)}</td>
                <td className="border p-2 text-right">{item.taxAmount.toFixed(2)}</td>
                <td className="border p-2 text-right">{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="ml-auto max-w-sm space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{quote.subtotal.toFixed(2)} {quote.currency}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>{quote.discountTotal.toFixed(2)} {quote.currency}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{quote.taxTotal.toFixed(2)} {quote.currency}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{quote.totalAmount.toFixed(2)} {quote.currency}</span>
        </div>
      </section>

      {quote.termsAndNotes && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">Terms & Notes</h2>
          <p className="whitespace-pre-wrap text-sm">{quote.termsAndNotes}</p>
        </section>
      )}
    </div>
  );
}