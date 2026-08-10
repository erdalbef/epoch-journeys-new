import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatPartnerType(value: string | null) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatAddress({
  address,
  city,
  postalCode,
  country,
}: {
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}) {
  const cityLine = [
    postalCode,
    city,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    address,
    cityLine || null,
    country,
  ]
    .filter(Boolean)
    .join(", ");
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <div className="mt-1 text-sm font-medium text-slate-900">
        {value || "—"}
      </div>
    </div>
  );
}

export default async function AdminAgentDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const agent = await db.user.findUnique({
    where: {
      id,
    },

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

      /*
       * Billing & Invoice Information
       */
      billingContactName: true,
      billingCompanyName: true,
      billingEmail: true,
      billingEmailSecondary: true,
      billingAddress: true,
      billingCity: true,
      billingPostalCode: true,
      billingCountry: true,
      billingTaxNumber: true,
    },
  });

  if (!agent) {
    notFound();
  }

  const displayName =
    agent.fullName ||
    agent.email ||
    "Agent";

  const billingAddress =
    formatAddress({
      address:
        agent.billingAddress,

      city:
        agent.billingCity,

      postalCode:
        agent.billingPostalCode,

      country:
        agent.billingCountry,
    });

  return (
    <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border bg-white shadow-sm">
      {/* ======================================== */}
      {/* HEADER */}
      {/* ======================================== */}

      <div className="bg-[#001F3F] p-6 text-white">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xl font-bold">
              {displayName
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                {displayName}
              </h1>

              <p className="text-sm text-white/80">
                {agent.email}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  {agent.approved
                    ? "Approved"
                    : "Pending"}
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  Role: {agent.role}
                </span>

                {agent.partnerType ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                    {formatPartnerType(
                      agent.partnerType,
                    )}
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
              className="rounded border border-white/30 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Back
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================== */}
      {/* CONTENT */}
      {/* ======================================== */}

      <div className="grid gap-6 p-6 xl:grid-cols-3">
        {/* ====================================== */}
        {/* LEFT */}
        {/* ====================================== */}

        <section className="space-y-6 xl:col-span-2">
          {/* Profile */}

          <div className="rounded-xl border bg-slate-50 p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Profile
            </h2>

            <div className="grid gap-x-6 md:grid-cols-2">
              <InfoRow
                label="Full Name"
                value={
                  agent.fullName ||
                  "—"
                }
              />

              <InfoRow
                label="Email"
                value={agent.email}
              />

              <InfoRow
                label="Phone"
                value={
                  agent.phone ||
                  "—"
                }
              />

              <InfoRow
                label="Joined"
                value={formatDate(
                  agent.createdAt,
                )}
              />

              <InfoRow
                label="Status"
                value={agent.status}
              />

              <InfoRow
                label="Membership"
                value={
                  agent.membership ||
                  "—"
                }
              />
            </div>
          </div>

          {/* Business */}

          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Business Information
            </h2>

            <div className="grid gap-x-6 md:grid-cols-2">
              <InfoRow
                label="Travel Agency / Organization"
                value={
                  agent.travelAgency ||
                  "—"
                }
              />

              <InfoRow
                label="Partner Type"
                value={formatPartnerType(
                  agent.partnerType,
                )}
              />

              <InfoRow
                label="Website"
                value={
                  agent.website ? (
                    <a
                      href={agent.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      {agent.website}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />

              <InfoRow
                label="Agent Code"
                value={
                  agent.agentCode ||
                  "—"
                }
              />
            </div>
          </div>

          {/* ==================================== */}
          {/* BILLING */}
          {/* ==================================== */}

          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                Finance
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#001F3F]">
                Billing & Invoice Information
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                These details are used to prefill the Bill To section
                on Proformas and Invoices.
              </p>
            </div>

            <div className="grid gap-x-6 md:grid-cols-2">
              <InfoRow
                label="Billing Contact"
                value={
                  agent.billingContactName ||
                  "—"
                }
              />

              <InfoRow
                label="Legal Billing Name"
                value={
                  agent.billingCompanyName ||
                  "—"
                }
              />

              <InfoRow
                label="Primary Billing Email"
                value={
                  agent.billingEmail ? (
                    <a
                      href={`mailto:${agent.billingEmail}`}
                      className="text-blue-700 hover:underline"
                    >
                      {agent.billingEmail}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />

              <InfoRow
                label="Secondary Billing Email"
                value={
                  agent.billingEmailSecondary ? (
                    <a
                      href={`mailto:${agent.billingEmailSecondary}`}
                      className="text-blue-700 hover:underline"
                    >
                      {agent.billingEmailSecondary}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />

              <div className="md:col-span-2">
                <InfoRow
                  label="Registered / Billing Address"
                  value={
                    billingAddress ||
                    "—"
                  }
                />
              </div>

              <InfoRow
                label="City"
                value={
                  agent.billingCity ||
                  "—"
                }
              />

              <InfoRow
                label="Postal / ZIP Code"
                value={
                  agent.billingPostalCode ||
                  "—"
                }
              />

              <InfoRow
                label="Country"
                value={
                  agent.billingCountry ||
                  "—"
                }
              />

              <InfoRow
                label="Tax / Company Registration Number"
                value={
                  agent.billingTaxNumber ||
                  "—"
                }
              />
            </div>

            {!agent.billingContactName ||
            !agent.billingCompanyName ||
            !agent.billingEmail ||
            !agent.billingAddress ||
            !agent.billingCity ||
            !agent.billingCountry ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                <strong>
                  Billing information is incomplete.
                </strong>{" "}
                Complete the required billing details before using
                this partner for automatic Proforma or Invoice
                prefilling.
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
                Billing information is complete and ready for invoice
                prefilling.
              </div>
            )}
          </div>

          {/* Notes */}

          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Notes
            </h2>

            <div className="whitespace-pre-wrap text-sm text-slate-700">
              {agent.notes ||
                "No notes"}
            </div>
          </div>
        </section>

        {/* ====================================== */}
        {/* RIGHT */}
        {/* ====================================== */}

        <aside className="space-y-4">
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Commission
            </h2>

            <div className="text-3xl font-bold text-[#8B0000]">
              {agent.commissionRate != null
                ? `${agent.commissionRate}%`
                : "—"}
            </div>

            <Link
              href={`/admin/agents/${agent.id}/commissions`}
              className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline"
            >
              Manage Commission
            </Link>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
              Agent Info
            </h2>

            <InfoRow
              label="Agent Code"
              value={
                agent.agentCode ||
                "—"
              }
            />

            <InfoRow
              label="Logo"
              value={
                agent.agentLogoUrl ? (
                  <a
                    href={agent.agentLogoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:underline"
                  >
                    View Logo
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </div>

          <div className="rounded-xl border bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-[#001F3F]">
              Invoice Readiness
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              A partner is ready for automatic invoice prefilling when
              the legal billing name, contact, email, address, city
              and country are complete.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}