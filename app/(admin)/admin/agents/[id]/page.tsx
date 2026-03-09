import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { AgentCommercialForm } from "./AgentCommercialForm";
import { AdminAgentActions } from "./AdminAgentActions";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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

  const { id } = await params;

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

  return (
    <div className="space-y-8">
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

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Account Information</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="text-sm">{agent.email}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">Role</div>
            <div className="text-sm">{agent.role}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">Approved</div>
            <div className="text-sm">{agent.approved ? "Yes" : "No"}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">Status</div>
            <div className="text-sm">{agent.status}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">Full Name</div>
            <div className="text-sm">{agent.fullName || "-"}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Partner Type
            </div>
            <div className="text-sm">{formatPartnerType(agent.partnerType)}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Travel Agency
            </div>
            <div className="text-sm">{agent.travelAgency || "-"}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">Phone</div>
            <div className="text-sm">{agent.phone || "-"}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">Website</div>
            <div className="text-sm">{agent.website || "-"}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Membership
            </div>
            <div className="text-sm">{agent.membership || "-"}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Created At
            </div>
            <div className="text-sm">
              {new Date(agent.createdAt).toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Updated At
            </div>
            <div className="text-sm">
              {new Date(agent.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium text-muted-foreground">Notes</div>
          <div className="text-sm">{agent.notes || "-"}</div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Commercial Settings</h2>

        <AgentCommercialForm
          agentId={agent.id}
          partnerType={agent.partnerType}
          commissionRate={agent.commissionRate}
          payoutPerPax={agent.payoutPerPax}
        />
      </section>
    </div>
  );
}