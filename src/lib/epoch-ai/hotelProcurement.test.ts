import {describe,it,expect} from "vitest";
import {balkanStays,matchingHotels,searchCrmHotels,contactEmail,inquiry,nights} from "./hotelProcurement";
describe("read-only hotel procurement preparation",()=>{
 it("uses seven approved reference stays totalling 12 hotel nights",()=>{expect(balkanStays).toHaveLength(7);expect(balkanStays.reduce((x,s)=>x+nights(s),0)).toBe(12)});
 it("matches existing suppliers without creating records",()=>{const x=matchingHotels("Kotor Bay",[{id:"1",name:"A",city:"Kotor",country:"ME",email:null,preferred:true,contacts:[]}]);expect(x).toHaveLength(1)});
 it("searches inactive research candidate by hotel, city and country, including outside current city",()=>{
   const hotels=[{id:"c",name:"Courtyard by Marriott Sarajevo",city:"Sarajevo",country:"Bosnia and Herzegovina",email:"sales@example.com",preferred:false,contacts:[]},{id:"t",name:"Tirana Grand",city:"Tirana",country:"Albania",email:null,preferred:false,contacts:[]}];
   expect(searchCrmHotels(hotels,"Sarajevo","").map(x=>x.id)).toEqual(["c"]);
   expect(searchCrmHotels(hotels,"Kotor Bay","courtyard").map(x=>x.id)).toEqual(["c"]);
   expect(searchCrmHotels(hotels,"Sarajevo","albania").map(x=>x.id)).toEqual(["t"]);
 });
 it("uses primary contact for draft recipient",()=>{expect(contactEmail({id:"1",name:"A",city:"Ohrid",country:null,email:"info@example.com",preferred:false,contacts:[{email:"reservations@example.com",isPrimary:true}]})).toBe("reservations@example.com")});
 it("preserves approved master terms",()=>{const x=inquiry(balkanStays[1],"Hotel");expect(x.body).toContain("Half-board supplement (HB)");expect(x.body).toContain("Triple rooms subject to request");expect(x.body).toContain("Please advise your availability for the requested dates and provide your best group rates for Double/Twin and Single rooms, including the Single Supplement where applicable.");expect(x.body).toContain("2 glasses of wine");expect(x.body).toContain("private meeting room");expect(x.errors).toHaveLength(0)});
 it("uses unambiguous English month dates for all new inquiries",()=>{const x=inquiry(balkanStays[0],"Hotel");expect(x.subject).toMatch(/^Group Accommodation Request \| /);expect(x.subject).toContain("7 May 2027");expect(x.body).toContain("8 May 2027");expect(x.subject).not.toContain("07/05/2027")});
 it("uses the branded-signature boundary without duplicating identity fields",()=>{const x=inquiry(balkanStays[0],"Courtyard");expect(x.body).toMatch(/Kind regards,$/);expect(x.body).not.toContain("Erdal Vardarli");expect(x.body).not.toContain("erdal@epochjourneys.com")});
 it("includes verified master hotel criteria and does not include group headcount",()=>{const x=inquiry(balkanStays[0],"Courtyard");expect(x.body).toContain("from the USA");expect(x.body).toContain("Standard guest room sizes (m²)");expect(x.body).toContain("Lobby facilities");expect(x.body).toContain("Full-size coach access");expect(x.body).toContain("Complimentary room policy");expect(x.body).not.toContain("Group size:")});
 it("does not assume USA origin for a generic tour",()=>{const x=inquiry({...balkanStays[0],originCountry:undefined},"Hotel");expect(x.body).toContain("organizing a Catholic pilgrimage group and");expect(x.body).not.toContain("from the USA")});
 it("includes the selected hotel in new inquiries",()=>{const x=inquiry(balkanStays[0],"Mövenpick Hotel Sarajevo");expect(x.body).toContain("- Destination: Sarajevo\n- Hotel: Mövenpick Hotel Sarajevo\n- Check-in:");expect(x.errors).toHaveLength(0)});
 it("requires a hotel name before drafting",()=>{expect(inquiry(balkanStays[0]," ").errors).toContain("Hotel name required")});
 it("blocks invalid date drafts",()=>{expect(inquiry({...balkanStays[0],checkOut:"2027-05-06"},"").errors.length).toBeGreaterThan(0)});
});
