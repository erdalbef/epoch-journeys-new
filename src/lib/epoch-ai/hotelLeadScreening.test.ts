import {describe,it,expect} from "vitest";
import {leadsForCity} from "./hotelDiscoveryLeads";
import {leadEvidence,screenGroupCapacity} from "./hotelLeadScreening";
describe("group-sized branded hotel discovery",()=>{
 it("prioritizes four larger branded properties in Sarajevo",()=>{const leads=leadsForCity("Sarajevo");expect(leads).toHaveLength(4);for(const lead of leads){const ev=leadEvidence(lead.name);expect(ev?.totalRooms).toBeGreaterThanOrEqual(100);expect(ev?.source.startsWith("https://")).toBe(true)}});
 it("screens 20 rooms as a share of hotel stock",()=>{expect(screenGroupCapacity(20,37).status).toBe("capacity-caution");expect(screenGroupCapacity(20,132).sharePercent).toBe(15);expect(screenGroupCapacity(20,132).status).toBe("screening-pass")});
 it("does not pretend unknown rooms are confirmed",()=>{expect(screenGroupCapacity(20).status).toBe("unknown");expect(screenGroupCapacity(20,0).sharePercent).toBeNull()});
 it("continues to provide four leads in other Balkan cities",()=>{for(const city of ["Kotor Bay","Tirana","Ohrid","Pristina","Skopje","Belgrade"]) expect(leadsForCity(city)).toHaveLength(4)});
});
