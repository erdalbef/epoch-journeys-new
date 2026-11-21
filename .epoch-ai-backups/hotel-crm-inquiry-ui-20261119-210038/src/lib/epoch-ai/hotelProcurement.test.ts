import {describe,it,expect} from "vitest";
import {balkanStays,matchingHotels,contactEmail,inquiry,nights} from "./hotelProcurement";
describe("read-only hotel procurement preparation",()=>{
 it("uses seven approved reference stays totalling 12 hotel nights",()=>{expect(balkanStays).toHaveLength(7);expect(balkanStays.reduce((x,s)=>x+nights(s),0)).toBe(12)});
 it("matches existing suppliers without creating records",()=>{const x=matchingHotels("Kotor Bay",[{id:"1",name:"A",city:"Kotor",country:"ME",email:null,preferred:true,contacts:[]}]);expect(x).toHaveLength(1)});
 it("uses primary contact for draft recipient",()=>{expect(contactEmail({id:"1",name:"A",city:"Ohrid",country:null,email:"info@example.com",preferred:false,contacts:[{email:"reservations@example.com",isPrimary:true}]})).toBe("reservations@example.com")});
 it("preserves approved master terms",()=>{const x=inquiry(balkanStays[1],"Hotel");expect(x.body).toContain("Half-board supplement (HB)");expect(x.body).toContain("2 glasses of wine");expect(x.body).toContain("private meeting room");expect(x.errors).toHaveLength(0)});
 it("blocks invalid date drafts",()=>{expect(inquiry({...balkanStays[0],checkOut:"2027-05-06"},"").errors.length).toBeGreaterThan(0)});
});
