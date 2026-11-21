import { mapBraveHotelResults, safePublicUrl, type WebHotelResult } from "./hotelWebResearch";

export type EvidenceTopic = "identity"|"classification"|"accessibility"|"facilities"|"contact"|"group";
export type EvidenceFinding={topic:EvidenceTopic; statement:string; sourceUrl:string; sourceTitle:string; level:"published-indication"};
export type HotelEvidenceReport={hotelName:string;city:string;country:string;provider:"Brave Search API";findings:EvidenceFinding[];unconfirmed:string[];searchedAt:string;note:string};

const categories:{topic:EvidenceTopic;re:RegExp;statement:string}[]=[
  {topic:"classification",re:/\b(?:4.star|four.star|5.star|five.star|star.rating|classified)\b/i,statement:"Search excerpt mentions a hotel classification; verify the official rating and applicable standard."},
  {topic:"accessibility",re:/\b(?:accessible rooms?|wheelchair accessible|step.free|roll.in shower|walk.in shower|elevator|lift)\b/i,statement:"Search excerpt mentions accessibility facilities; room-type quantities and suitability remain unconfirmed."},
  {topic:"facilities",re:/\b(?:meeting rooms?|conference|restaurant|breakfast|banquet|dining|parking|fitness)\b/i,statement:"Search excerpt mentions facilities; group access and terms remain unconfirmed."},
  {topic:"contact",re:/\b(?:contact us|reservations|sales team|telephone|phone|email)\b/i,statement:"Search excerpt suggests published contact information; independently verify the actual recipient on the official website."},
  {topic:"group",re:/\b(?:group bookings?|group accommodation|event spaces?|conference rooms?)\b/i,statement:"Search excerpt suggests group services; no availability or contractual terms are confirmed."},
];
const fold=(s:string)=>s.toLocaleLowerCase("en").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const generic=new Set(["hotel","hotels","the","resort","inn","city","centre","center","prishtina","pristina","skopje","sarajevo","tirana","ohrid","belgrade"]);
export function hotelSourceMatch(name:string,page:WebHotelResult):boolean {
  const keys=fold(name).split(" ").filter(s=>s.length>=3&&!generic.has(s));
  if(!keys.length)return false;
  const hay=fold(page.title+" "+page.description+" "+new URL(page.url).pathname.replace(/[-_/]/g," "));
  return keys.every(word=>hay.split(" ").some(part=>part===word));
}
export function compileHotelEvidence(hotelName:string,city:string,country:string,pages:WebHotelResult[],when:string):HotelEvidenceReport {
  const findings:EvidenceFinding[]=[];const seen=new Set<string>();
  for(const page of pages.slice(0,24)) {
    const sourceUrl=safePublicUrl(page.url);if(!sourceUrl||!hotelSourceMatch(hotelName,page))continue;
    const excerpt=page.description;
    const identityKey=`identity:${new URL(sourceUrl).hostname}`;
    if(!seen.has(identityKey)){
      seen.add(identityKey);findings.push({topic:"identity",statement:"A public search result appears to reference the named property. Hotel identity and webpage availability need independent confirmation.",sourceUrl,sourceTitle:page.title,level:"published-indication"});
    }
    for(const item of categories){const key=`${item.topic}:${sourceUrl}`;
      if(!seen.has(key)&&item.re.test(excerpt)){seen.add(key);findings.push({topic:item.topic,statement:item.statement,sourceUrl,sourceTitle:page.title,level:"published-indication"});}
    }
  }
  return {hotelName,city,country,provider:"Brave Search API",findings:findings.slice(0,18),searchedAt:when,
    unconfirmed:["The hotel's current identity, address, website availability and official star classification", "20-room allotment for the exact dates, room types and rates", "Number of walk-in showers, lift/step-free access and accessible rooms", "Full-size coach drop-off and parking arrangements", "Porterage availability and cost", "Group dinner menus, beverages, timing and charges", "Private Mass meeting room, if requested", "Current reservations/sales email and contractual terms"],
    note:"Search excerpts are discovery hints, not independently verified hotel facts. Follow the sources, confirm the property and request written supplier evidence before recording any confirmed group services."};
}
export function validHotelEvidenceRequest(value:unknown):value is {hotelName:string;city:string;country:string}{
  if(!value||typeof value!=="object")return false;
  const v=value as Record<string,unknown>;
  return [v.hotelName,v.city,v.country].every(s=>typeof s==="string"&&s.trim().length>=2&&s.length<=100&&!/[<>\r\n]/.test(s));
}
export {mapBraveHotelResults};
