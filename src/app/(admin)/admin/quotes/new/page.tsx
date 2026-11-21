import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { getToursForQuoteForm } from "@/lib/quote-queries";
import QuoteCreateForm from "@/components/quotes/QuoteCreateForm";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ requestId?: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const { requestId } = await searchParams;
  const request = requestId ? await db.customTourRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, fullName: true, email: true, travelAgency: true } } },
  }) : null;
  if (requestId && !request) redirect("/admin/custom-requests");
  const requestPrefill = request ? {
    requestId: request.id,
    reference: request.requestReference,
    agentId: request.userId,
    title: request.requestName || request.title || request.groupName || "Quotation",
    tourId: request.tourId,
    recipientName: request.user.fullName || "",
    recipientEmail: request.user.email,
    company: request.companyName || request.user.travelAgency || "",
    payingPax: request.estimatedPax, // Legacy property name; value is requested TOTAL group size.
    complimentaryPax: request.complimentaryPlaces,
    startDate: request.startDate?.toISOString().slice(0,10) || "",
    endDate: request.endDate?.toISOString().slice(0,10) || "",
    notes: [request.specialRequests, request.notes, request.extensionRequest, request.specialChurchRequests,
      request.needsFlights ? "Package: Land + International Flights" : "Package: Land Only",
      request.dailyMassRequested ? "Daily Mass requested" : "Daily Mass not requested",
      request.priestTraveling ? "Priest traveling with group" : "",
      request.guideLanguage ? `Guide language: ${request.guideLanguage}` : "",
      request.datesFlexible ? "Travel dates flexible" : ""].filter(Boolean).join("\n"),
  } : undefined;
  const tours = await getToursForQuoteForm();

  /*
   * AGENT MASTER DATA
   *
   * Permanent agency/contact/billing information is loaded
   * here once and passed into the quotation builder.
   *
   * The quotation should not require staff to repeatedly
   * type information already stored in the Agent master.
   */
  const agents = await db.user.findMany({
    where: {
      role: "AGENT",
      approved: true,
      status: "ACTIVE",
    },

    select: {
      id: true,

      // Agent identity
      agentCode: true,
      fullName: true,
      email: true,
      phone: true,
      travelAgency: true,
      website: true,

      // Commercial information
      commissionRate: true,
      partnerType: true,

      // Permanent billing / legal information
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

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Create Quote
        </h1>

        <p className="text-sm text-gray-600">
          Prepare a B2B quotation using the selected agent&apos;s master data,
          requested itinerary, supplier costs, and NET pricing.
        </p>
      </div>

      <QuoteCreateForm
        tours={tours}
        agents={agents}
        requestPrefill={requestPrefill}
      />
    </div>
  );
}