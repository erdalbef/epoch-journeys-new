import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

import { ApproveAgentButton } from "./ApproveAgentButton";
import { UnapproveAgentButton } from "./UnapproveAgentButton";
import { DeleteAgentButton } from "./DeleteAgentButton";

function formatPartnerInfo(u: {
  partnerType: string | null;
  commissionRate: number | null;
  payoutPerPax: number | null;
}) {
  if (!u.partnerType) return "-";

  if (
    u.partnerType === "TOUR_OPERATOR" ||
    u.partnerType === "TRAVEL_AGENCY" ||
    u.partnerType === "TRAVEL_EXPERT"
  ) {
    if (u.commissionRate == null) {
      return `${u.partnerType} • (no commission set)`;
    }

    return `${u.partnerType} • ${(u.commissionRate * 100).toFixed(
      0,
    )}% commission`;
  }

  if (u.partnerType === "GROUP_LEADER") {
    if (u.payoutPerPax == null) {
      return "Group Leader • (no payout set)";
    }

    return `Group Leader • $${u.payoutPerPax.toFixed(0)} / pax`;
  }

  return u.partnerType;
}

export default async function AdminAgentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }

  const pendingAgents = await db.user.findMany({
    where: {
      role: "AGENT",
      approved: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      partnerType: true,
      commissionRate: true,
      payoutPerPax: true,
    },
  });

  const approvedAgents = await db.user.findMany({
    where: {
      role: "AGENT",
      approved: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      partnerType: true,
      commissionRate: true,
      payoutPerPax: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Partners
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage approvals, commercial rules, and partner accounts.
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
                className="flex flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
                    Created:{" "}
                    {new Date(u.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/agents/${u.id}`}
                    className="rounded bg-[#001F3F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#001533]"
                  >
                    Commercial
                  </Link>

                  <ApproveAgentButton agentId={u.id} />

                  <DeleteAgentButton
                    agentId={u.id}
                    agentEmail={u.email}
                  />
                </div>
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
                className="flex flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
                    Created:{" "}
                    {new Date(u.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/agents/${u.id}`}
                    className="rounded bg-[#001F3F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#001533]"
                  >
                    Commercial
                  </Link>

                  <UnapproveAgentButton agentId={u.id} />

                  <DeleteAgentButton
                    agentId={u.id}
                    agentEmail={u.email}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        <strong>Delete</strong> is intended for test, duplicate, or
        unused partner accounts. Partners with existing bookings cannot
        be deleted and should be unapproved instead.
      </div>
    </div>
  );
}