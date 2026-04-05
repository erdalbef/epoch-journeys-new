import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { AgentCommercialForm } from "./AgentCommercialForm";
import { AdminAgentActions } from "./AdminAgentActions";
import { AgentTourCommissionForm } from "./AgentTourCommissionForm";

type PageProps = {
  params: {
    id: string;
  };
};

function formatPartnerType(partnerType: string | null) {
  if (!partnerType) return "-";

  switch (partnerType) {
    case "TOUR_OPERATOR":
      return "Tour Operator";
    case "TRAVEL_AGENCY":
      return "Travel Agency";
    case "TRAVEL_EXPERT":
      return "Travel Advisor / Expert";
    case "GROUP_LEADER":
      return "Group Leader";
    default:
      return partnerType;
  }
}

export default async function AdminAgentDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const { id } = params;

  if (!id) {
    notFound();
  }

  const agent = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      approved: true,
      status: true,
      partnerType: true,
      commissionRate: true,
      payoutPerPax: true,
      fullName: true,
      travelAgency: true,
      phone: true,
      website: true,
      membership: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!agent) {
    notFound();
  }

  const tours = await db.tour.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      title: true,
    },
    orderBy: { title: "asc" },
  });

  const overrides = await db.agentTourCommission.findMany({
    where: { agentId: agent.id },
    include: {
      tour: true,
    },
  });

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Partner Detail</h1>
          <p className="text-sm text-muted-foreground">
            Review account details and update commercial settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/agents"
            className="text-sm underline underline-offset-4"
          >
            Back to Partners
          </Link>

          <AdminAgentActions
            agentId={agent.id}
            approved={agent.approved}
          />
        </div>
      </div>

      {/* ACCOUNT INFO */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Account Information</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email" value={agent.email} />
          <Field label="Role" value={agent.role} />
          <Field label="Approved" value={agent.approved ? "Yes" : "No"} />
          <Field label="Status" value={agent.status} />
          <Field label="Full Name" value={agent.fullName || "-"} />
          <Field
            label="Partner Type"
            value={formatPartnerType(agent.partnerType)}
          />
          <Field label="Travel Agency" value={agent.travelAgency || "-"} />
          <Field label="Phone" value={agent.phone || "-"} />
          <Field label="Website" value={agent.website || "-"} />
          <Field label="Membership" value={agent.membership || "-"} />
        </div>
      </section>

      {/* DEFAULT COMMISSION */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Default Commercial Settings
        </h2>

        <AgentCommercialForm
          agentId={agent.id}
          partnerType={agent.partnerType}
          commissionRate={agent.commissionRate}
          payoutPerPax={agent.payoutPerPax}
        />
      </section>

      {/* TOUR OVERRIDES */}
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Tour Commission Overrides
        </h2>

        <AgentTourCommissionForm agentId={agent.id} tours={tours} />

        <div className="mt-6 space-y-3">
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No overrides defined.
            </p>
          ) : (
            overrides.map((o) => (
              <div
                key={o.id}
                className="flex justify-between items-center border rounded p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{o.tour.title}</div>
                  <div className="text-muted-foreground">
                    {o.commissionRate
                      ? `Commission: ${o.commissionRate * 100}%`
                      : `Payout: €${o.payoutPerPax}`}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}