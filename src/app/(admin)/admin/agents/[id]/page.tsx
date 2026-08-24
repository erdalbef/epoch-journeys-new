import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { EditAgentForm } from "./EditAgentForm";

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

function partnerTypeLabel(value: string | null) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

                  {agent.partnerType ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                      {partnerTypeLabel(agent.partnerType)}
                    </span>
                  ) : null}

                  {agent.commissionRate != null ? (
                    <span className="rounded-full bg-[#FFD8A8] px-3 py-1 text-xs font-semibold text-[#8B0000]">
                      {agent.commissionRate}%
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/admin/agents/${agent.id}/commissions`}
                className="rounded bg-white px-4 py-2 text-sm font-semibold text-[#001F3F]"
              >
                Commissions
              </Link>

              <Link
                href="/admin/agents"
                className="rounded border border-white/30 px-4 py-2 text-sm text-white"
              >
                Back
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-3">
          <section className="space-y-6 xl:col-span-2">
            <div className="rounded-xl border bg-slate-50 p-5">
              <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
                Partner Overview
              </h2>

              <div className="grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <span className="font-semibold">Full Name:</span>{" "}
                  {agent.fullName || "—"}
                </div>

                <div>
                  <span className="font-semibold">Email:</span> {agent.email}
                </div>

                <div>
                  <span className="font-semibold">Phone:</span>{" "}
                  {agent.phone || "—"}
                </div>

                <div>
                  <span className="font-semibold">Joined:</span>{" "}
                  {formatDate(agent.createdAt)}
                </div>

                <div>
                  <span className="font-semibold">Status:</span> {agent.status}
                </div>

                <div>
                  <span className="font-semibold">Partner Type:</span>{" "}
                  {partnerTypeLabel(agent.partnerType)}
                </div>

                <div>
                  <span className="font-semibold">Travel Agency:</span>{" "}
                  {agent.travelAgency || "—"}
                </div>

                <div>
                  <span className="font-semibold">Agent Code:</span>{" "}
                  {agent.agentCode || "—"}
                </div>
              </div>
            </div>

            <EditAgentForm
              agentId={agent.id}
              fullName={agent.fullName}
              travelAgency={agent.travelAgency}
              phone={agent.phone}
              website={agent.website}
              membership={agent.membership}
              notes={agent.notes}
              billingCompanyName={agent.billingCompanyName}
              billingCompanyRegNo={agent.billingCompanyRegNo}
              billingTaxNumber={agent.billingTaxNumber}
              billingVatNumber={agent.billingVatNumber}
              billingAddress={agent.billingAddress}
              billingCity={agent.billingCity}
              billingState={agent.billingState}
              billingPostalCode={agent.billingPostalCode}
              billingCountry={agent.billingCountry}
              billingContactName={agent.billingContactName}
              billingEmail={agent.billingEmail}
              billingEmailSecondary={agent.billingEmailSecondary}
              billingPhone={agent.billingPhone}
            />
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
                Commission
              </h2>

              <div className="text-3xl font-bold">
                {agent.commissionRate != null
                  ? `${agent.commissionRate}%`
                  : "—"}
              </div>

              <Link
                href={`/admin/agents/${agent.id}/commissions`}
                className="mt-4 inline-block text-sm font-semibold text-[#8B0000] hover:underline"
              >
                Manage commissions
              </Link>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
                Billing Snapshot
              </h2>

              <div className="space-y-3 text-sm text-slate-700">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Legal Name
                  </p>
                  <p>{agent.billingCompanyName || "—"}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    VAT Number
                  </p>
                  <p>{agent.billingVatNumber || "—"}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Billing Email
                  </p>
                  <p className="break-all">{agent.billingEmail || "—"}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Country
                  </p>
                  <p>{agent.billingCountry || "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
                Agent Info
              </h2>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Membership:</span>{" "}
                  {agent.membership || "—"}
                </div>

                <div>
                  <span className="font-semibold">Website:</span>{" "}
                  {agent.website || "—"}
                </div>

                <div>
                  <span className="font-semibold">Logo:</span>{" "}
                  {agent.agentLogoUrl || "—"}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
