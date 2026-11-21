import {describe,expect,it} from "vitest";
import {evaluateHotelSendReadiness,type InquirySnapshot} from "./hotelSendReadiness";
const approved:InquirySnapshot={id:"test1",status:"APPROVED",recipient:"sales@example.com",subject:"Group Accommodation Request – 7–8 May 2027 | Epoch Journeys",body:"Dear Reservations Team,\nDestination: Sarajevo\nCheck-in: 7 May 2027\nCheck-out: 8 May 2027\nRooms requested: 20 rooms\nPlease provide breakfast and half-board rates.\nThank you for your assistance.\nKind regards,\nErdal Vardarli, Epoch Journeys\nPhone: +90 555 985 4924\nEmail: erdal@epochjourneys.com\nWebsite: www.epochjourneys.com",destination:"Sarajevo",checkIn:"2027-05-07",checkOut:"2027-05-08",rooms:20,approvedAt:new Date(),approvedBy:"admin@example.com"};
describe("hotel supplier send readiness (no delivery)",()=>{
 it("passes a complete approved inquiry without enabling email",()=>{const x=evaluateHotelSendReadiness(approved);expect(x.ready).toBe(true);expect(x.sendEnabled).toBe(false)});
 it("blocks old numeric-date approved inquiry",()=>{const x=evaluateHotelSendReadiness({...approved,subject:"Group Accommodation Request – 07/05/2027–08/05/2027"});expect(x.ready).toBe(false);expect(x.blocks.join(" ")).toMatch(/Ambiguous/)});
 it("blocks signature placeholders",()=>{const x=evaluateHotelSendReadiness({...approved,body:approved.body+"\n[Insert approved official Epoch Journeys email signature before sending]"});expect(x.ready).toBe(false)});
 it("points to exact placeholder",()=>{const x=evaluateHotelSendReadiness({...approved,body:approved.body+"\n[Insert official signature]"});expect(x.blocks.join(" ")).toContain("[Insert official signature]")});
 it("checks saved stay against date in body",()=>{const x=evaluateHotelSendReadiness({...approved,checkIn:"2025-05-07"});expect(x.ready).toBe(false);expect(x.blocks.join(" ")).toMatch(/Check-in 2025-05-07/) });
 it("blocks unapproved inquiry",()=>{const x=evaluateHotelSendReadiness({...approved,status:"DRAFT"});expect(x.ready).toBe(false)});
 it("blocks missing breakfast and half-board",()=>{const x=evaluateHotelSendReadiness({...approved,body:"Destination: Sarajevo\nRooms requested: 20\n"+"x".repeat(200)});expect(x.ready).toBe(false)});
});
