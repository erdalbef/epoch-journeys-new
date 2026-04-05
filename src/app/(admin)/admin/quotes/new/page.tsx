import { getToursForQuoteForm } from "@/lib/quote-queries";
import QuoteCreateForm from "@/components/quotes/QuoteCreateForm";

export default async function NewQuotePage() {
  const tours = await getToursForQuoteForm();

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create Quote</h1>
        <p className="text-sm text-gray-600">
          Staff can prepare a quote, finalize it, and send it manually later.
        </p>
      </div>

      <QuoteCreateForm tours={tours} />
    </div>
  );
}