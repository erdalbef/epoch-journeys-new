import {describe,it,expect} from "vitest";
import {buildSuitabilityReview} from "./hotelSuitabilityReview";
describe("Stage 4H conservative suitability gap review",()=>{
 it("keeps every unknown field open and asks for group confirmation",()=>{const r=buildSuitabilityReview({roomsRequested:20,massRoomRequired:true,totalRooms:null,marked:{},hasPublicFacilitiesSource:false});expect(r.totalCount).toBe(7);expect(r.openCount).toBe(7);expect(r.questions.join(" ")).toContain("20 rooms");expect(r.questions.join(" ")).toContain("priest");});
 it("keeps one-night group allotment separate from published total room capacity",()=>{const r=buildSuitabilityReview({roomsRequested:20,massRoomRequired:false,totalRooms:120,marked:{},hasPublicFacilitiesSource:true});expect(r.questions.join(" ")).toContain("not availability");expect(r.items.find(x=>x.id==="20 rooms / allotment confirmed")?.marked).toBe(false);});
 it("does not ask for Mass space when not needed",()=>{const r=buildSuitabilityReview({roomsRequested:12,massRoomRequired:false,marked:{},hasPublicFacilitiesSource:true});expect(r.totalCount).toBe(6);expect(r.questions.join(" ")).not.toContain("priest");});
 it("recognizes marked review items but never represents a written confirmation",()=>{const r=buildSuitabilityReview({roomsRequested:20,massRoomRequired:false,marked:{"Porterage confirmed":true},hasPublicFacilitiesSource:true});expect(r.items.find(x=>x.id==="Porterage confirmed")?.marked).toBe(true);expect(r.openCount).toBe(5);});
});
