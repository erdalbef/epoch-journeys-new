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

  /*
   * AGENT MASTER DATA
   *
   * Keep the edit flow aligned with New Quote.
   * Permanent legal, contact, and billing information is
   * loaded from the Agent master record rather than re-entered.
   */
  const agents = await db.user.findMany({
    where: {
      role: "AGENT",
      approved: true,
      status: "ACTIVE",
    },
    select: {
      id: true,

      agentCode: true,

      fullName: true,
      email: true,
      phone: true,

      travelAgency: true,
      website: true,

      commissionRate: true,
      partnerType: true,

      billingCompanyName: true,
      billingCompanyRegNo: true,
      billingTaxNumber: true,
      billingVatNumber: true,

      billingAddress: true,
      billingCity: true,
      billingState: true,
      billingPostalCode: true,
      billingCountry: true,

      billingContactName: true,
      billingEmail: true,
      billingEmailSecondary: true,
      billingPhone: true,
    },
    orderBy: [
      {
        travelAgency: "asc",
      },
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

    /*
     * Direct Agent relationship.
     * This allows Edit Quote to reopen the correct Agent
     * without trying to identify it only by email or name.
     */
    agentId: quote.agentId,

    /*
     * Historical company-name snapshot saved on Quote.
     */
    agentCompany: quote.agentName,

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
        <h1 className="text-2xl font-semibold">
          Edit Quote
        </h1>

        <p className="text-sm text-gray-600">
          Update the quote pricing, recipient, and client-facing content. Permanent
          agency information is loaded from Agent Master.
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
