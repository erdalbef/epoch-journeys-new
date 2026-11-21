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

import { candidateNameFromSearchTitle, extractDistinctHotelCandidates } from "./hotelWebResearch";
describe("automated candidate extraction", () => {
  it("extracts direct named hotels and filters known leads", () => {
    const results=[
      {title:"Hotel Sirius | Official Hotel",url:"https://hotelsirius.example/contact",description:""},
      {title:"Hotel New Horizon | Official Website",url:"https://hotelnewhorizon.example/",description:"Rooms"},
      {title:"Hotel New Horizon - Rooms",url:"https://hotelnewhorizon.example/rooms",description:"Rooms"}
    ];
    const names=extractDistinctHotelCandidates(results,["Hotel Sirius"]).map(h=>h.name);
    expect(names).toEqual(["Hotel New Horizon"]);
  });
  it("rejects directory results and generic headlines", () => {
    const pages=[
      {title:"Hotel Emerald - booking.com",url:"https://www.booking.com/hotel/emerald",description:""},
      {title:"10 Best Hotels in Pristina | Reviews",url:"https://travel.example/10-best",description:""}
    ];
    expect(extractDistinctHotelCandidates(pages,[])).toEqual([]);
    expect(candidateNameFromSearchTitle("Best Hotels in Skopje - Travel")).toBe("");
  });
});


describe("Stage 4G.1 live search regression",()=>{
  it("treats the previously known Swiss Diamond result as a duplicate",()=>{
    const results=mapBraveHotelResults({web:{results:[
      {title:"Hilton Prishtina",url:"https://www.hilton.com/en/hotels/prnprhi-hilton-prishtina/",description:"Book your stay at our conveniently-located <strong>Hilton Prishtina hotel</strong>."},
      {title:"Official site Swiss Diamond Hotel Prishtina in Kosovo",url:"https://www.sdhprishtina.com/",description:"Only on the official website of <strong>Swiss Diamond Hotel Prishtina</strong>."}
    ]}});
    expect(results[0].description).not.toContain("<strong>");
    expect(results[1].description).not.toContain("<strong>");
    expect(candidateNameFromSearchTitle(results[1].title)).toBe("Swiss Diamond Hotel Prishtina");
    const candidates=extractDistinctHotelCandidates(results,["Hotel Sirius","Mercure Prishtina City","Courtyard by Marriott Prishtina","Swiss Diamond Hotel Pristina"]);
    expect(candidates.map(c=>c.name)).toEqual(["Hilton Prishtina"]);
  });
  it("normalizes location spelling and official-site wording without swallowing distinct names",()=>{
    const results=[
      {title:"Official website of Hotel Sirius in Kosovo",url:"https://sirius.example/",description:"Sirius"},
      {title:"Hilton Garden Inn Prishtina",url:"https://garden.example/",description:"Garden Inn"},
      {title:"Hilton Prishtina",url:"https://hilton.example/",description:"Hilton"}
    ];
    expect(extractDistinctHotelCandidates(results,["Hotel Sirius Pristina","Hilton Pristina"]).map(x=>x.name)).toEqual(["Hilton Garden Inn Prishtina"]);
  });
  it("strips simple tags and HTML entities from returned excerpts",()=>{
    const [entry]=mapBraveHotelResults({web:{results:[{title:"Hilton &amp; Suites",url:"https://example.org",description:"Spacious <strong>rooms</strong> &amp; dining &#38; <em>spa</em>."}]}});
    expect(entry.title).toBe("Hilton & Suites");
    expect(entry.description).toBe("Spacious rooms & dining & spa.");
  });
});


describe("Stage 4G.2 brand identity safeguards",()=>{
  it("flags generic IHG-titled results instead of treating them as verified hotels",()=>{
    const candidates=extractDistinctHotelCandidates([{title:"Hotel Skopje City Centre",url:"https://www.ihg.com/spnd/hotels/us/en/skopje/skpcc/hoteldetail",description:"Modern 4-star hotel"}],[]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].identityStatus).toBe("identity-review");
    expect(candidates[0].identityNote).toContain("IHG");
  });
  it("does not manufacture an official name or declare the page live",()=>{
    const candidates=extractDistinctHotelCandidates([{title:"Hilton Prishtina",url:"https://www.hilton.com/en/hotels/prnprhi-hilton-prishtina/",description:"Hotel"}],[]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].identityStatus).toBe("brand-consistent");
    expect(candidates[0].identityNote).toContain("not independently verified");
  });
  it("never calls an unrelated source a verified official hotel",()=>{
    const candidates=extractDistinctHotelCandidates([{title:"Hotel Riverside",url:"https://travel-articles.example/hotel",description:"hotel"}],[]);
    expect(candidates[0].sourceType).toBe("independent-mention");
    expect(candidates[0].identityStatus).toBe("brand-consistent");
  });
});
