import type {HotelEvidenceReport} from "./hotelEvidenceResearch";
import type {WebHotelResult} from "./hotelWebResearch";
export type HotelBrief={reasons:string[];rating?:string;bbRate?:string;sourceUrls:string[]};
/** Canonicalize common hotel naming variants for deduplication. */
export function stableHotelIdentity(value:string):string{
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\bby sheraton\b/g,"").replace(/\bprishtina\b/g,"pristina")
    .replace(/[^a-z0-9]/g,"");
}
const facts:[RegExp,string][]=[
  [/\bon.site restaurant\b|\brestaurant\b|\bdining\b/i,"Restaurant or dining facilities advertised"],
  [/\bmeeting rooms?\b|\bconference\b|\bevent spaces?\b/i,"Meeting or event space advertised"],
  [/\bfree parking\b|\bon.site parking\b|\bparking\b/i,"Parking mentioned in published property information"],
  [/\baccessible rooms?\b|\bwheelchair accessible\b|\blift\b|\belevator\b/i,"Accessibility features mentioned; suitable room counts unconfirmed"],
  [/\bnearby restaurants?\b|\brestaurants? nearby\b|\brestaurants? within walking distance\b/i,"Restaurants nearby, according to public listing"],
  [/\bshopping (?:mall|centre|center|district)\b|\bmall nearby\b/i,"Shopping facilities mentioned nearby"],
  [/\bpharmacy nearby\b|\bnearby pharmac(?:y|ies)\b/i,"Pharmacy mentioned nearby"],
  [/\bcentral location\b|\bcity cent(?:er|re)\b|\bheart of (?:the )?city\b/i,"Central-city location mentioned"],
  [/\bbreakfast included\b|\bfree breakfast\b/i,"Breakfast advertised as included (terms need checking)"],
];
export function buildHotelBrief(name:string,pages:WebHotelResult[]):HotelBrief{
 const found:string[]=[];const sourceUrls:string[]=[];
 // Evidence is only considered if the search page mentions the property name.
 const tokens=stableHotelIdentity(name);
 for(const page of pages){
   if(!page.url.startsWith("https://"))continue;
   const hay=stableHotelIdentity(page.title+" "+page.description);
   if(!hay.includes(tokens)&&!tokens.includes(stableHotelIdentity(page.title).slice(0,14)))continue;
   sourceUrls.push(page.url);
   for(const [regex,reason] of facts)if(regex.test(page.description)&&!found.includes(reason))found.push(reason);
 }
 return {reasons:found.slice(0,5),sourceUrls:[...new Set(sourceUrls)].slice(0,8)};
}
export function summarizeHotelEvidence(name:string,report?:HotelEvidenceReport):string[]{
 if(!report)return ["Published suitability details not yet established"];
 const topics=new Set(report.findings.map(f=>f.topic));
 const result:string[]=[];
 if(topics.has("facilities"))result.push("Hotel facilities referenced in public sources");
 if(topics.has("accessibility"))result.push("Accessibility mentioned; appropriate room types unconfirmed");
 if(topics.has("group"))result.push("Meeting or group facilities referenced");
 if(!result.length)result.push("Insufficient published evidence for a hotel comparison");
 return result.slice(0,5);
}
