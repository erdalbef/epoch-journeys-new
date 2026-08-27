"use client";

type AgentOption = {
  id: string;
  agentCode: string | null;
  fullName: string | null;
  email: string;
  phone: string | null;
  travelAgency: string | null;
  website: string | null;
  commissionRate: number | null;
  partnerType: string;
  billingCompanyName: string | null;
  billingCompanyRegNo: string | null;
  billingTaxNumber: string | null;
  billingVatNumber: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  billingContactName: string | null;
  billingEmail: string | null;
  billingEmailSecondary: string | null;
  billingPhone: string | null;
};

type Props = {
  agents: AgentOption[];
  agentId: string;
  recipientName: string;
  recipientEmail: string;
  agentCompany: string;
  onAgentChange: (agentId: string) => void;
  onContactNameChange: (value: string) => void;
  onContactEmailChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
};

function displayValue(value: string | null | undefined) {
  return value?.trim() || "—";
}

export default function RecipientSection({
  agents,
  agentId,
  recipientName,
  recipientEmail,
  agentCompany,
  onAgentChange,
  onContactNameChange,
  onContactEmailChange,
  onCompanyChange,
}: Props) {
  const selectedAgent = agents.find((agent) => agent.id === agentId) ?? null;

  const legalCompanyName =
    selectedAgent?.billingCompanyName || selectedAgent?.travelAgency || "";

  const billingContact =
    selectedAgent?.billingContactName || selectedAgent?.fullName || "";

  const billingEmail =
    selectedAgent?.billingEmail || selectedAgent?.email || "";

  const billingPhone =
    selectedAgent?.billingPhone || selectedAgent?.phone || "";

  const billingAddressParts = [
    selectedAgent?.billingAddress,
    selectedAgent?.billingCity,
    selectedAgent?.billingState,
    selectedAgent?.billingPostalCode,
    selectedAgent?.billingCountry,
  ].filter((value): value is string => Boolean(value?.trim()));

  const billingAddress = billingAddressParts.join(", ");

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#001F3F] px-5 py-3 text-white">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-200">
            Step 3
          </div>
          <h2 className="text-lg font-semibold">Travel Agency / Recipient</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
          B2B NET QUOTE
        </span>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Agent</span>
            <select
              className="w-full rounded-md border p-2"
              value={agentId}
              onChange={(event) => onAgentChange(event.target.value)}
            >
              <option value="">Select agent</option>
              {agents.map((agent) => {
                const label =
                  agent.travelAgency ||
                  agent.billingCompanyName ||
                  agent.fullName ||
                  agent.email;

                return (
                  <option key={agent.id} value={agent.id}>
                    {agent.agentCode ? `${agent.agentCode} - ${label}` : label}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Contact Name</span>
            <input
              className="w-full rounded-md border p-2"
              value={recipientName}
              onChange={(event) => onContactNameChange(event.target.value)}
              placeholder="Quotation contact"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Contact Email</span>
            <input
              type="email"
              className="w-full rounded-md border p-2"
              value={recipientEmail}
              onChange={(event) => onContactEmailChange(event.target.value)}
              placeholder="Quotation email"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Travel Agency</span>
            <input
              className="w-full rounded-md border p-2"
              value={agentCompany}
              onChange={(event) => onCompanyChange(event.target.value)}
              placeholder="Agency name"
            />
          </label>
        </div>

        {selectedAgent ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#001F3F]">Agent Master Data</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Permanent legal and billing information is loaded from the Agent
                  master record. Update permanent information from the Agent module,
                  not from the quotation.
                </p>
              </div>

              {selectedAgent.agentCode ? (
                <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800">
                  Agent Code: {selectedAgent.agentCode}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legal Company</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{displayValue(legalCompanyName)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billing Contact</p>
                <p className="mt-1 text-sm text-slate-800">{displayValue(billingContact)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billing Email</p>
                <p className="mt-1 break-words text-sm text-slate-800">{displayValue(billingEmail)}</p>
                {selectedAgent.billingEmailSecondary ? (
                  <p className="mt-1 break-words text-xs text-slate-500">{selectedAgent.billingEmailSecondary}</p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billing Phone</p>
                <p className="mt-1 text-sm text-slate-800">{displayValue(billingPhone)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billing Address</p>
                <p className="mt-1 text-sm text-slate-800">{displayValue(billingAddress)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tax Number</p>
                <p className="mt-1 text-sm text-slate-800">{displayValue(selectedAgent.billingTaxNumber)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">VAT / Tax Office</p>
                <p className="mt-1 text-sm text-slate-800">{displayValue(selectedAgent.billingVatNumber)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company Registration</p>
                <p className="mt-1 text-sm text-slate-800">{displayValue(selectedAgent.billingCompanyRegNo)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website</p>
                <p className="mt-1 break-words text-sm text-slate-800">{displayValue(selectedAgent.website)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed bg-slate-50 p-4 text-sm text-slate-500">
            Select an agent to load its permanent company and billing information.
          </div>
        )}

        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <strong>NET rate policy:</strong> no commission is calculated by Epoch. The agency may apply its own markup/resale price.
        </div>
      </div>
    </section>
  );
}
