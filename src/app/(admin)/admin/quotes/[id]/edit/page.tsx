import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { getToursForQuoteForm } from "@/lib/quote-queries";
import QuoteCreateForm from "@/components/quotes/QuoteCreateForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditQuotePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const { id } = await params;

  const quote = await db.quote.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!quote) {
    notFound();
  }

  const tours = await getToursForQuoteForm();

  const agents = await db.user.findMany({
    where: {
      role: "AGENT",
      approved: true,
      status: "ACTIVE",
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      travelAgency: true,
      commissionRate: true,
    },
    orderBy: [
      {
        fullName: "asc",
      },
      {
        email: "asc",
      },
    ],
  });

  const initialData = {
    id: quote.id,
    title: quote.title,
    recipientName: quote.recipientName,
    recipientEmail: quote.recipientEmail,
    internalNotes: quote.internalNotes,
    termsAndNotes: quote.termsAndNotes,
    currency: quote.currency,
    purpose: quote.purpose,
    tourId: quote.tourId,
    departureDateId: quote.departureDateId,
    templateId: quote.templateId,
    quoteBuilderSummary: quote.quoteBuilderSummary,
    items: quote.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      itemType: item.itemType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      taxAmount: item.taxAmount,
      total: item.total,
      optional: item.optional,
      sortOrder: item.sortOrder,
    })),

    clientDocumentTitle: quote.clientDocumentTitle,
    clientSinglePrice: quote.clientSinglePrice,
    clientDoubleTwinPrice: quote.clientDoubleTwinPrice,
    clientTriplePrice: quote.clientTriplePrice,
    clientIncludes: quote.clientIncludes,
    clientExcludes: quote.clientExcludes,
    paymentPolicy: quote.paymentPolicy,
    cancellationPolicy: quote.cancellationPolicy,
    clientOfferNotes: quote.clientOfferNotes,
    validUntil: quote.validUntil,
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Edit Quote</h1>
        <p className="text-sm text-gray-600">
          Update the quote pricing, recipient, and client-facing content.
        </p>
      </div>

      <QuoteCreateForm
        tours={tours}
        agents={agents}
        initialData={initialData}
        mode="edit"
      />
    </div>
  );
}