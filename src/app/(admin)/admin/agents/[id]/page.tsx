import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function AdminAgentDetailPage({ params }: PageProps) {
  const { id } = await params;

  const agent = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      approved: true,
      commissionRate: true,
      createdAt: true,
      travelAgency: true,
      website: true,
      membership: true,
      notes: true,
      status: true,
      partnerType: true,
      agentCode: true,
      agentLogoUrl: true,
    },
  });

  if (!agent) {
    notFound();
  }

  const displayName = agent.fullName || agent.email || "Agent";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b bg-linear-to-r from-[#001F3F] via-slate-900 to-[#8B0000] px-6 py-6 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold">
                {displayName.slice(0, 1).toUpperCase()}
              </div>

              <div>
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <p className="text-sm text-white/80">{agent.email}</p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                    {agent.approved ? "Approved" : "Pending"}
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                    Role: {agent.role}
                  </span>

                  {agent.partnerType && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                      {agent.partnerType}
                    </span>
                  )}

                  {agent.commissionRate != null && (
                    <span className="rounded-full bg-[#FFD8A8] px-3 py-1 text-xs font-semibold text-[#8B0000]">
                      {agent.commissionRate}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/admin/agents/${agent.id}/commissions`}
                className="rounded bg-white px-4 py-2 text-sm font-semibold text-[#001F3F]"
              >
                Commissions
              </Link>

              <Link
                href="/admin/agents"
                className="rounded border px-4 py-2 text-sm text-white"
              >
                Back
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-3">
          <section className="space-y-4 xl:col-span-2">
            <div className="rounded-xl border bg-slate-50 p-5">
              <h2 className="mb-4 text-lg font-semibold">Profile</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div>Full Name: {agent.fullName || "—"}</div>
                <div>Email: {agent.email}</div>
                <div>Phone: {agent.phone || "—"}</div>
                <div>Joined: {formatDate(agent.createdAt)}</div>
                <div>Status: {agent.status}</div>
                <div>Membership: {agent.membership || "—"}</div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold">
                Business Information
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div>Travel Agency: {agent.travelAgency || "—"}</div>
                <div>Partner Type: {agent.partnerType}</div>
                <div>Website: {agent.website || "—"}</div>
                <div>Agent Code: {agent.agentCode || "—"}</div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold">Notes</h2>
              <div>{agent.notes || "No notes"}</div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold">Commission</h2>

              <div className="text-3xl font-bold">
                {agent.commissionRate != null
                  ? `${agent.commissionRate}%`
                  : "—"}
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold">Agent Info</h2>

              <div>Logo: {agent.agentLogoUrl || "—"}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}