import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { ApproveAgentButton } from "./ApproveAgentButton";
import { UnapproveAgentButton } from "./UnapproveAgentButton";

function formatPartnerInfo(u: {
  partnerType: string | null;
  commissionRate: number | null;
  fixedPayoutPerPax: number | null;
}) {
  if (!u.partnerType) return "-";

  if (u.partnerType === "TRAVEL_AGENT") {
    if (u.commissionRate == null) return "Travel Agent • (no commission set)";
    return `Travel Agent • ${(u.commissionRate * 100).toFixed(0)}% commission`;
  }

  if (u.partnerType === "GROUP_LEADER") {
    if (u.fixedPayoutPerPax == null) return "Group Leader • (no payout set)";
    return `Group Leader • $${u.fixedPayoutPerPax.toFixed(0)} / pax`;
  }

  return u.partnerType;
}

export default async function AdminAgentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const pendingAgents = await db.user.findMany({
    where: { role: "AGENT", approved: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      createdAt: true,
      partnerType: true,
      commissionRate: true,
      fixedPayoutPerPax: true,
    },
  });

  const approvedAgents = await db.user.findMany({
    where: { role: "AGENT", approved: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      createdAt: true,
      partnerType: true,
      commissionRate: true,
      fixedPayoutPerPax: true,
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Partners</h1>
          <p className="text-sm text-muted-foreground">
            Manage approvals and commercial rules for partner accounts.
          </p>
        </div>

        <Link
          href="/admin/dashboard"
          className="text-sm underline underline-offset-4"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Pending */}
      <section className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3 text-sm font-medium">
          Pending Approval ({pendingAgents.length})
        </div>

        {pendingAgents.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No pending partners.
          </div>
        ) : (
          <div className="divide-y">
            {pendingAgents.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="space-y-1">
                  <Link
                    href={`/admin/agents/${u.id}`}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    {u.email}
                  </Link>

                  <div className="text-xs text-muted-foreground">
                    {formatPartnerInfo(u)}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(u.createdAt).toLocaleString()}
                  </div>
                </div>

                <ApproveAgentButton agentId={u.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approved */}
      <section className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3 text-sm font-medium">
          Approved Partners ({approvedAgents.length})
        </div>

        {approvedAgents.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No approved partners.
          </div>
        ) : (
          <div className="divide-y">
            {approvedAgents.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="space-y-1">
                  <Link
                    href={`/admin/agents/${u.id}`}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    {u.email}
                  </Link>

                  <div className="text-xs text-muted-foreground">
                    {formatPartnerInfo(u)}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Approved (created): {new Date(u.createdAt).toLocaleString()}
                  </div>
                </div>

                <UnapproveAgentButton agentId={u.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
