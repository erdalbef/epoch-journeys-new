import { describe,it,expect } from "vitest";
import { canonicalHotelName,parseResearchRegistration } from "./hotelResearchRegistration";
const good={name:"Courtyard by Marriott Sarajevo",city:"Sarajevo",country:"Bosnia and Herzegovina",email:"sales@courtyardsarajevo.com",phone:"+387 33 954 500",source:"https://example.org/source",facilitiesSource:"https://example.org/facilities",hotelStay:{checkIn:"2027-05-07",checkOut:"2027-05-08",rooms:20}};
describe("hotel research registration safety",()=>{
 it("validates a documented research lead",()=>expect(parseResearchRegistration(good).hotelStay.rooms).toBe(20));
 it("rejects unsigned evidence",()=>expect(()=>parseResearchRegistration({...good,source:"http://example.com"})).toThrow());
 it("rejects invalid room dates",()=>expect(()=>parseResearchRegistration({...good,hotelStay:{...good.hotelStay,checkOut:"2027-05-06"}})).toThrow());
 it("normalizes hotel names for duplicate comparisons",()=>expect(canonicalHotelName("  HÔTEL Colors-Inn  ")).toBe("hotel colors inn"));
 it("requires a country for universal registration",()=>expect(()=>parseResearchRegistration({...good,country:""})).toThrow());
 it("preserves explicit human evidence checks",()=>{
   const result=parseResearchRegistration({...good,adminVerification:{confirmation:"REGISTER VERIFIED RESEARCH LEAD",contactChecked:true,facilitiesChecked:true}});
   expect(result.adminVerification?.contactChecked).toBe(true);
 });
 it("rejects an embedded credential in source URL",()=>expect(()=>parseResearchRegistration({...good,source:"https://user:pass@example.org/source"})).toThrow());
 it("rejects invalid email",()=>expect(()=>parseResearchRegistration({...good,email:"no-mail"})).toThrow());
});
