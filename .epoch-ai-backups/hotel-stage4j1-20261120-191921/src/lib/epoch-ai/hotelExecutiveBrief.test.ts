import {describe,it,expect} from "vitest";
import {buildHotelBrief,stableHotelIdentity} from "./hotelExecutiveBrief";
describe("executive hotel recommendation evidence",()=>{
 it("merges Four Points brand variation",()=>expect(stableHotelIdentity("Four Points by Sheraton Prishtina City")).toBe(stableHotelIdentity("Four Points Prishtina City")));
 it("extracts only short published facility statements and no invented rates",()=>{
 const brief=buildHotelBrief("Hilton Prishtina",[{title:"Hilton Prishtina",url:"https://www.hilton.com/en/hotels/test",description:"Hilton Prishtina offers an on-site restaurant, meeting rooms and free parking"}]);
 expect(brief.reasons).toContain("Restaurant or dining facilities advertised");
 expect(brief.reasons).toContain("Meeting or event space advertised");
 expect(brief.bbRate).toBeUndefined();expect(brief.rating).toBeUndefined();
 });
 it("excludes unrelated accommodation information",()=>{
 const brief=buildHotelBrief("Hilton Prishtina",[{title:"Hotel Elsewhere",url:"https://test.example/",description:"Hotel Elsewhere has restaurants and parking"}]);
 expect(brief.reasons).toHaveLength(0);
 });
});
