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

describe("hotel room and lobby evidence",()=>{
 it("extracts published guest room size and lobby seating",()=>{
  const brief=buildHotelBrief("Hotel Alpha",[{title:"Hotel Alpha",url:"https://hotel.example/hotel",description:"Hotel Alpha standard rooms: 29 m². Lobby seats 45 people. Restaurants nearby and shopping mall close by."}]);
  expect(brief.reasons).toContain("Guest room size advertised: 29 m²");
  expect(brief.reasons).toContain("Published lobby seating: 45 people");
  expect(brief.reasons).toContain("Nearby restaurants or cafés mentioned");
 });
 it("does not confuse conference room area with guest room size or invent lobby capacity",()=>{
  const brief=buildHotelBrief("Hotel Alpha",[{title:"Hotel Alpha",url:"https://hotel.example/hotel",description:"Hotel Alpha meeting room 120 m². Spacious lobby and parking."}]);
  expect(brief.reasons.some(v=>v.startsWith("Guest room size"))).toBe(false);
  expect(brief.reasons.some(v=>v.startsWith("Published lobby seating"))).toBe(false);
  expect(brief.reasons).toContain("Spacious lobby or seating advertised");
 });
});

describe("sourced guest ratings",()=>{
 it("shows explicit Booking.com scores with source and count",()=>{
  const url="https://www.booking.com/hotel/x/hotel-alpha.html";
  const brief=buildHotelBrief("Hotel Alpha",[{title:"Hotel Alpha - Booking.com",url,description:"Hotel Alpha rated 8.7/10 based on 1,245 reviews. Free parking."}]);
  expect(brief.rating).toBe("Booking.com: 8.7/10 (1,245 reviews)");
  expect(brief.ratingSourceUrl).toBe(url);
 });
 it("rejects unsourced numerical scores and scores above maximum",()=>{
  const a=buildHotelBrief("Hotel Alpha",[{title:"Hotel Alpha",url:"https://hotel.example/",description:"Hotel Alpha rated 9.3/10"}]);
  const b=buildHotelBrief("Hotel Alpha",[{title:"Hotel Alpha",url:"https://www.booking.com/hotel/x/test.html",description:"Hotel Alpha rated 9.3/5"}]);
  expect(a.rating).toBeUndefined();expect(b.rating).toBeUndefined();
 });
});
