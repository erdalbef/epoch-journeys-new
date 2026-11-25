import {describe,it,expect} from "vitest";
import {matchHotelCrmRecords} from "./hotelDiscoveryReview";
import {balkanStays,initialProcurementStays,matchingHotels,searchCrmHotels,contactEmail,inquiry,nights} from "./hotelProcurement";
describe("read-only hotel procurement preparation",()=>{
 it("uses seven approved reference stays totalling 12 hotel nights",()=>{expect(balkanStays).toHaveLength(7);expect(balkanStays.reduce((x,s)=>x+nights(s),0)).toBe(12)});
 it.each([5, 7, 9, 21])("creates all %i stays for a program in route order", count => {
   const destinations = Array.from({length: count}, (_, index) => `City ${index + 1}`);
   const stays = initialProcurementStays("another-pilgrimage", destinations);

   expect(stays.map(stay => stay.city)).toEqual(destinations);
   expect(new Set(stays.map(stay => stay.id)).size).toBe(count);
   expect(stays.every(stay => !stay.checkIn && !stay.checkOut && !stay.reference)).toBe(true);
 });
 it("keeps revisits as separate stays and skips empty destinations", () => {
   const stays = initialProcurementStays("another-pilgrimage", [" Rome ", "", "Assisi", "Rome"]);

   expect(stays.map(({id, city}) => ({id, city}))).toEqual([
     {id: 0, city: "Rome"}, {id: 1, city: "Assisi"}, {id: 2, city: "Rome"}
   ]);
 });
 it("uses the saved Scandinavia itinerary for city tabs and includes overnight ferries in order", () => {
   const itinerary = [
     "Day 1, September 2, 2027 – Thursday Departure",
     "Day 2, September 3, 2027 – Arrival in Helsinki\nWelcome dinner and overnight in Helsinki.",
     "Day 3 – 4 September 2027 – Helsinki – Overnight cruise to Stockholm\nDinner and overnight onboard.",
     "Day 4 – Stockholm\nDinner and overnight in Stockholm.",
     "Day 5 – Stockholm – Jönköping\nDinner and overnight in Jönköping.",
     "Day 6 – Jönköping – Lund – Ystad – Copenhagen\nDinner and overnight in Copenhagen.",
     "Day 7 – Copenhagen\nOvernight: 4-star hotel in Copenhagen, Denmark",
     "Day 8 – 2027-09-09 – Copenhagen – Overnight ferry to Oslo\nDinner and overnight on board.",
     "Day 9 – Oslo\nOvernight in Oslo.",
     "Day 10 – Flight to Reykjavik\nOvernight in Reykjavík.",
     "Day 11 – Golden Circle\nOvernight in Reykjavík.",
     "Day 12 – Departure",
   ].join("\n\n");
   const stays = initialProcurementStays("scandinavia", ["Finland", "Sweden", "Denmark", "Norway", "Iceland"], itinerary);
   expect(stays.map(stay => stay.ferry?.label ?? stay.city)).toEqual([
     "Helsinki", "Ferry: Helsinki → Stockholm", "Stockholm", "Jönköping",
     "Copenhagen", "Ferry: Copenhagen → Oslo", "Oslo", "Reykjavík",
   ]);
   expect(stays.filter(stay => !stay.ferry).map(stay => stay.country))
     .toEqual(["Finland", "Sweden", "Sweden", "Denmark", "Norway", "Iceland"]);
   expect(stays.map(stay => [stay.checkIn, stay.checkOut])).toEqual([
     ["2027-09-03", "2027-09-04"], ["2027-09-04", "2027-09-05"],
     ["2027-09-05", "2027-09-06"], ["2027-09-06", "2027-09-07"],
     ["2027-09-07", "2027-09-09"], ["2027-09-09", "2027-09-10"],
     ["2027-09-10", "2027-09-11"], ["2027-09-11", "2027-09-13"],
   ]);
 });
 it("leaves ambiguous dates blank and keeps independently corroborated nights", () => {
   const itinerary = [
     "Day 1 – 30 August 2027 – Oslo\nOvernight in Oslo.",
     "Day 2 – 31 August 2027 – Oslo\nOvernight in Oslo.",
     "Day 3 – September 2, 2027 – Stockholm\nOvernight in Stockholm.",
     "Day 4 – Departure",
   ].join("\n");
   const stays = initialProcurementStays("dates", [], itinerary);
   expect(stays.map(stay => [stay.checkIn, stay.checkOut]))
     .toEqual([["2027-08-30", ""], ["", ""]]);
   expect(initialProcurementStays("undated", [], "Day 1 – Oslo\nOvernight in Oslo.")[0])
     .toMatchObject({ checkIn: "", checkOut: "" });
 });
 it("does not use country-only destinations for hotel tabs", () => {
   expect(initialProcurementStays("country-only", ["Finland", "Iceland", "Türkiye"])).toEqual([]);
 });
 it("keeps the dated Balkan template on its pilot tour", () => {
   const stays = initialProcurementStays("cmwjahwcc0000c1fglvy5yrdm", ["Different destination"]);

   expect(stays.map(stay => stay.reference)).toEqual(balkanStays);
   expect(stays[2]).toMatchObject({city: "Tirana", checkIn: "2027-05-10", checkOut: "2027-05-12"});
 });
 it("matches existing suppliers without creating records",()=>{const x=matchingHotels("Kotor Bay",[{id:"1",name:"A",city:"Kotor",country:"ME",email:null,preferred:true,contacts:[]}]);expect(x).toHaveLength(1)});
 it("searches inactive research candidate by hotel, city and country, including outside current city",()=>{
   const hotels=[{id:"c",name:"Courtyard by Marriott Sarajevo",city:"Sarajevo",country:"Bosnia and Herzegovina",email:"sales@example.com",preferred:false,contacts:[]},{id:"t",name:"Tirana Grand",city:"Tirana",country:"Albania",email:null,preferred:false,contacts:[]}];
   expect(searchCrmHotels(hotels,"Sarajevo","").map(x=>x.id)).toEqual(["c"]);
   expect(searchCrmHotels(hotels,"Kotor Bay","courtyard").map(x=>x.id)).toEqual(["c"]);
   expect(searchCrmHotels(hotels,"Sarajevo","albania").map(x=>x.id)).toEqual(["t"]);
 });
 it("only reuses a hotel CRM record that matches the selected city and property", () => {
   const hotel = {name: "Hotel Colosseo", country: null, email: null, preferred: false, contacts: []};
   const hotels = [{...hotel, id: "t", city: "Tirana"}, {...hotel, id: "a", city: "Athens"}];

   expect(matchHotelCrmRecords("Hôtel Colosseo", "Tirana", hotels).map(item => item.id)).toEqual(["t"]);
   expect(matchHotelCrmRecords("Hotel Colosseo", "Ohrid", hotels)).toEqual([]);
 });
 it("uses primary contact for draft recipient",()=>{expect(contactEmail({id:"1",name:"A",city:"Ohrid",country:null,email:"info@example.com",preferred:false,contacts:[{email:"reservations@example.com",isPrimary:true}]})).toBe("reservations@example.com")});
 it("preserves approved master terms",()=>{const x=inquiry(balkanStays[1],"Hotel");expect(x.body).toContain("Half-board supplement (HB)");expect(x.body).toContain("Triple where available");expect(x.body).toContain("Please advise on availability for the requested dates and quote your best group rates for Double/Twin and Single rooms, plus Triple rooms where available.");expect(x.body).toContain("2 glasses of wine");expect(x.body).toContain("private meeting room");expect(x.errors).toHaveLength(0)});
 it("uses unambiguous English month dates for all new inquiries",()=>{const x=inquiry(balkanStays[0],"Hotel");expect(x.subject).toMatch(/^Group Accommodation Request \| /);expect(x.subject).toContain("7 May 2027");expect(x.body).toContain("8 May 2027");expect(x.subject).not.toContain("07/05/2027")});
 it("uses the branded-signature boundary without duplicating identity fields",()=>{const x=inquiry(balkanStays[0],"Courtyard");expect(x.body).toMatch(/Kind regards,$/);expect(x.body).not.toContain("Erdal Vardarli");expect(x.body).not.toContain("erdal@epochjourneys.com")});
 it("includes verified master hotel criteria and does not include group headcount",()=>{const x=inquiry(balkanStays[0],"Courtyard");expect(x.body).toContain("from the USA");expect(x.body).toContain("Standard guest room sizes (m²)");expect(x.body).toContain("Lobby facilities");expect(x.body).toContain("Full-size coach access");expect(x.body).toContain("Complimentary room policy");expect(x.body).not.toContain("Group size:")});
 it("does not assume USA origin for a generic tour",()=>{const x=inquiry({...balkanStays[0],originCountry:undefined},"Hotel");expect(x.body).toContain("organizing a Catholic pilgrimage group and");expect(x.body).not.toContain("from the USA")});
 it("includes the selected hotel in new inquiries",()=>{const x=inquiry(balkanStays[0],"Mövenpick Hotel Sarajevo");expect(x.body).toContain("- Destination: Sarajevo\n- Hotel: Mövenpick Hotel Sarajevo\n- Check-in:");expect(x.errors).toHaveLength(0)});
 it("requires a hotel name before drafting",()=>{expect(inquiry(balkanStays[0]," ").errors).toContain("Hotel name required")});
 it("blocks invalid date drafts",()=>{expect(inquiry({...balkanStays[0],checkOut:"2027-05-06"},"").errors.length).toBeGreaterThan(0)});
});
