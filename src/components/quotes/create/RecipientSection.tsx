"use client";

type AgentOption = {
  id: string;
  fullName: string | null;
  email: string;
  travelAgency: string | null;
};

type Props = {
  agents: AgentOption[];

  agentId: string;
  recipientName: string;
  recipientEmail: string;
  agentCompany: string;
  commissionPercent: number;
  commissionSource: string;

  onAgentChange: (agentId: string) => void;
  onRecipientNameChange: (value: string) => void;
  onRecipientEmailChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
};

export default function RecipientSection({
  agents,
  agentId,
  recipientName,
  recipientEmail,
  agentCompany,
  commissionPercent,
  commissionSource,
  onAgentChange,
  onRecipientNameChange,
  onRecipientEmailChange,
  onCompanyChange,
}: Props) {
  return (
    <section className="rounded-xl border p-5">
      <h2 className="mb-4 text-lg font-semibold">Recipient</h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Agent */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Agent</span>
          <select
            className="w-full rounded-md border p-2"
            value={agentId}
            onChange={(e) => onAgentChange(e.target.value)}
          >
            <option value="">Select agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.fullName || agent.email}
              </option>
            ))}
          </select>
        </label>

        {/* Name */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Recipient Name
          </span>
          <input
            className="w-full rounded-md border p-2"
            value={recipientName}
            onChange={(e) => onRecipientNameChange(e.target.value)}
          />
        </label>

        {/* Email */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Recipient Email
          </span>
          <input
            className="w-full rounded-md border p-2"
            value={recipientEmail}
            onChange={(e) => onRecipientEmailChange(e.target.value)}
          />
        </label>

        {/* Company (editable) */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Company Name
          </span>
          <input
            className="w-full rounded-md border p-2"
            value={agentCompany}
            onChange={(e) => onCompanyChange(e.target.value)}
          />
        </label>
      </div>

      {/* Commission Info */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border bg-slate-50 p-3 text-sm">
          <div className="font-medium text-slate-700">
            Applied Commission
          </div>
          <div className="mt-1 text-lg font-semibold">
            {commissionPercent}%
          </div>
          <div className="text-xs text-slate-500">
            {commissionSource || "No commission loaded"}
          </div>
        </div>
      </div>
    </section>
  );
}