import {describe,it,expect} from "vitest";
import {mapBraveHotelResults,safePublicUrl,validHotelResearchLocation,webHotelSearchLinks} from "./hotelWebResearch";
describe("Stage 4D hotel web research controls",()=>{
 it("validates destination and country",()=>{expect(validHotelResearchLocation("Pristina","Kosovo")).toBe(true);expect(validHotelResearchLocation("Skopje","North Macedonia")).toBe(true);expect(validHotelResearchLocation("X","Kosovo")).toBe(false);expect(validHotelResearchLocation("Skopje\nX","North Macedonia")).toBe(false)});
 it("creates browser links without external credentials",()=>{const links=webHotelSearchLinks("Pristina","Kosovo");expect(links).toHaveLength(3);expect(links[0].url).toContain("google.com/search?q=");expect(links[0].url).toContain("Pristina")});
 it("rejects dangerous and local URLs",()=>{expect(safePublicUrl("http://example.org")).toBe("");expect(safePublicUrl("https://localhost/test")).toBe("");expect(safePublicUrl("https://127.0.0.1/x")).toBe("");expect(safePublicUrl("https://example.com/a")).toContain("https://example.com/a")});
 it("maps only public evidence, never invents emails, rates or hotel names",()=>{const rows=mapBraveHotelResults({web:{results:[{title:"Test Hotel - Example page",url:"https://example.org/test",description:"Public page"}]}});expect(rows).toHaveLength(1);expect(rows[0].title).toContain("Example page");expect(JSON.stringify(rows)).not.toContain("email");expect(JSON.stringify(rows)).not.toContain("rate")});
 it("deduplicates links and filters unsupported objects",()=>{const rows=mapBraveHotelResults({web:{results:[{title:"A",url:"https://example.org"},{title:"B",url:"https://example.org"},{title:"C",url:"http://notsecure.org"}]}});expect(rows).toHaveLength(1)});
 it("handles missing provider data safely",()=>expect(mapBraveHotelResults({web:null})).toEqual([]));
});
