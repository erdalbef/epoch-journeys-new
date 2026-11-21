import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { mapGoogleHotelResults, validHotelResearchLocation } from "@/lib/epoch-ai/hotelLiveResearch";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const response=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});

/** Explicit Admin-initiated Google Places search; never writes CRM records or contacts a hotel. */
export async function POST(request:Request){
  const denied=await requireAdminApiAccess();if(denied)return denied;
  const key=process.env.GOOGLE_PLACES_API_KEY?.trim();
  if(!key)return response({error:"Live hotel discovery is not configured. An administrator must configure GOOGLE_PLACES_API_KEY for Places API (New). No search was performed.",configured:false},503);
  if(Number(request.headers.get("content-length")||0)>4096)return response({error:"Search request too large"},413);
  const origin=request.headers.get("origin");
  if(!origin || origin!==new URL(request.url).origin)return response({error:"Same-origin request required"},403);
  let body:unknown;
  try{body=await request.json();}catch{return response({error:"Invalid request"},400)}
  const input=body && typeof body==="object"?body as Record<string,unknown>:{};
  if(!validHotelResearchLocation(input.city,input.country))return response({error:"Valid city and country required"},400);
  const city=(input.city as string).trim();const country=(input.country as string).trim();
  // API key remains on server; minimal field mask limits unnecessary billing and personal data exposure.
  const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),9000);
  try {
    const upstream=await fetch("https://places.googleapis.com/v1/places:searchText",{
      method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,
        "X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.googleMapsUri"},
      body:JSON.stringify({textQuery:`hotels in ${city}, ${country}`,includedType:"lodging",maxResultCount:10,languageCode:"en"}),
      cache:"no-store",signal:ctrl.signal
    });
    if(!upstream.ok){console.error("HOTEL_LIVE_RESEARCH_PROVIDER_FAILED",upstream.status);return response({error:"Hotel search provider unavailable. Check API key, billing, quotas and Places API (New)."},502)}
    const data:unknown=await upstream.json();
    // CRM comparison is performed client-side with its current destination records.
    const leads=mapGoogleHotelResults(data,[]);
    return response({configured:true,provider:"Google Places (New)",city,country,leads,disclaimer:"Discovery results only. Verify hotel star rating, official contacts, capacity, accessibility, coach access, rates and availability independently. No supplier record or email created."});
  }catch(e){console.error("HOTEL_LIVE_RESEARCH_REQUEST_FAILED",e instanceof Error?e.name:"unknown");return response({error:"Live hotel search did not complete. Please try again later; no CRM changes were made."},503)}
  finally{clearTimeout(timeout)}
}
