import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import {compileHotelEvidence,mapBraveHotelResults,validHotelEvidenceRequest} from "@/lib/epoch-ai/hotelEvidenceResearch";
import {extractStructuredHotelResearch} from "@/lib/epoch-ai/hotelStructuredResearch";
import {buildHotelSupplierResearch} from "@/lib/epoch-ai/hotelSupplierResearch";
import type {WebHotelResult} from "@/lib/epoch-ai/hotelWebResearch";
import {officialHotelSearchDomain,selectHotelOfficialSiteCandidates} from "@/lib/epoch-ai/hotelOfficialSiteSelection";
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
  const headers={Accept:"application/json","X-Subscription-Token":key};
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),11000);
  try {
    const property = `"${hotelName.replace(/"/g, "")}" ${city} ${country}`;
    const queries = [
      `${property} official hotel contact email phone sales group reservations`,
      `${property} hotel facilities walk-in shower elevator coach access porterage meeting room`
    ];
    async function search(q:string) {
      const url=new URL("https://api.search.brave.com/res/v1/web/search");url.searchParams.set("q",q);url.searchParams.set("count","10");url.searchParams.set("extra_snippets","true");
      const res=await fetch(url,{headers,cache:"no-store",redirect:"error",signal:ctrl.signal});
      if(!res.ok)throw new Error(`Search provider ${res.status}`);
      return mapBraveHotelResults(await res.json());
    }
    const batches=await Promise.allSettled(queries.map(search));
    const lists = batches.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    if (!lists.length) throw new Error("All search requests failed");

    const pagesByUrl = new Map<string, WebHotelResult>();
    function mergePages(results:WebHotelResult[]) {
      for (const page of results) {
        const existing = pagesByUrl.get(page.url);
        const description = [...new Set([existing?.description, page.description].filter(Boolean))].join(" … ");
        pagesByUrl.set(page.url, {...page, description});
      }
    }
    const searchedAt = new Date().toISOString();
    function compile() {
      const pages = [...pagesByUrl.values()];
      const officialSiteCandidates = selectHotelOfficialSiteCandidates(hotelName, pages);
      const candidateUrls = new Set(officialSiteCandidates.map(candidate => candidate.sourceUrl));
      const prioritizedPages = [...pages].sort((a, b) => Number(candidateUrls.has(b.url)) - Number(candidateUrls.has(a.url)));
      const structuredResearch = extractStructuredHotelResearch(hotelName, prioritizedPages);
      const report = compileHotelEvidence(hotelName, city, country, pages, searchedAt);
      const supplierResearch = buildHotelSupplierResearch(hotelName, city, pages, officialSiteCandidates, structuredResearch.contacts, report.findings);
      return {report, structuredResearch, officialSiteCandidates, supplierResearch};
    }
    mergePages(lists.flat());
    let research = compile();
    const domain = officialHotelSearchDomain(hotelName) ?? research.officialSiteCandidates[0]?.hostname;
    const {contacts, phone} = research.supplierResearch;
    if (domain && !ctrl.signal.aborted && (!contacts.length || (!contacts[0].phone && !phone))) {
      const fallback = await search(`site:${domain} ${property} contact information email telephone`).catch(() => []);
      if (fallback.length) {
        mergePages(fallback);
        research = compile();
      }
    }
    return respond({
      ...research,
      partial: lists.length !== queries.length,
      pagesReviewed: pagesByUrl.size
    });
  }catch(error){console.error("HOTEL_EVIDENCE_SEARCH_FAILED",error instanceof Error?error.message:"unknown");return respond({error:"Hotel research could not complete; no data changed"},502)}
  finally{clearTimeout(timer)}
}
