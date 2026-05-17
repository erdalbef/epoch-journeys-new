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

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create Quote</h1>
        <p className="text-sm text-gray-600">
          Staff can prepare a quote, calculate pricing, and save it as a draft.
        </p>
      </div>

      <QuoteCreateForm tours={tours} agents={agents} />
    </div>
  );
}