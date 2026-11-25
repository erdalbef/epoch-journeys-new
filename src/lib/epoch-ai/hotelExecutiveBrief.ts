import {hotelSourceMatch, type HotelEvidenceReport} from "./hotelEvidenceResearch";
import {safePublicUrl, type WebHotelResult} from "./hotelWebResearch";
export type HotelBrief={reasons:string[];rating?:string;ratingOutOfFive?:number;ratingSourceUrl?:string;bbRate?:string;sourceUrls:string[]};
export function meetsHotelGuestRatingMinimum(brief?: HotelBrief): boolean {
  return brief?.ratingOutOfFive === undefined || brief.ratingOutOfFive >= 4;
}

/** Canonicalize common hotel naming variants for deduplication. */
export function stableHotelIdentity(value:string):string{
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\bby sheraton\b/g,"").replace(/\bprishtina\b/g,"pristina")
    .replace(/[^a-z0-9]/g,"");
}
const facts:[RegExp,string][]=[
  [/\brestaurants? (?:within walking distance|nearby)\b|\bnearby (?:cafes?|restaurants?)\b/i,"Nearby restaurants or cafés mentioned"],
  [/\bshopping (?:mall|centre|center|district)\b|\bmall nearby\b/i,"Shopping facilities mentioned nearby"],
  [/\bpharmacy nearby\b|\bnearby pharmac(?:y|ies)\b/i,"Pharmacy mentioned nearby"],
  [/\bcentral location\b|\bcity cent(?:er|re)\b|\bheart of (?:the )?city\b/i,"Central-city location mentioned"],
  [/\bspacious lobby\b|\blarge lobby\b|\blobby seating\b/i,"Spacious lobby or seating advertised"],
  [/\bon.site restaurant\b|\brestaurant\b|\bdining\b/i,"Restaurant or dining facilities advertised"],
  [/\bmeeting rooms?\b|\bconference\b|\bevent spaces?\b/i,"Meeting or event space advertised"],
  [/\bfree parking\b|\bon.site parking\b|\bparking\b/i,"Parking mentioned in published property information"],
  [/\baccessible rooms?\b|\bwheelchair accessible\b|\blift\b|\belevator\b/i,"Accessibility features mentioned; suitable room counts unconfirmed"],
  [/\bbreakfast included\b|\bfree breakfast\b/i,"Breakfast advertised as included (terms need checking)"],
];
/** Extract only explicitly stated guestroom dimensions; do not mistake event-space areas for rooms. */
export function guestRoomSize(text:string):string|undefined{
 const match=text.match(/(?:guest\s*rooms?|standard\s*rooms?|double\s*rooms?|twin\s*rooms?|king\s*rooms?|queen\s*rooms?)\s*(?:are|of|:|–|-|\bat\b|\bfrom\b)?\s*(\d{2,3})\s*(?:m²|sq\.?\s?m|square metres|square meters)(?![a-z])/i)
   ||text.match(/(\d{2,3})\s*(?:m²|sq\.?\s?m|square metres|square meters)\s+(?:guest\s*rooms?|standard\s*rooms?|double\s*rooms?|twin\s*rooms?)/i);
 if(!match)return undefined;
 const value=Number(match[1]);return value>=15&&value<=120?`Guest room size advertised: ${value} m²`:undefined;
}
/** Exact published lobby seating numbers only; never infer capacity from a photograph. */
export function publishedLobbyCapacity(text:string):string|undefined{
 const match=text.match(/\blobby\b.{0,45}?\b(?:seats?|seating for|capacity of|accommodates?)\s*(\d{1,3})\s*(?:people|persons|guests|pilgrims)?/i)
   ||text.match(/\blobby\b.{0,25}?(\d{1,3})\s*(?:seats|seated guests|people seated)/i);
 if(!match)return undefined;
 const number=Number(match[1]);return number>=5&&number<=500?`Published lobby seating: ${number} people`:undefined;
}
/** No rating, review count or price is invented from generic search snippets. */
export function buildHotelBrief(name:string,pages:WebHotelResult[]):HotelBrief{
 const found:string[]=[];const sourceUrls:string[]=[];let rating:string|undefined;let ratingOutOfFive:number|undefined;let ratingSourceUrl:string|undefined;
 const tokens=stableHotelIdentity(name);
 for(const page of pages){
   const sourceUrl = safePublicUrl(page.url);
   if (!sourceUrl) continue;
   const hay=stableHotelIdentity(page.title+" "+page.description);
   const matchesBrief = hay.includes(tokens) || tokens.includes(stableHotelIdentity(page.title).slice(0,14));
   const description=page.description;
   // Scores are accepted only from recognizable review platforms, with an explicit scale.
   // Never guess a score from general text or assume /5 when the scale is absent.
   if (!rating) {
     const url = new URL(sourceUrl);
     const host = url.hostname.toLowerCase();
     const onPlatform = (domain: string) => host === domain || host.endsWith("." + domain);
     const platform = onPlatform("booking.com") && /^\/hotel\//i.test(url.pathname) ? "Booking.com"
       : onPlatform("tripadvisor.com") && /^\/Hotel_Review-/i.test(url.pathname) ? "Tripadvisor"
       : onPlatform("expedia.com") && /Hotel-Information/i.test(url.pathname) ? "Expedia"
       : undefined;
     if (platform && hotelSourceMatch(name, { ...page, description: "" })) {
       const reviewText = description.split(" … ").filter(excerpt =>
         /\b(?:reviews?|ratings?|rated|scored|guest score)\b/i.test(excerpt)
       ).join(" … ");
       const explicit = reviewText.match(/(?:^|[^\d.,/])((?:10|\d)(?:[.,]\d{1,2})?)\s*(?:\/|out of)\s*(5|10)\b(?![.,/]\d)/i);
       if (explicit) {
         const score = Number(explicit[1].replace(",", "."));
         const scale = Number(explicit[2]);
         if (score >= 1 && score <= scale) {
           const count = description.match(/\b([\d,]+)\s+(?:verified\s+)?(?:guest\s+)?(?:reviews?|ratings?)\b/i);
           rating = `${platform}: ${score}/${scale}${count ? ` (${count[1]} reviews)` : ""}`;
           ratingOutOfFive = score / (scale / 5);
           ratingSourceUrl = page.url;
         }
       }
     }
   }
   if (!matchesBrief) continue;
   sourceUrls.push(page.url);
   for(const special of [guestRoomSize(description),publishedLobbyCapacity(description)])if(special&&!found.includes(special))found.push(special);
   for(const [regex,reason] of facts)if(regex.test(description)&&!found.includes(reason))found.push(reason);
 }
 return {reasons:found.slice(0,5),rating,ratingOutOfFive,ratingSourceUrl,sourceUrls:[...new Set(sourceUrls)].slice(0,8)};
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
