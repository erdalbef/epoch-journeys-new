import {describe,it,expect} from "vitest";
import {reviewHotelInquiryContent,splitHotelInquiryHistory} from "./hotelInquiryApprovalGate";
import {inquiry} from "./hotelProcurement";
const stay={city:"Sarajevo",checkIn:"2027-05-07",checkOut:"2027-05-08",rooms:20,massRoom:false};
const template=inquiry(stay,"Courtyard by Marriott Sarajevo");
const valid={recipient:"sales@example.com",subject:template.subject,body:template.body,destination:stay.city,checkIn:stay.checkIn,checkOut:stay.checkOut,rooms:stay.rooms};
describe("Hotel inquiry save and approval content gate",()=>{
 it("accepts correctly formatted new master inquiry",()=>expect(reviewHotelInquiryContent(valid).valid).toBe(true));
 it("rejects ambiguous numeric subject",()=>expect(reviewHotelInquiryContent({...valid,subject:"Group – 07/05/2027"}).valid).toBe(false));
 it("rejects unsigned placeholder body",()=>expect(reviewHotelInquiryContent({...valid,body:valid.body+"\n[Insert official signature]"}).valid).toBe(false));
 it("rejects date mismatch in saved body",()=>expect(reviewHotelInquiryContent({...valid,checkIn:"2025-05-07"}).valid).toBe(false));
 it("rejects invalid recipient",()=>expect(reviewHotelInquiryContent({...valid,recipient:"not-an-email"}).valid).toBe(false));
});
describe("read-only inquiry history organization",()=>{
 const base={supplierId:"hotel1",destination:"Sarajevo",checkIn:"2027-05-07",checkOut:"2027-05-08",rooms:20};
 const entries=[{...base,id:"old",createdAt:"2026-11-19T20:00:00Z",status:"APPROVED"},{...base,id:"new",createdAt:"2026-11-19T21:00:00Z",status:"DRAFT"}];
 it("shows newest inquiry as current and preserves old approval in history",()=>{const result=splitHotelInquiryHistory(entries,base);expect(result.current?.id).toBe("new");expect(result.historical.map(x=>x.id)).toEqual(["old"])});
 it("keeps all records without mutating status",()=>{splitHotelInquiryHistory(entries,base);expect(entries[0].status).toBe("APPROVED");expect(entries.length).toBe(2)});
 it("does not select a different stay",()=>{const result=splitHotelInquiryHistory(entries,{...base,checkIn:"2028-05-07"});expect(result.current).toBeNull();expect(result.historical).toHaveLength(2)});
});
