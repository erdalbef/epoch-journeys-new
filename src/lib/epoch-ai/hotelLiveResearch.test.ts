import {describe,it,expect} from "vitest";
import {mapGoogleHotelResults,validHotelResearchLocation} from "./hotelLiveResearch";
describe("Stage 4C live hotel discovery safety",()=>{
 it("rejects malformed destinations",()=>{expect(validHotelResearchLocation("Pristina","Kosovo")).toBe(true);expect(validHotelResearchLocation("A","Kosovo")).toBe(false);expect(validHotelResearchLocation("Skopje\nX","North Macedonia")).toBe(false)});
 it("handles no provider data safely",()=>expect(mapGoogleHotelResults({places:null},[])).toEqual([]));
 it("returns provider evidence without inventing contacts or rates",()=>{
  const out=mapGoogleHotelResults({places:[{id:"p1",displayName:{text:"Hotel Example"},formattedAddress:"Pristina, Kosovo",googleMapsUri:"https://www.google.com/maps/place/example"}]},[]);
  expect(out).toHaveLength(1);expect(out[0].name).toBe("Hotel Example");expect(JSON.stringify(out)).not.toContain("email");expect(JSON.stringify(out)).not.toContain("rate");
 });
 it("marks potential duplicates and excludes unsafe provider URLs",()=>{
  const out=mapGoogleHotelResults({places:[{id:"p1",displayName:{text:"Hôtel Test"},googleMapsUri:"https://evil.invalid"}]},["Hotel Test"]);
  expect(out[0].potentialCrmDuplicate).toBe(true);expect(out[0].mapsUrl).toBe("");
 });
 it("deduplicates place identifiers",()=>{
  const x={id:"same",displayName:{text:"Test Hotel"}};
  expect(mapGoogleHotelResults({places:[x,x]},[])).toHaveLength(1);
 });
});
