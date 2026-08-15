"use client";

type AgentOption = { id: string; fullName: string | null; email: string; travelAgency: string | null };
type Props = { agents: AgentOption[]; agentId: string; recipientName: string; recipientEmail: string; agentCompany: string; onAgentChange: (agentId: string) => void; onContactNameChange: (value: string) => void; onContactEmailChange: (value: string) => void; onCompanyChange: (value: string) => void };
export default function ContactSection({agents,agentId,recipientName,recipientEmail,agentCompany,onAgentChange,onContactNameChange,onContactEmailChange,onCompanyChange}: Props) {
 return <section className="rounded-xl border p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Travel Agency Contact</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">B2B NET QUOTE</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 <label className="block"><span className="mb-1 block text-sm font-medium">Agent</span><select className="w-full rounded-md border p-2" value={agentId} onChange={(e)=>onAgentChange(e.target.value)}><option value="">Select agent</option>{agents.map(a=><option key={a.id} value={a.id}>{a.fullName||a.email}</option>)}</select></label>
 <label className="block"><span className="mb-1 block text-sm font-medium">Contact Name</span><input className="w-full rounded-md border p-2" value={recipientName} onChange={(e)=>onContactNameChange(e.target.value)}/></label>
 <label className="block"><span className="mb-1 block text-sm font-medium">Contact Email</span><input className="w-full rounded-md border p-2" value={recipientEmail} onChange={(e)=>onContactEmailChange(e.target.value)}/></label>
 <label className="block"><span className="mb-1 block text-sm font-medium">Travel Agency</span><input className="w-full rounded-md border p-2" value={agentCompany} onChange={(e)=>onCompanyChange(e.target.value)}/></label>
 </div><div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><strong>NET rate policy:</strong> no commission is calculated by Epoch. The agency may apply its own markup/resale price.</div></section>;
}
