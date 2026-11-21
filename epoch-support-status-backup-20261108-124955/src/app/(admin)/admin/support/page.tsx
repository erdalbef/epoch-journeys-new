import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminSupportInbox() {
  const tickets = await db.supportMessage.findMany({
    orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, userId: true, subject: true, status: true, createdAt: true, requestType: true },
  });
  const agents = await db.user.findMany({
    where: { id: { in: [...new Set(tickets.map((t) => t.userId))] } },
    select: { id: true, fullName: true, email: true, travelAgency: true },
  });
  const agentMap = new Map(agents.map((a) => [a.id, a]));
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold text-slate-900">Agent Support Center</h1>
      <p className="mt-2 text-slate-600">Private agent requests. AI drafts require human review; nothing is sent automatically.</p></div>
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>
        <th className="p-4">Received</th><th className="p-4">Travel Agency</th><th className="p-4">Subject</th><th className="p-4">Status</th><th className="p-4">Open</th>
      </tr></thead><tbody>
        {tickets.map((t) => { const a = agentMap.get(t.userId); return <tr key={t.id} className="border-t">
          <td className="p-4 whitespace-nowrap">{t.createdAt.toLocaleDateString("en-GB")}</td>
          <td className="p-4">{a?.travelAgency || a?.fullName || a?.email || "Unknown agency"}</td>
          <td className="p-4">{t.subject}</td><td className="p-4">{t.status}</td>
          <td className="p-4"><Link className="font-medium text-red-800 underline" href={`/admin/support/${t.id}`}>Review</Link></td>
        </tr>; })}
        {tickets.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No support requests yet.</td></tr>}
      </tbody></table>
    </div>
  </div>;
}
