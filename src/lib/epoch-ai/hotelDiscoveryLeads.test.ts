import {describe,it,expect} from "vitest";
import {leadsForCity,compareLeadToCrm,hotelResearchSearchUrl} from "./hotelDiscoveryLeads";
describe("hotel research leads",()=>{
 it("has four starting leads for each Balkan hotel destination",()=>{for (const city of ["Sarajevo","Kotor Bay","Tirana","Ohrid","Pristina","Skopje","Belgrade"]) expect(leadsForCity(city)).toHaveLength(4)});
 it("does not invent rates or verified contacts",()=>{for (const lead of leadsForCity("Kotor Bay")){expect(lead.sourceStatus).toBe("research-lead");expect(Object.keys(lead).sort()).toEqual(["city","name","sourceStatus"])}});
 it("checks potential CRM duplicates",()=>{expect(compareLeadToCrm("Hotel Colors Inn",["HOTEL COLORS INN"])).toBe(true)});
 it("supports research for new destinations",()=>{expect(leadsForCity("Vienna")).toEqual([]);expect(hotelResearchSearchUrl("Kotor","Hotel Vardar")).toContain("google.com/search?q=")});
});
