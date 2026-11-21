import { describe,it,expect } from "vitest";
import { validateHotelInquiry,sameApprovedSnapshot } from "./hotelInquiryHistory";
import { balkanStays,inquiry } from "./hotelProcurement";
const stay=balkanStays[0]; const draft=inquiry(stay,"Courtyard by Marriott Sarajevo");
const value={tourId:"tour123456",supplierId:"hotel123456",stay,recipient:"sales@courtyardsarajevo.com",subject:draft.subject,body:draft.body};
describe("hotel inquiry history",()=>{
 it("accepts a valid draft without sending",()=>expect(validateHotelInquiry(value).stay.rooms).toBe(20));
 it("rejects invalid recipient",()=>expect(()=>validateHotelInquiry({...value,recipient:"fake"})).toThrow());
 it("rejects inaccurate room details",()=>expect(()=>validateHotelInquiry({...value,stay:{...stay,rooms:30}})).toThrow());
 it("rejects bad travel dates",()=>expect(()=>validateHotelInquiry({...value,stay:{...stay,checkOut:stay.checkIn}})).toThrow());
 it("detects post-approval changes",()=>expect(sameApprovedSnapshot(value,{...value,body:value.body+" changed"})).toBe(false));
});
