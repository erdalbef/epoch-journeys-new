/** Public-source discovery is advisory only, not evidence of confirmed hotel terms. */
export type WebHotelResult = { title:string; url:string; description:string };
export type SearchLink = {label:string;url:string};
const clean = (value:unknown,max=250):string => typeof value==="string"?value.replace(/[\r\n\t]+/g," ").trim().slice(0,max):"";
export function validHotelResearchLocation(city:unknown,country:unknown):boolean {
  return typeof city==="string" && typeof country==="string" &&
    city.trim().length>=2 && city.trim().length<=90 && country.trim().length>=2 && country.trim().length<=90 &&
    !/[<>\r\n]/.test(city+country);
}
export function safePublicUrl(value:unknown):string {
  try { const url=new URL(String(value));
    if(url.protocol!=="https:" || url.username || url.password || url.port ||
      /^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i.test(url.hostname) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || !url.hostname.includes("."))return "";
    return url.href;
  } catch{return "";}
}
export function webHotelSearchLinks(city:string,country:string):SearchLink[] {
  const location=`${city}, ${country}`;
  const queries=[
    {label:"Find 4-star group hotels",query:`4 star hotels ${location} group accommodation`},
    {label:"Find official hotel websites and contacts",query:`hotels ${location} official website reservations contact`},
    {label:"Check accessibility and coach parking",query:`hotels ${location} wheelchair accessible coach parking`}
  ];
  return queries.map(({label,query})=>({label,url:`https://www.google.com/search?q=${encodeURIComponent(query)}`}));
}
export function mapBraveHotelResults(payload:unknown):WebHotelResult[] {
  if(!payload || typeof payload!=="object")return [];
  const web=(payload as {web?:{results?:unknown}}).web;
  if(!Array.isArray(web?.results))return [];
  const output:WebHotelResult[]=[];const seen=new Set<string>();
  for(const item of web.results.slice(0,12)){
    if(!item || typeof item!=="object")continue;
    const result=item as Record<string,unknown>;
    const url=safePublicUrl(result.url),title=clean(result.title,180);
    if(!url || !title || seen.has(url))continue;
    seen.add(url);output.push({title,url,description:clean(result.description,500)});
  }
  return output;
}

/** Named leads extracted from public search snippets, NEVER independent verification. */
export type DiscoveredHotelLead = { name:string; sourceUrl:string; snippet:string; sourceHost:string; sourceType:"possible-official-site"|"independent-mention" };
const excludedHosts=new Set(["booking.com","www.booking.com","tripadvisor.com","www.tripadvisor.com","expedia.com","www.expedia.com","hotels.com","www.hotels.com","agoda.com","www.agoda.com","google.com","www.google.com","trivago.com","www.trivago.com","kayak.com","www.kayak.com"]);
const genericTitle=/^(best|top|cheap|luxury|find|compare|book|hotels? in |accommodations? in |where to stay|the \d+ best|\d+ best|\d+ hotels?)/i;
function comparableHotelName(value:string):string {
  return value.toLocaleLowerCase("en").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\b(prishtina|pristina|kosovo|skopje|sarajevo|tirana|ohrid|belgrade|kotor|north macedonia)\b/g,"")
    .replace(/\b(hotel|hotels|resort|resorts|and|the|official|website)\b/g,"")
    .replace(/[^a-z0-9]/g,"");
}
export function candidateNameFromSearchTitle(title:string):string {
  const raw=title.split(/\s+[|–—]\s+|\s+-\s+/)[0].replace(/&amp;/gi,"&").trim();
  const name=raw.replace(/\s+(?:official website|official site|book direct|booking|reservations)\s*$/i,"").trim();
  if(name.length<5 || name.length>95 || genericTitle.test(name) || !/[a-zA-Z]/.test(name))return "";
  if(/\b(?:reviews?|prices?|deals|photos|compare|best|top \d+|travel guide|restaurants|tripadvisor|booking\.com)\b/i.test(name))return "";
  if(!/\b(hotel|inn|suites?|resort|marriott|hilton|mercure|hyatt|holiday inn|radisson|ibis|movenpick|swissotel|ramada|courtyard|doubletree|novotel|sheraton|intercontinental|grand|plaza|boutique|spa)\b/i.test(name))return "";
  return name;
}
/** Dedupes candidates against CRM and curated leads. No ratings/contact facts are inferred. */
export function extractDistinctHotelCandidates(results:WebHotelResult[], knownNames:string[]):DiscoveredHotelLead[] {
  const known=knownNames.map(comparableHotelName).filter(Boolean);
  const seen=new Set<string>();const found:DiscoveredHotelLead[]=[];
  for(const page of results){
    const url=safePublicUrl(page.url);if(!url)continue;
    const host=new URL(url).hostname.toLowerCase();
    if(excludedHosts.has(host)||[...excludedHosts].some(h=>host.endsWith("."+h)))continue;
    const name=candidateNameFromSearchTitle(page.title);
    if(!name)continue;
    const normalized=comparableHotelName(name);
    if(!normalized || seen.has(normalized) || known.some(n=>n===normalized))continue;
    seen.add(normalized);
    found.push({name,sourceUrl:url,snippet:page.description,sourceHost:host,
      sourceType:/(?:hotel|resort|suites|inn|marriott|hilton|hyatt|accor)/i.test(host)?"possible-official-site":"independent-mention"});
  }
  return found.slice(0,20);
}
