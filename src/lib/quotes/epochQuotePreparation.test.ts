import { describe, expect, it } from "vitest";

import { findUsableQuotePreparationRates, prepareItineraryHotelStays, quotePreparationDateRange } from "./epochQuotePreparation";
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
  });
});
