/** Read-only procurement triage. Evidence is not availability, rate or approval. */
import { leadsForCity, compareLeadToCrm } from "./hotelDiscoveryLeads";
import { leadEvidence, screenGroupCapacity } from "./hotelLeadScreening";
import { publishedHotelVerification } from "./hotelPublicVerification";
import { matchingHotels, contactEmail, type HotelContact, type Stay } from "./hotelProcurement";

export type ResearchPriority = "CONTACT_VERIFICATION" | "CAPACITY_REVIEW" | "FACILITIES_AND_RATE_REVIEW" | "CRM_READY_FOR_INQUIRY";
export type CandidateReview = {
  name:string; inCrm:boolean; crmIds:string[]; researchOnly:boolean;
  contactEvidence:boolean; capacityStatus:"unknown"|"screening-pass"|"capacity-caution";
  publishedRooms:number|null; sourceLinks:string[]; priority:ResearchPriority; questions:string[];
};
export type StayCoverage = {
  city:string; crmCount:number; contactableCrmCount:number; leadCount:number;
  status:"NO_CRM_HOTELS"|"CRM_CONTACTS_MISSING"|"CRM_CONTACTS_PRESENT";
};
export function assessHotelCoverage(stay:Stay, hotels:HotelContact[]):StayCoverage {
  const matching=matchingHotels(stay.city,hotels);
  const contactable=matching.filter(h=>Boolean(contactEmail(h).trim()));
  return {
    city:stay.city, crmCount:matching.length, contactableCrmCount:contactable.length,
    leadCount:leadsForCity(stay.city).length,
    status:matching.length===0?"NO_CRM_HOTELS":contactable.length===0?"CRM_CONTACTS_MISSING":"CRM_CONTACTS_PRESENT"
  };
}
export function reviewHotelCandidates(stay:Stay,hotels:HotelContact[]):CandidateReview[] {
  const byName=new Map<string, {name:string;researchOnly:boolean}>();
  for(const lead of leadsForCity(stay.city)) byName.set(lead.name.toLowerCase(),{name:lead.name,researchOnly:true});
  for(const hotel of matchingHotels(stay.city,hotels)) {
    const key=hotel.name.toLowerCase();
    byName.set(key,{name:hotel.name,researchOnly:false});
  }
  return [...byName.values()].map(item=>{
    const crmMatches=hotels.filter(h=>compareLeadToCrm(item.name,[h.name]));
    const published=leadEvidence(item.name);
    const contact=publishedHotelVerification(item.name);
    const cap=screenGroupCapacity(stay.rooms,published?.totalRooms);
    const questions:string[]=[];
    if(!contact)questions.push("Verify current reservations/sales email and official contact source");
    if(cap.status==="unknown")questions.push("Verify property room count and group-size suitability");
    if(cap.status==="capacity-caution")questions.push("Check whether requested group allotment is feasible");
    questions.push("Confirm requested Double/Twin and Single inventory, BB/HB rates and cancellation terms");
    questions.push("Confirm walk-in showers, lifts, coach access, porterage and group dining");
    if(stay.massRoom)questions.push("Confirm private meeting room for Mass");
    const priority:ResearchPriority=!contact?"CONTACT_VERIFICATION":cap.status==="capacity-caution"?"CAPACITY_REVIEW":crmMatches.length && crmMatches.some(h=>Boolean(contactEmail(h).trim()))?"CRM_READY_FOR_INQUIRY":"FACILITIES_AND_RATE_REVIEW";
    return {
      name:item.name,inCrm:crmMatches.length>0,crmIds:crmMatches.map(h=>h.id),researchOnly:!crmMatches.length,
      contactEvidence:!!contact,publishedRooms:published?.totalRooms??null,capacityStatus:cap.status,
      sourceLinks:[...new Set([contact?.source,contact?.facilitiesSource,published?.source].filter((v):v is string=>!!v))],
      priority,questions
    };
  }).sort((a,b)=>Number(b.inCrm)-Number(a.inCrm)||Number(b.contactEvidence)-Number(a.contactEvidence)||a.name.localeCompare(b.name));
}
