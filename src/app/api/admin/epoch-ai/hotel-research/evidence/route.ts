import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import {compileHotelEvidence,mapBraveHotelResults,validHotelEvidenceRequest} from "@/lib/epoch-ai/hotelEvidenceResearch";
import {extractStructuredHotelResearch} from "@/lib/epoch-ai/hotelStructuredResearch";
import {buildHotelSupplierResearch} from "@/lib/epoch-ai/hotelSupplierResearch";
import type {WebHotelResult} from "@/lib/epoch-ai/hotelWebResearch";
import {selectHotelOfficialSiteCandidates} from "@/lib/epoch-ai/hotelOfficialSiteSelection";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const respond=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
/** Read-only public research. Never writes Supplier CRM, approves suppliers or sends email. */
export async function POST(request:Request){
  const denied=await requireAdminApiAccess();if(denied)return denied;
  if(request.headers.get("origin")!==new URL(request.url).origin)return respond({error:"Same-origin request required"},403);
  if(Number(request.headers.get("content-length")||0)>4096)return respond({error:"Request too large"},413);
  let value:unknown;try{value=await request.json()}catch{return respond({error:"Invalid request"},400)}
  if(!validHotelEvidenceRequest(value))return respond({error:"Valid hotel, destination and country required"},400);
  const {hotelName,city,country}=value;
  const key=process.env.BRAVE_SEARCH_API_KEY?.trim();
  if(!key)return respond({error:"Brave Search API key is not configured on the server"},503);
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),11000);
  try {
    const property = `"${hotelName.replace(/"/g, "")}" ${city} ${country}`;
    const queries = [
      `${property} official hotel contact email phone sales group reservations`,
      `${property} hotel facilities walk-in shower elevator coach access porterage meeting room`
    ];
    const batches=await Promise.allSettled(queries.map(async q=>{
      const url=new URL("https://api.search.brave.com/res/v1/web/search");url.searchParams.set("q",q);url.searchParams.set("count","10");url.searchParams.set("extra_snippets","true");
      const res=await fetch(url,{headers:{Accept:"application/json","X-Subscription-Token":key},cache:"no-store",redirect:"error",signal:ctrl.signal});
      if(!res.ok)throw new Error(`Search provider ${res.status}`);
      return mapBraveHotelResults(await res.json());
    }));
    const lists = batches.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    if (!lists.length) throw new Error("All search requests failed");

    const pagesByUrl = new Map<string, WebHotelResult>();
    for (const page of lists.flat()) {
      const existing = pagesByUrl.get(page.url);
      const description = [...new Set([existing?.description, page.description].filter(Boolean))].join(" … ");
      pagesByUrl.set(page.url, {...page, description});
    }
    const pages = [...pagesByUrl.values()];
    const officialSiteCandidates = selectHotelOfficialSiteCandidates(hotelName, pages);
    const candidateUrls = new Set(officialSiteCandidates.map(candidate => candidate.sourceUrl));
    const prioritizedPages = [...pages].sort((a, b) =>
      Number(candidateUrls.has(b.url)) - Number(candidateUrls.has(a.url))
    );
    const structuredResearch = extractStructuredHotelResearch(hotelName, prioritizedPages);
    return respond({
      report: compileHotelEvidence(hotelName, city, country, pages, new Date().toISOString()),
      structuredResearch,
      officialSiteCandidates,
      supplierResearch: buildHotelSupplierResearch(hotelName, city, pages, officialSiteCandidates, structuredResearch.contacts),
      partial: lists.length !== queries.length,
      pagesReviewed: pages.length
    });
  }catch(error){console.error("HOTEL_EVIDENCE_SEARCH_FAILED",error instanceof Error?error.message:"unknown");return respond({error:"Hotel research could not complete; no data changed"},502)}
  finally{clearTimeout(timer)}
}
