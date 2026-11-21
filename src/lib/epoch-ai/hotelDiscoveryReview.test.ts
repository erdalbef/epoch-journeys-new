import { describe,expect,it } from "vitest";
import { assessHotelCoverage,reviewHotelCandidates } from "./hotelDiscoveryReview";
import { balkanStays,type HotelContact } from "./hotelProcurement";
const contact:HotelContact={id:"crm-1",name:"Courtyard by Marriott Sarajevo",city:"Sarajevo",country:"Bosnia and Herzegovina",email:"reservations@example.com",preferred:false,contacts:[]};
describe("Stage 4B hotel evidence and coverage",()=>{
 it("includes Pristina and Skopje as distinct overnight destinations",()=>{
  expect(balkanStays.map(s=>s.city)).toContain("Pristina");
  expect(balkanStays.map(s=>s.city)).toContain("Skopje");
 });
 it("detects missing CRM hotels without inventing research leads",()=>{
  const result=assessHotelCoverage({city:"Vienna",checkIn:"2027-05-01",checkOut:"2027-05-02",rooms:20,massRoom:false},[]);
  expect(result).toMatchObject({status:"NO_CRM_HOTELS",leadCount:0});
 });
 it("distinguishes CRM records without email from contactable records",()=>{
  expect(assessHotelCoverage(balkanStays[0],[{...contact,email:null}]).status).toBe("CRM_CONTACTS_MISSING");
  expect(assessHotelCoverage(balkanStays[0],[contact]).status).toBe("CRM_CONTACTS_PRESENT");
 });
 it("does not claim room allotments or hotel rates from public room counts",()=>{
  const candidates=reviewHotelCandidates(balkanStays[0],[]);
  const courtyard=candidates.find(c=>c.name==="Courtyard by Marriott Sarajevo");
  expect(courtyard?.publishedRooms).toBe(132);
  expect(courtyard?.questions.some(q=>q.includes("inventory"))).toBe(true);
  expect(Object.keys(courtyard||{})).not.toContain("rate");
  expect(Object.keys(courtyard||{})).not.toContain("available");
 });
 it("matches and flags existing CRM leads without duplicating them",()=>{
  const candidates=reviewHotelCandidates(balkanStays[0],[contact]);
  const courtyard=candidates.filter(c=>c.name.toLowerCase()==="courtyard by marriott sarajevo");
  expect(courtyard).toHaveLength(1);
  expect(courtyard[0].inCrm).toBe(true);
  expect(courtyard[0].crmIds).toContain("crm-1");
 });
 it("does not pretend other Balkan destinations have verified contacts",()=>{
  const candidates=reviewHotelCandidates(balkanStays.find(s=>s.city==="Pristina")!,[]);
  expect(candidates.length).toBeGreaterThan(0);
  expect(candidates.every(c=>c.contactEvidence===false)).toBe(true);
 });
 it("adds Mass room diligence only to the stay that needs it",()=>{
  expect(reviewHotelCandidates(balkanStays[1],[])[0].questions).toContain("Confirm private meeting room for Mass");
  expect(reviewHotelCandidates(balkanStays[0],[])[0].questions).not.toContain("Confirm private meeting room for Mass");
 });
});
