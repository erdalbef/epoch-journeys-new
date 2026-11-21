import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { getApprovedFlexiblePricing } from "@/lib/quotes/flexibleGroupPricing";
import FlexiblePricingEditor from "./FlexiblePricingEditor";
export default async function Page({params}:{params:Promise<{id:string}>}) {
 const session = await getServerSession(authOptions);
 if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/admin-login");
 const {id}=await params;
 const quote=await db.quote.findUnique({where:{id}});
 if(!quote) notFound();
 const approved=getApprovedFlexiblePricing(quote);
 return <main className="mx-auto max-w-5xl p-8"><h1 className="text-2xl font-bold">Approve Alternative Group Pricing</h1>
 <p className="my-3 text-slate-600">{quote.quoteReference || quote.title || id}. Each alternative must be individually costed and explicitly approved. No automatic scaling of COMPs or prices.</p>
 <FlexiblePricingEditor id={id} initial={approved?.tiers || []} enabled={!!approved}/></main>;
}
