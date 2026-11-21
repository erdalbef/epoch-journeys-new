import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { pricingFingerprint } from "@/lib/quotes/flexibleGroupPricing";

export async function PUT(req: NextRequest, context: {params: Promise<{id: string}>}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
  const {id} = await context.params;
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({error:"Invalid request"},{status:400});
  const data = body as Record<string,unknown>;
  const quote = await db.quote.findUnique({where:{id}});
  if (!quote) return NextResponse.json({error:"Quote not found"},{status:404});
  const summary = quote.quoteBuilderSummary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return NextResponse.json({error:"Quotation summary missing"},{status:400});
  const current = summary as Record<string,unknown>;
  if (data.enabled === false) {
    const updated = {...current, flexibleGroupPricing: {enabled:false, tiers:[]}};
    await db.quote.update({where:{id},data:{quoteBuilderSummary:updated as Prisma.InputJsonValue}});
    return NextResponse.json({ok:true,enabled:false});
  }
  if (data.enabled !== true || !Array.isArray(data.tiers) || data.tiers.length < 1 || data.tiers.length > 12)
    return NextResponse.json({error:"Provide 1 to 12 explicitly approved tiers"},{status:400});
  const tiers = [];
  const seen = new Set<number>();
  for (const item of data.tiers) {
    if (!item || typeof item !== "object") return NextResponse.json({error:"Invalid tier"},{status:400});
    const t = item as Record<string,unknown>;
    const payingPilgrims = Number(t.payingPilgrims);
    const complimentaryPilgrims = Number(t.complimentaryPilgrims);
    const single = Number(t.single);
    const doubleTwin = Number(t.doubleTwin);
    const triple = t.triple === null || t.triple === "" || t.triple === undefined ? null : Number(t.triple);
    if (!Number.isInteger(payingPilgrims) || payingPilgrims < 1 || payingPilgrims > 10000 ||
        seen.has(payingPilgrims) || !Number.isInteger(complimentaryPilgrims) || complimentaryPilgrims < 0 || complimentaryPilgrims > 1000 ||
        !Number.isFinite(single) || single <= 0 || !Number.isFinite(doubleTwin) || doubleTwin <= 0 ||
        (triple !== null && (!Number.isFinite(triple) || triple <= 0)))
      return NextResponse.json({error:"Each tier needs unique paying pilgrims, exact COMPs, and valid positive NET prices"},{status:400});
    seen.add(payingPilgrims);
    tiers.push({payingPilgrims, complimentaryPilgrims, single, doubleTwin, triple, note: String(t.note || "").slice(0,240)});
  }
  const approval = {enabled:true,quoteVersion:quote.version,fingerprint:pricingFingerprint(quote),approvedAt:new Date().toISOString(),tiers};
  await db.quote.update({where:{id},data:{quoteBuilderSummary:{...current,flexibleGroupPricing:approval} as Prisma.InputJsonValue}});
  return NextResponse.json({ok:true,approval});
}
