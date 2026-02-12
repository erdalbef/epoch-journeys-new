import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ApproveAgentButton } from "../ApproveAgentButton";
import { UnapproveAgentButton } from "../UnapproveAgentButton";
import { AgentCommercialForm } from "./AgentCommercialForm";

type PageProps = {
  params: { id: string };
};

export default async function AdminAgentDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const { id } = params;

  const agent = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      approved: true,
      partnerType: true,
      commissionRate: true,
      fixedPayoutPerPax: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!agent) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agent Details</h1>
          <p className="text-sm text-muted-foreground">
            Manage approval status and commercial rules.
          </p>
        </div>

        <Link
          href="/admin/agents"
          className="text-sm underline underline-offset-4"
        >
          Back to Agents
        </Link>
      </div>

      {/* Info */}
      <section className="rounded-lg border bg-white p-4">
        <div className="space-y-4">
          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Agent ID</div>
            <div className="text-sm font-mono">{agent.id}</div>
          </div>

          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="text-sm font-medium">{agent.email}</div>
          </div>

          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Role</div>
            <div className="text-sm font-medium">{agent.role}</div>
          </div>

          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Approval Status</div>
            <div className="text-sm font-medium">
              {agent.approved ? "Approved" : "Pending"}
            </div>
          </div>

          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Created</div>
            <div className="text-sm">
              {new Date(agent.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Last Updated</div>
            <div className="text-sm">
              {new Date(agent.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {agent.approved ? (
            <UnapproveAgentButton agentId={agent.id} />
          ) : (
            <ApproveAgentButton agentId={agent.id} />
          )}

          <Link
            href="/admin/agents"
            className="rounded-md border px-3 py-1 text-sm"
          >
            Back
          </Link>
        </div>
      </section>

      {/* Commercial Rules */}
      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Commercial Rules</h2>
          <p className="text-xs text-muted-foreground">
            Travel Agents use commission (%). Group Leaders use payout per passenger ($).
          </p>
        </div>

        <AgentCommercialForm
          agentId={agent.id}
          partnerType={agent.partnerType}
          commissionRate={agent.commissionRate}
          fixedPayoutPerPax={agent.fixedPayoutPerPax}
        />
      </section>
    </div>
  );
}
