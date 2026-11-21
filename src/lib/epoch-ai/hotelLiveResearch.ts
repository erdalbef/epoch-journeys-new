/** Live search is discovery evidence only. Never infer group rooms, hotel stars, rates or current contacts. */
export type LiveHotelLead={placeId:string;name:string;address:string;mapsUrl:string;potentialCrmDuplicate:boolean};
export type GoogleTextSearchPlace={id?:unknown;displayName?:{text?:unknown};formattedAddress?:unknown;googleMapsUri?:unknown};
const safeName=(v:unknown)=>typeof v==="string"?v.trim().slice(0,180):"";
export function validHotelResearchLocation(city:unknown,country:unknown):city is string {
  return typeof city==="string" && typeof country==="string" &&
    city.trim().length>=2 && city.trim().length<=90 &&
    country.trim().length>=2 && country.trim().length<=90 &&
    !/[<>\r\n]/.test(city+country);
}
export function mapGoogleHotelResults(data:unknown,crmNames:string[]):LiveHotelLead[]{
  if(!data || typeof data!=="object")return [];
  const places=(data as {places?:unknown}).places;
  if(!Array.isArray(places))return [];
  const normalize=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
  const known=new Set(crmNames.map(normalize));
  const seen=new Set<string>();
  const output:LiveHotelLead[]=[];
  for(const candidate of places.slice(0,12)) {
    if(!candidate || typeof candidate!=="object")continue;
    const p=candidate as GoogleTextSearchPlace;
    const id=safeName(p.id);const name=safeName(p.displayName?.text);
    if(!id || !name || seen.has(id))continue;
    const url=safeName(p.googleMapsUri);
    // Only unmodified provider links on trusted Google Maps hosts may be shown.
    let mapsUrl="";
    try {const u=new URL(url);if(u.protocol==="https:" && (u.hostname==="google.com"||u.hostname==="www.google.com"||u.hostname==="maps.google.com"))mapsUrl=url;}catch{}
    seen.add(id);
    output.push({placeId:id,name,address:safeName(p.formattedAddress),mapsUrl,potentialCrmDuplicate:known.has(normalize(name))});
  }
  return output;
}
