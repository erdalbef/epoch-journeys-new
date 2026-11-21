import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { mapBraveHotelResults, extractDistinctHotelCandidates, validHotelResearchLocation } from "@/lib/epoch-ai/hotelWebResearch";
import { compileHotelEvidence } from "@/lib/epoch-ai/hotelEvidenceResearch";
import type { HotelEvidenceReport } from "@/lib/epoch-ai/hotelEvidenceResearch";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const respond=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
type Input={city:string;country:string;knownNames:string[]};
const cleanNames=(value:unknown)=>Array.isArray(value)?[...new Set(value.filter((s):s is string=>typeof s==="string"&&s.trim().length>=4&&s.length<=100).map(s=>s.trim()))].slice(0,12):[];
/** Admin-only, read-only research. Public snippets are NOT hotel verification. */
export async function POST(request:Request){
 const denied=await requireAdminApiAccess();if(denied)return denied;
 if(request.headers.get("origin")!==new URL(request.url).origin)return respond({error:"Same-origin request required"},403);
 if(Number(request.headers.get("content-length")||0)>4096)return respond({error:"Request too large"},413);
 let input:unknown;try{input=await request.json()}catch{return respond({error:"Invalid request"},400)}
 if(!input||typeof input!=="object")return respond({error:"Invalid request"},400);
 const payload=input as Record<string,unknown>;
 if(!validHotelResearchLocation(payload.city,payload.country))return respond({error:"Valid city and country required"},400);
 const city=(payload.city as string).trim(),country=(payload.country as string).trim();
 const knownNames=cleanNames(payload.knownNames);
 const key=process.env.BRAVE_SEARCH_API_KEY?.trim();if(!key)return respond({error:"Brave Search API key is not configured"},503);
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),28000);
 let calls=0;
 const search=async(q:string)=>{if(++calls>12)throw new Error("Research request limit reached");const url=new URL("https://api.search.brave.com/res/v1/web/search");url.searchParams.set("q",q);url.searchParams.set("count","10");const r=await fetch(url,{headers:{Accept:"application/json","X-Subscription-Token":key},signal:ctrl.signal,cache:"no-store"});if(!r.ok)throw new Error(`Search provider ${r.status}`);return mapBraveHotelResults(await r.json());};
 try {
  const discoveryPages=[...(await search(`4 star hotels ${city} ${country} official hotel websites`)),...(await search(`hotels ${city} ${country} Marriott Hilton Accor IHG official 4 star`))];
  const discovery=extractDistinctHotelCandidates(discoveryPages,knownNames).filter(item=>item.identityStatus!=="identity-review");
  // Research existing known candidates plus new discoveries. Do not favor search order.
  const names=[...new Set([...discovery.map(c=>c.name),...knownNames])].slice(0,8);
  const reports:Record<string,HotelEvidenceReport>={};const errors:string[]=[];
  for(let i=0;i<names.length;i+=2){
   await Promise.all(names.slice(i,i+2).map(async name=>{
    try {const pages=await search(`"${name}" ${city} ${country} official hotel amenities accessibility meeting parking`);
      reports[name]=compileHotelEvidence(name,city,country,pages,new Date().toISOString());
    } catch {errors.push(`Research unavailable for ${name}`);}
   }));
  }
  return respond({city,country,discovered:discovery,reports,researchedCount:Object.keys(reports).length,errors,provider:"Brave Search API",note:"Provisional comparison based on public snippets; no CRM writes, no hotel confirmation and no supplier emails."});
 }catch(error){console.error("DESTINATION_HOTEL_RESEARCH_FAILED",error instanceof Error?error.message:"unknown");return respond({error:"Destination research unavailable; no records changed"},502)}
 finally{clearTimeout(timer)}
}
