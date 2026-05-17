import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

import AgentTourCommissionForm from "../AgentTourCommissionForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminAgentCommissionsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const agent = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      travelAgency: true,
      commissionRate: true,

      agentTourCommissions: {
        include: {
          tour: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!agent) {
    notFound();
  }

  // 👉 Needed for dropdown in form
  const tours = await db.tour.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  const displayName = agent.fullName || agent.email;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-linear-to-r from-[#001F3F] to-[#8B0000] px-6 py-6 text-white">
          <div className="flex justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Commission Management
              </h1>
              <p className="text-sm text-white/80">
                {displayName}
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/admin/agents/${agent.id}`}
                className="bg-white text-[#001F3F] px-4 py-2 rounded font-semibold"
              >
                Agent Detail
              </Link>

              <Link
                href="/admin/agents"
                className="border px-4 py-2 rounded text-white"
              >
                Back
              </Link>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="grid gap-6 p-6 xl:grid-cols-2">
          {/* LEFT — FORM */}
          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold mb-4">
              Add / Update Commission
            </h2>

            <AgentTourCommissionForm
              agentId={agent.id}
              tours={tours}
            />
          </div>

          {/* RIGHT — EXISTING OVERRIDES */}
          <div className="rounded-xl border bg-white p-5">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Existing Overrides
              </h2>

              <span className="text-sm text-gray-500">
                {agent.agentTourCommissions.length} total
              </span>
            </div>

            {agent.agentTourCommissions.length === 0 ? (
              <div className="text-sm text-gray-500">
                No overrides yet.
              </div>
            ) : (
              <div className="space-y-3">
                {agent.agentTourCommissions.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">
                        {item.tour.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.commissionRate != null
                          ? `${item.commissionRate}%`
                          : "—"}{" "}
                        /{" "}
                        {item.payoutPerPax != null
                          ? `€${item.payoutPerPax}`
                          : "—"}
                      </div>
                    </div>

                    {/* FUTURE DELETE BUTTON */}
                    <div className="text-xs text-gray-400">
                      Override
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}