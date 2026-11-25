/** Public-source discovery is advisory only, not evidence of confirmed hotel terms. */
export type WebHotelResult = { title:string; url:string; description:string };
export type SearchLink = {label:string;url:string};
/** Display only plain-text excerpts: Brave sometimes returns HTML-highlighted snippets. */
const clean = (value:unknown,max=250):string => {
  if (typeof value!=="string") return "";
  return value.replace(/<[^>]*>/g," ")
    .replace(/&#(x[0-9a-f]+|\d+);/gi,(_match,number:string)=>{
      const code=number[0].toLowerCase()==="x"?parseInt(number.slice(1),16):parseInt(number,10);
      return code>=32&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):" ";
    })
    .replace(/&(amp|quot|apos|lt|gt|nbsp|#39);/gi,(_match,entity:string)=>({amp:"&",quot:'"',apos:"'",lt:" ",gt:" ",nbsp:" ","#39":"'"}[entity.toLowerCase()]||" "))
    .replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").replace(/\s+([.,!?;:])/g,"$1").trim().slice(0,max);
};
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
    seen.add(url);output.push({title,url,description:[clean(result.description,500),...(Array.isArray(result.extra_snippets)?result.extra_snippets.slice(0,3).map(snippet=>clean(snippet,500)):[])].filter(Boolean).join(" … ")});
  }
  return output;
}

/** Named leads extracted from public search snippets, NEVER independent verification. */
export type DiscoveredHotelLead = { name:string; sourceUrl:string; snippet:string; sourceHost:string; sourceType:"possible-official-site"|"independent-mention"; identityStatus:"brand-consistent"|"identity-review"; identityNote:string };
const excludedHosts=new Set(["booking.com","www.booking.com","tripadvisor.com","www.tripadvisor.com","expedia.com","www.expedia.com","hotels.com","www.hotels.com","agoda.com","www.agoda.com","google.com","www.google.com","trivago.com","www.trivago.com","kayak.com","www.kayak.com"]);
const genericTitle=/^(best|top|cheap|luxury|find|compare|book|hotels? (?:in|by|near) |accommodations? in |where to stay|the \d+ best|\d+ best|\d+ hotels?|\d\s*[- ]?\s*star\b|hotel (?:and|&) conference(?: cent(?:er|re))?$)/i;
/** A domain is a brand clue, not proof of property identity or page availability. */
const brandDomains:[RegExp,RegExp,string][]=[
  [/(^|\.)hilton\.com$/i,/\b(hilton|doubletree|hampton|homewood|home2|curio|tapestry|waldorf|conrad)\b/i,"Hilton"],
  [/(^|\.)ihg\.com$/i,/\b(holiday inn|crowne plaza|intercontinental|voco|indigo|staybridge|candlewood|avid|kimpton|regent|six senses)\b/i,"IHG"],
  [/(^|\.)marriott\.com$/i,/\b(marriott|courtyard|sheraton|westin|ritz.carlton|le meridien|four points|aloft|ac hotels|moxy)\b/i,"Marriott"],
  [/(^|\.)accor\.com$/i,/\b(mercure|ibis|novotel|sofitel|pullman|fairmont|swissotel|movenpick|adagio)\b/i,"Accor"]
];
function assessIdentity(name:string,host:string):{identityStatus:DiscoveredHotelLead["identityStatus"];identityNote:string}{
  const brand=brandDomains.find(([domain])=>domain.test(host));
  if(brand && !brand[1].test(name))return {identityStatus:"identity-review",identityNote:`Name in search title does not identify a ${brand[2]} hotel brand; check the official property page and URL before considering this hotel.`};
  return {identityStatus:"brand-consistent",identityNote:"Name is consistent with the source domain, but hotel identity and URL availability are not independently verified."};
}

function comparableHotelName(value:string):string {
  return clean(value,180).toLocaleLowerCase("en").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\b(prishtina|pristina|kosovo|skopje|sarajevo|tirana|ohrid|belgrade|kotor|north macedonia)\b/g,"")
    .replace(/\b(hotel|hotels|resort|resorts|and|the|official|website|site|in)\b/g,"")
    .replace(/\bcentres?\b/g, word => word === "centres" ? "centers" : "center")
    .replace(/[^a-z0-9]/g,"");
}
export function candidateNameFromSearchTitle(title:string):string {
  const parts=clean(title,220).split(/\s+[|–—•·]\s+|\s+-\s+/).map(part=>part.trim());
  const [first] = parts;
  // Chains can put a location or rating headline before the property name.
  const raw = genericTitle.test(first)
    ? parts.slice(1).find(part => /\b(?:h[oô]tel|inn|suites?|resort)\b/i.test(part) &&
        part.split(/\s+/).length > 1 && !genericTitle.test(part)) ?? ""
    : first;
  // Web titles can be "Official site Swiss Diamond Hotel Prishtina in Kosovo".
  // Canonicalize before assessing hotel identity and comparing known leads.
  const name=raw
    .replace(/^(?:(?:the )?official (?:web)?site(?: of)?|(?:the )?official website(?: of)?|welcome to(?: the)?)\s+/i,"")
    .replace(/\s+(?:official website|official site|book direct|booking|reservations)\s*$/i,"")
    .replace(/\s+in\s+(?:kosovo|north macedonia|serbia|albania|montenegro|bosnia(?: and herzegovina)?)\s*$/i,"")
    .replace(/,\s*(?:albania|kosovo|north macedonia|serbia|montenegro|bosnia(?: and herzegovina)?)\s*$/i,"")
    .trim();
  if(name.length<5 || name.length>95 || genericTitle.test(name) || !/[a-zA-Z]/.test(name))return "";
  if(/\b(?:reviews?|prices?|deals|photos|compare|best|top \d+|travel guide|restaurants|tripadvisor|booking\.com)\b/i.test(name))return "";
  if(/\b(?:event spaces?|hotel conference rooms?|meeting room rentals?)\b/i.test(name))return "";
  if(!/\b(h[oô]tel|inn|suites?|resort|marriott|hilton|mercure|hyatt|holiday inn|radisson|ibis|movenpick|swissotel|ramada|courtyard|doubletree|novotel|sheraton|four points|intercontinental|grand|plaza|boutique|spa)\b/i.test(name))return "";
  return name;
}
/** Dedupes candidates against CRM and curated leads. No ratings/contact facts are inferred. */
export function extractDistinctHotelCandidates(results:WebHotelResult[], knownNames:string[]):DiscoveredHotelLead[] {
  const known=knownNames.map(comparableHotelName).filter(Boolean);
  const found = new Map<string, DiscoveredHotelLead>();
  for(const page of results){
    const url=safePublicUrl(page.url);if(!url)continue;
    const host=new URL(url).hostname.toLowerCase();
    if(excludedHosts.has(host)||[...excludedHosts].some(h=>host.endsWith("."+h)))continue;
    const name=candidateNameFromSearchTitle(page.title);
    if(!name)continue;
    const normalized=comparableHotelName(name);
    if (!normalized || known.includes(normalized)) continue;
    const identity = assessIdentity(name, host);
    const prior = found.get(normalized);
    if (prior && prior.identityStatus === "brand-consistent" &&
        (identity.identityStatus === "identity-review" || /[a-z]/.test(prior.name) || !/[a-z]/.test(name))) {
      continue;
    }

    found.set(normalized, {
      name, sourceUrl: url, snippet: page.description, sourceHost: host, ...identity,
      sourceType: /(?:hotel|resort|suites|inn|marriott|hilton|hyatt|accor)/i.test(host)
        ? "possible-official-site" : "independent-mention"
    });
  }
  return [...found.values()].slice(0, 20);
}
