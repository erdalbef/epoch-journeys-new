import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { mapBraveHotelResults,validHotelResearchLocation,webHotelSearchLinks } from "@/lib/epoch-ai/hotelWebResearch";
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
  const key=process.env.BRAVE_SEARCH_API_KEY?.trim();
  if(!key)return response({configured:false,mode:"manual",city,country,searchLinks,leads:[],disclaimer:"Open search links and verify independently. No hotel contact, stars, rates or availability assumed."});
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),9000);
  try {
    const q=`4 star hotels ${city}, ${country} official hotel website group accommodation`;
    const url=new URL("https://api.search.brave.com/res/v1/web/search");url.searchParams.set("q",q);url.searchParams.set("count","10");
    const upstream=await fetch(url,{headers:{"Accept":"application/json","X-Subscription-Token":key},cache:"no-store",signal:ctrl.signal});
    if(!upstream.ok){console.error("HOTEL_WEB_SEARCH_PROVIDER_FAILED",upstream.status);return response({error:"Public web search unavailable. Check search API credentials and quotas.",searchLinks},502)}
    const data:unknown=await upstream.json();
    return response({configured:true,mode:"brave",provider:"Brave Search API",city,country,searchLinks,leads:mapBraveHotelResults(data),disclaimer:"Search results are unverified pages, not confirmed hotel facilities, contacts or commercial terms."});
  }catch(error){console.error("HOTEL_WEB_SEARCH_FAILED",error instanceof Error?error.name:"unknown");return response({error:"Web search did not complete. No changes were made.",searchLinks},503)}
  finally{clearTimeout(timer)}
}
