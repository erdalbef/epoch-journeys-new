import type {HotelEvidenceReport, EvidenceFinding, EvidenceTopic} from "./hotelEvidenceResearch";

/** Provisional research order, NEVER a quality rank or a hotel-approval decision. */
export type CandidateStatus="existing-crm"|"recommend-inactive-crm"|"investigate";
export type HotelResearchCandidate={name:string;inCrm:boolean;report?:HotelEvidenceReport;reviewedContact?:boolean;reviewedFacilities?:boolean};
export type HotelResearchRecommendation={name:string;status:CandidateStatus;why:string;advantages:string;risks:string;topics:EvidenceTopic[];officialSources:number;needsHotelConfirmation:boolean;report?:HotelEvidenceReport};
const norm=(s:string)=>s.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const brandDomains:[RegExp,RegExp][]=[[/\bhilton\b/i,/(^|\.)hilton\.com$/i],[/\bmarriott\b|\bcourtyard\b/i,/(^|\.)marriott\.com$/i],[/\bmercure\b/i,/(^|\.)accor\.com$/i],[/\bholiday inn\b/i,/(^|\.)ihg\.com$/i]];
export function isOfficialHotelEvidence(name:string, finding:EvidenceFinding):boolean{
  try { const host=new URL(finding.sourceUrl).hostname.toLowerCase();
    return brandDomains.some(([nameMatch,hostMatch])=>nameMatch.test(name)&&hostMatch.test(host));
  } catch{return false;}
}
export function hotelEvidenceSummary(report:HotelEvidenceReport){
  const byTopic=new Map<EvidenceTopic,EvidenceFinding[]>();
  for(const finding of report.findings){const current=byTopic.get(finding.topic)||[];if(current.length<3&&!current.some(x=>x.sourceUrl===finding.sourceUrl))current.push(finding);byTopic.set(finding.topic,current);}
  return [...byTopic.entries()].map(([topic,findings])=>({topic,findings:findings.sort((a,b)=>Number(isOfficialHotelEvidence(report.hotelName,b))-Number(isOfficialHotelEvidence(report.hotelName,a)))}));
}
export function rankHotelResearchCandidates(candidates:HotelResearchCandidate[],limit=5):HotelResearchRecommendation[]{
  const seen=new Set<string>();
  return candidates.filter(c=>{const key=norm(c.name);if(!key||seen.has(key))return false;seen.add(key);return true;}).map(c=>{
    const topics=[...new Set(c.report?.findings.map(f=>f.topic)||[])];
    const officialSources=new Set((c.report?.findings||[]).filter(f=>isOfficialHotelEvidence(c.name,f)).map(f=>f.sourceUrl)).size;
    const hasIdentity=topics.includes("identity")&&officialSources>0;
    const hasFacilities=topics.includes("facilities")&&officialSources>0;
    // Publication is evidence of a lead, not clearance for a commercial booking.
    const status:CandidateStatus=c.inCrm?"existing-crm":hasIdentity&&hasFacilities&&Boolean(c.reviewedContact)&&Boolean(c.reviewedFacilities)?"recommend-inactive-crm":"investigate";
    const why=c.inCrm?"Already recorded in Supplier CRM; review its existing profile, do not register a duplicate.":status==="recommend-inactive-crm"?"Official-source indications and independently reviewed contact/facilities support inactive research registration; group services remain unconfirmed.":!c.report?"No individual research report yet. Research the property before making a CRM decision.":officialSources===0?"Only third-party or unestablished sources found. Verify the hotel's official identity and contact.":"Official-source indications found; contact, facilities, or operational suitability still need independent review.";
    const sourceTopics=new Set((c.report?.findings||[]).filter(f=>isOfficialHotelEvidence(c.name,f)).map(f=>f.topic));
    const advantages=c.inCrm?"Existing supplier profile available for review; no duplicate registration needed.":sourceTopics.has("facilities")?"Official-brand pages mention hotel facilities; compare these with group needs.":officialSources?"Official-brand property references found; facilities need closer review.":c.report?"Public references found, but official property details remain unestablished.":"Hotel-specific research has not yet been completed.";
    const risks="Rates, 20-room allotment, walk-in showers, coach access and group terms are not confirmed.";
    return {name:c.name,status,why,advantages,risks,topics,officialSources,needsHotelConfirmation:true,report:c.report};
  }).sort((a,b)=>{
    const bucket=(x:HotelResearchRecommendation)=>x.status==="recommend-inactive-crm"?3:x.status==="existing-crm"?2:x.officialSources?1:0;
    return bucket(b)-bucket(a)||b.officialSources-a.officialSources||b.topics.length-a.topics.length||a.name.localeCompare(b.name);
  }).slice(0,Math.max(0,Math.min(5,limit)));
}
