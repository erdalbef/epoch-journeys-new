import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { mapBraveHotelResults,extractDistinctHotelCandidates,validHotelResearchLocation,webHotelSearchLinks } from "@/lib/epoch-ai/hotelWebResearch";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const response=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
/** Admin request only. No supplier writes, no email sends, no automatic research. */
export async function POST(request:Request){
  const denied=await requireAdminApiAccess();if(denied)return denied;
  const origin=request.headers.get("origin");
  if(!origin || origin!==new URL(request.url).origin)return response({error:"Same-origin request required"},403);
  if(Number(request.headers.get("content-length")||0)>4096)return response({error:"Search request too large"},413);
  let body:unknown;
  try {body=await request.json()}catch{return response({error:"Invalid request"},400)}
  const input=body && typeof body==="object"?body as Record<string,unknown>:{};
  if(!validHotelResearchLocation(input.city,input.country))return response({error:"Valid city and country required"},400);
  const city=(input.city as string).trim(),country=(input.country as string).trim();
  const searchLinks=webHotelSearchLinks(city,country);
  const clientKnown=Array.isArray(input.knownNames)?input.knownNames.filter((n:unknown):n is string=>typeof n==="string" && n.length<120).slice(0,120):[];
  // Known names come from the Admin UI, and are only an exclusion hint.
  // No supplier writes or acceptance are possible via this endpoint.
  const searchQuery=`4 star hotels ${city}, ${country} official hotel website group accommodation`;
  const key=process.env.BRAVE_SEARCH_API_KEY?.trim();
  if(!key)return response({configured:false,mode:"manual",city,country,searchLinks,leads:[],candidates:[],disclaimer:"Open search links and verify independently. No hotel contact, stars, rates or availability assumed."});
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),9000);
  try {
    const q=searchQuery;
    const url=new URL("https://api.search.brave.com/res/v1/web/search");url.searchParams.set("q",q);url.searchParams.set("count","10");
    const upstream=await fetch(url,{headers:{"Accept":"application/json","X-Subscription-Token":key},cache:"no-store",signal:ctrl.signal});
    if(!upstream.ok){console.error("HOTEL_WEB_SEARCH_PROVIDER_FAILED",upstream.status);return response({error:"Public web search unavailable. Check search API credentials and quotas.",searchLinks},502)}
    const data:unknown=await upstream.json();
    const leads=mapBraveHotelResults(data);
    const candidates=extractDistinctHotelCandidates(leads,clientKnown);
    return response({configured:true,mode:"brave",provider:"Brave Search API",city,country,searchLinks,leads,candidates,
      disclaimer:"Candidate names are inferred from public search-result titles, not verified identities, addresses, contacts, facilities, stars, rates or availability."});
  }catch(error){console.error("HOTEL_WEB_SEARCH_FAILED",error instanceof Error?error.name:"unknown");return response({error:"Web search did not complete. No changes were made.",searchLinks},503)}
  finally{clearTimeout(timer)}
}
