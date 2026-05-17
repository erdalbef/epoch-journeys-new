import { getToursForQuoteForm } from "@/lib/quote-queries";
import QuoteCreateForm from "@/components/quotes/QuoteCreateForm";

type ToursForQuoteForm = Awaited<ReturnType<typeof getToursForQuoteForm>>;

export default async function NewQuotePage() {
  let tours: ToursForQuoteForm = [];

  try {
    tours = await getToursForQuoteForm();
  } catch (error) {
    console.error("Failed to load tours for quote form:", error);
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Quote
        </h1>
        <p className="text-sm text-gray-600">
          Staff can prepare a quote, finalize it, and send it manually later.
        </p>
      </div>

      {tours.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
          No tours available. Please create a tour first.
        </div>
      ) : (
        <QuoteCreateForm tours={tours} agents={[]} />
      )}
    </div>
  );
}