import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { getApprovedFlexiblePricing } from "@/lib/quotes/flexibleGroupPricing";

export const dynamic = "force-dynamic";
export default async function AlternativePricingPage({params}:{params:Promise<{id:string}>}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/agent-login");
  const user = await db.user.findUnique({where:{id:session.user.id},select:{id:true,role:true,approved:true,status:true,partnerCompanyId:true}});
  if (!user || user.role !== "AGENT" || !user.approved || user.status !== "ACTIVE") notFound();
  const {id} = await params;
  const quote = await db.quote.findUnique({where:{id},select:{
    id:true,title:true,quoteReference:true,version:true,status:true,agentId:true,requestId:true,partnerCompanyId:true,
    currency:true,clientSinglePrice:true,clientDoubleTwinPrice:true,clientTriplePrice:true,quoteBuilderSummary:true,
    request:{select:{userId:true}},
  }});
  if (!quote || !["SENT","ACCEPTED","CONVERTED"].includes(quote.status)) notFound();
  const owns = quote.request?.userId === user.id ||
    (!!user.partnerCompanyId && quote.partnerCompanyId === user.partnerCompanyId);
  if (!owns) notFound();
  const pricing = getApprovedFlexiblePricing(quote);
  if (!pricing) notFound();
  const money = (n:number|null) => n === null ? "N/A" : new Intl.NumberFormat("en-US",{style:"currency",currency:quote.currency || "EUR"}).format(n);
  return <main className="mx-auto max-w-5xl p-6 md:p-10">
    <div className="mb-8 border-b pb-5"><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Epoch Journeys | Agent NET rates</p>
    <h1 className="mt-2 text-2xl font-bold text-slate-900">Alternative Group Pricing</h1>
    <p className="mt-2 text-slate-600">{quote.title || "Pilgrimage quotation"} | {quote.quoteReference || "Quotation"}</p></div>
    <p className="mb-5 text-sm text-slate-600">Only expressly approved alternatives are shown. Each group basis includes its own complimentary pilgrim count. Prices are NET per paying pilgrim, subject to reconfirmation.</p>
    <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[650px] text-left text-sm">
      <thead className="bg-slate-900 text-white"><tr><th className="p-3">Paying pilgrims</th><th className="p-3">Complimentary pilgrims</th><th className="p-3">Total pilgrims</th><th className="p-3">Double/Twin</th><th className="p-3">Single</th><th className="p-3">Triple</th></tr></thead>
      <tbody>{pricing.tiers.map(t=><tr key={t.payingPilgrims} className="border-t"><td className="p-3">{t.payingPilgrims}</td><td className="p-3">{t.complimentaryPilgrims}</td><td className="p-3">{t.payingPilgrims+t.complimentaryPilgrims}</td><td className="p-3">{money(t.doubleTwin)}</td><td className="p-3">{money(t.single)}</td><td className="p-3">{money(t.triple)}</td></tr>)}</tbody>
    </table></div><div className="mt-4 space-y-2 text-sm text-slate-600">{pricing.tiers.filter(t=>t.roomArrangements || t.note).map(t=><p key={t.payingPilgrims}><strong>{t.payingPilgrims} paying pilgrims:</strong>{t.roomArrangements ? ` Complimentary rooms - ${t.roomArrangements}.` : ""}{t.note ? ` ${t.note}` : ""}</p>)}</div>
    <p className="mt-8 text-sm text-slate-500">Changes to group size, complimentary pilgrim allocations, room arrangements, or supplier availability require a revised quotation.</p>
  </main>;
}
