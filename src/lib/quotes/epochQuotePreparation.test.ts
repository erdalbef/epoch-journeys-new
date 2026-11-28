import { describe, expect, it } from "vitest";

import { findUsableQuotePreparationRates, prepareItineraryHotelStays, quotePreparationDateRange, quoteProcurementReferenceDates, suggestedItineraryQuoteDates } from "./epochQuotePreparation";
import { hotelProcurementScheduleStays } from "@/lib/epoch-ai/hotelProcurementSchedule";
import type { SupplierHotelResult } from "./supplierHotelSelection";

const tour = {
  id: "nordic",
  title: "Scandinavian Pilgrimage",
  itinerary: [
    "Day 1 - September 2, 2026: Helsinki",
    "Dinner and overnight in Helsinki.",
    "Day 2 - September 3, 2026: Helsinki",
    "Dinner and overnight in Helsinki.",
    "Day 3 - September 4, 2026: Overnight ferry to Stockholm",
    "Overnight on board the ferry.",
    "Day 4 - September 5, 2026: Stockholm",
    "Dinner and overnight in Stockholm.",
    "Day 5 - September 6, 2026: Depart",
  ].join("\n"),
  overviewItinerary: null,
  destinations: ["Helsinki", "Stockholm"],
};

describe("Epoch AI quote preparation", () => {
  it("uses requested dates, groups hotel nights and flags the ferry separately", () => {
    const plan = prepareItineraryHotelStays(tour, "2027-10-03", "2027-10-07");
    expect(plan.hotels).toEqual([
      {city:"Helsinki",country:"Finland",checkIn:"2027-10-03",checkOut:"2027-10-05",nights:2},
      {city:"Stockholm",country:"Sweden",checkIn:"2027-10-06",checkOut:"2027-10-07",nights:1},
    ]);
    expect(plan.warnings).toEqual([expect.stringContaining("add the ferry cost under transport")]);
  });

  it("prefills dated travel and keeps an undated itinerary's named hotel available for review", () => {
    expect(suggestedItineraryQuoteDates(tour)).toEqual({startDate:"2026-09-02", endDate:"2026-09-06"});
    const undated = {...tour, itinerary:"Day 1 – Helsinki\nHotel: Scandic Grand Marina\nOvernight: Helsinki\nDay 2 – Departure"};
    const plan = prepareItineraryHotelStays(undated, "", "");
    expect(plan.hotels).toMatchObject([{city:"Helsinki", hotelName:"Scandic Grand Marina", nights:1}]);
    expect(plan.warnings).toContainEqual(expect.stringContaining("Enter travel dates"));
  });

  it("uses all seven dated procurement stays for the Balkans instead of incomplete itinerary prose", () => {
    const balkans = {...tour, id:"cmwjahwcc0000c1fglvy5yrdm", itinerary:"Day 1 – Arrival\nOvernight in Sarajevo."};
    expect(quoteProcurementReferenceDates(balkans.id)).toEqual({startDate:"2027-05-07",endDate:"2027-05-19"});
    const plan = prepareItineraryHotelStays(balkans, "2027-05-07", "2027-05-19");
    expect(plan.source).toBe("procurement");
    expect(plan.hotels.map(stay => [stay.city,stay.nights])).toEqual([
      ["Sarajevo",1],["Kotor Bay",2],["Tirana",2],["Ohrid",2],["Pristina",1],["Skopje",2],["Belgrade",2],
    ]);
    expect(plan.warnings).toEqual([]);
    expect(prepareItineraryHotelStays(balkans, "2027-06-07", "2027-06-19").hotels[1]).toMatchObject({
      city:"Kotor Bay",checkIn:"2027-06-08",checkOut:"2027-06-10",
    });
    expect(prepareItineraryHotelStays(balkans, "2027-05-07", "2027-05-15").source).toBe("itinerary");
  });

  it("reads edited hotel and ferry stays from the saved procurement schedule", () => {
    const base = {rooms: 20, massRoom: false};
    const stays = hotelProcurementScheduleStays.parse([
      {...base, city:"Helsinki", country:"Finland", checkIn:"2027-10-03", checkOut:"2027-10-04"},
      {...base, city:"", ferry:{day:2, label:"Helsinki to Stockholm ferry"}, checkIn:"2027-10-04", checkOut:"2027-10-05"},
      {...base, city:"Stockholm", country:"Sweden", checkIn:"2027-10-05", checkOut:"2027-10-07"},
    ]);
    const hotelProcurementSchedule = {revision: "7f37a124-da15-4cc4-a492-1474384c5817", stays};
    const plan = prepareItineraryHotelStays({...tour, hotelProcurementSchedule}, "2027-10-02", "2027-10-07");
    expect(plan.source).toBe("procurement");
    expect(plan.hotels).toEqual([
      {city:"Helsinki", country:"Finland", checkIn:"2027-10-03", checkOut:"2027-10-04", nights:1},
      {city:"Stockholm", country:"Sweden", checkIn:"2027-10-05", checkOut:"2027-10-07", nights:2},
    ]);
    expect(plan.warnings).toEqual([
      expect.stringContaining("add the ferry cost under transport"),
      expect.stringContaining("1 night(s)"),
    ]);
    expect(hotelProcurementScheduleStays.safeParse([
      stays[0], {...stays[2], checkIn:"2027-10-03"},
    ]).success).toBe(false);
  });

  it("keeps dates and prices pending when the itinerary has no reliable night allocation", () => {
    const plan = prepareItineraryHotelStays({...tour,itinerary:"Helsinki and Stockholm"}, "2027-10-03", "2027-10-07");
    expect(plan.hotels.map(hotel => [hotel.city, hotel.checkIn, hotel.nights])).toEqual([
      ["Helsinki", undefined, 0], ["Stockholm", undefined, 0],
    ]);
    expect(plan.warnings).toContainEqual(expect.stringContaining("4 night(s)"));
    expect(quotePreparationDateRange("2027-02-30", "2027-03-05")).toBe(false);
  });

  it("keeps only current rates in the quote currency with both core room prices", () => {
    const stay = {city:"Helsinki",checkIn:"2027-10-03",checkOut:"2027-10-05",nights:2};
    const base = {
      rate:{id:"approved",currency:"EUR",minimumNights:null},
      rateValidity:"VALID_FOR_REQUEST", requiresReconfirmation:false,
      effectiveCost:{singleStatus:"COMPLETE",doubleTwinStatus:"COMPLETE",singlePerPersonPerNight:140,doubleTwinPerPersonPerNight:90},
    } as SupplierHotelResult;
    const rates = [
      base,
      {...base, requiresReconfirmation:true},
      {...base, rate:{...base.rate,currency:"USD"}},
      {...base, rate:{...base.rate,minimumNights:3}},
      {...base, cityTaxNeedsReview:true},
      {...base, effectiveCost:{...base.effectiveCost,singleStatus:"INCOMPLETE"}},
    ];
    expect(findUsableQuotePreparationRates(rates, stay, "EUR")).toEqual([base]);
    const partialOffer = {...base, rate:{...base.rate, staySpecific:true}, offerWarnings:["Single room price is missing."],
      effectiveCost:{...base.effectiveCost, singleStatus:"INCOMPLETE", singlePerPersonPerNight:null}};
    expect(findUsableQuotePreparationRates([partialOffer], stay, "EUR")).toEqual([partialOffer]);
  });
});
