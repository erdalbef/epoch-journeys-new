import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { getToursForQuoteForm } from "@/lib/quote-queries";
import QuoteCreateForm from "@/components/quotes/QuoteCreateForm";

export default async function NewQuotePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

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
      />
    </div>
  );
}