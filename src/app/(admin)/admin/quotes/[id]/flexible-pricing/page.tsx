import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { getApprovedFlexiblePricing } from "@/lib/quotes/flexibleGroupPricing";
import { getSavedCalculatedSuggestions } from "@/lib/quotes/flexiblePricingSuggestions";
import FlexiblePricingEditor from "./FlexiblePricingEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/admin-login");
  const { id } = await params;
  const quote = await db.quote.findUnique({ where: { id } });
  if (!quote) notFound();
  const approved = getApprovedFlexiblePricing(quote);
  const suggestions = getSavedCalculatedSuggestions(quote.quoteBuilderSummary);
  return <main className="mx-auto max-w-5xl space-y-5 p-6 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[#001F3F]">Flexible Group Pricing</h1>
        <p className="mt-2 text-sm text-slate-600">{quote.quoteReference || quote.title || id}</p>
      </div>
      <Link href={`/admin/quotes/${id}/edit`} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50">Back to Quotation Form</Link>
    </div>
    <p className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      Load NET rates already calculated and <strong>saved</strong> in the quotation. The complimentary policy is evaluated at each paying-pilgrim count; verify individual hotel/room allocations and supplier costs before approval. Unsaved quotation changes are not included.
    </p>
    <FlexiblePricingEditor id={id} initial={approved?.tiers || []} enabled={!!approved} suggestions={suggestions} currency={quote.currency || "EUR"} />
  </main>;
}
