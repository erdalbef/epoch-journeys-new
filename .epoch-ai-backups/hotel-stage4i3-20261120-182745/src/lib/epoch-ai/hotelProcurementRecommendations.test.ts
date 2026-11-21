import {describe,it,expect} from "vitest";
import {hotelEvidenceSummary,rankHotelResearchCandidates,isOfficialHotelEvidence} from "./hotelProcurementRecommendations";
import type {HotelEvidenceReport} from "./hotelEvidenceResearch";
const report:HotelEvidenceReport={hotelName:"Hilton Prishtina",city:"Pristina",country:"Kosovo",provider:"Brave Search API",searchedAt:"2026-11-20T12:00:00Z",note:"",unconfirmed:["20-room allotment"],findings:[
{topic:"identity",statement:"Indication",sourceUrl:"https://www.hilton.com/en/hotels/hilton-prishtina",sourceTitle:"Hilton",level:"published-indication"},
{topic:"facilities",statement:"Indication",sourceUrl:"https://www.hilton.com/en/hotels/hilton-prishtina",sourceTitle:"Hilton",level:"published-indication"},
{topic:"identity",statement:"Indication",sourceUrl:"https://www.trip.com/hotels/hilton",sourceTitle:"Booking",level:"published-indication"}]};
describe("Stage 4I.1 safe research priorities",()=>{
 it("summarizes per topic and prioritizes official brand domains",()=>{const s=hotelEvidenceSummary(report);expect(s).toHaveLength(2);expect(s[0].findings[0].sourceUrl).toContain("hilton.com");});
 it("does not treat third-party pages as the official hotel",()=>{expect(isOfficialHotelEvidence("Hilton Prishtina",report.findings[2])).toBe(false)});
 it("never recommends registration on search snippets alone",()=>{expect(rankHotelResearchCandidates([{name:"Hilton Prishtina",inCrm:false,report}])[0].status).toBe("investigate")});
 it("requires explicit independent review before recommending INACTIVE registration",()=>{const item=rankHotelResearchCandidates([{name:"Hilton Prishtina",inCrm:false,report,reviewedContact:true,reviewedFacilities:true}])[0];expect(item.status).toBe("recommend-inactive-crm");expect(item.needsHotelConfirmation).toBe(true)});
 it("never duplicates an existing CRM supplier",()=>{const r=rankHotelResearchCandidates([{name:"Hotel A",inCrm:true},{name:"Hotel A",inCrm:false}]);expect(r).toHaveLength(1);expect(r[0].status).toBe("existing-crm")});
 it("caps list to five with no invented quality score",()=>{const list=rankHotelResearchCandidates(Array.from({length:8},(_,i)=>({name:`Hotel ${i}`,inCrm:false})));expect(list).toHaveLength(5);expect(list[0].status).toBe("investigate")});
});
