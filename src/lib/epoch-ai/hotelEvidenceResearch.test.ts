import {describe,it,expect} from "vitest";
import {compileHotelEvidence,hotelSourceMatch,validHotelEvidenceRequest} from "./hotelEvidenceResearch";
import type {WebHotelResult} from "./hotelWebResearch";
const page:WebHotelResult={title:"Hilton Prishtina | Hotel overview",url:"https://www.hilton.com/en/hotels/a/",description:"Hilton Prishtina offers accessible rooms, restaurant and meeting rooms."};
describe("Stage 4I read-only suitability research",()=>{
  it("requires a named property and destination",()=>{expect(validHotelEvidenceRequest({hotelName:"Hilton Prishtina",city:"Pristina",country:"Kosovo"})).toBe(true);expect(validHotelEvidenceRequest({hotelName:"<x>",city:"Pristina",country:"Kosovo"})).toBe(false)});
  it("matches the property and rejects unrelated hotels",()=>{expect(hotelSourceMatch("Hilton Prishtina",page)).toBe(true);expect(hotelSourceMatch("Swiss Diamond",page)).toBe(false)});
  it("labels claims as indications and never confirms allotment",()=>{const out=compileHotelEvidence("Hilton Prishtina","Pristina","Kosovo",[page],"2026-11-20T00:00:00Z");expect(out.findings.some(f=>f.topic==="accessibility")).toBe(true);expect(out.findings.every(f=>f.level==="published-indication")).toBe(true);expect(out.unconfirmed.some(x=>x.includes("20-room"))).toBe(true)});
  it("does not derive evidence from an unrelated result",()=>{const out=compileHotelEvidence("Swiss Diamond","Pristina","Kosovo",[page],"2026-11-20T00:00:00Z");expect(out.findings).toEqual([])});
  it("rejects untrusted result URLs",()=>{const out=compileHotelEvidence("Hilton Prishtina","Pristina","Kosovo",[{...page,url:"http://localhost/admin"}],"2026-11-20T00:00:00Z");expect(out.findings).toEqual([])});
});
