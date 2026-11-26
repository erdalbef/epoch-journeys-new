/** Reviewed public hotel contacts for the 2027 Sarajevo procurement pilot.
 * Research snapshot checked 2026-11-18. These are published addresses, NOT confirmed group-sales recipients.
 * This module must not make network requests or mark supplier services as confirmed.
 */
export type PublicHotelVerification = {
  email: string;
  contactType: "groups" | "sales" | "reservations" | "general";
  phone: string;
  source: string;
  facilitiesSource: string;
  publishedFacts: string[];
  openQuestions: string[];
  reviewedOn?: string;
};
const common = ["20 rooms available on 7–8 May 2027", "double/twin and single room mix", "walk-in showers and lifts", "coach arrival and parking", "porterage", "group dinner and beverage package", "BB/HB group rates and commercial terms"];
export const SARAJEVO_PUBLIC_VERIFICATION: Record<string, PublicHotelVerification> = {
  "courtyard by marriott sarajevo": {
    email: "sales@courtyardsarajevo.com", contactType: "sales", phone: "+387 33 954 500",
    source: "https://pub-mediabox-storage.rxweb-prd.com/exhibitor/products/exh-5a52164f-9d2e-4243-800f-dd572ffb7549/product-documents/pro-f900f214-5e7b-4f32-bb9e-cb928d5bc75b/f2e50f2b-50b9-439c-9a92-6445f62aa06b.pdf",
    facilitiesSource: "https://www.marriott.com/en-us/hotels/sjjcy-courtyard-sarajevo/overview/",
    publishedFacts: ["central location", "on-site restaurant", "meeting facilities", "self-parking for cars listed; coach access not established"],
    openQuestions: [...common, "specific bus parking or drop-off arrangements"]
  },
  "movenpick hotel sarajevo": {
    email: "hb1f7-re1@accor.com", contactType: "reservations", phone: "+387 33 705 000",
    source: "https://all.accor.com/hotel/B1F7/index.en.shtml", facilitiesSource: "https://movenpick.ba/",
    publishedFacts: ["restaurant / brasserie", "published wheelchair-access services", "central-city location"],
    openQuestions: common
  },
  "swissotel sarajevo": {
    email: "info@swissotel-sarajevo.com", contactType: "general", phone: "+387 33 588 000",
    source: "https://all.accor.com/hotel/B1B7/index.en.shtml", facilitiesSource: "https://www.swissotel.com/hotels/sarajevo/dining/cafe-swiss/",
    publishedFacts: ["central location", "Café Swiss advertises 140-seat capacity", "restaurant dining available"],
    openQuestions: [...common, "verify availability of alcoholic beverage package"]
  },
  "ibis styles sarajevo": {
    email: "hb3g8-fo1@accor.com", contactType: "general", phone: "+387 33 483 900",
    source: "https://all.accor.com/hotel/B3G8/index.en.shtml", facilitiesSource: "https://all.accor.com/hotel/B3G8/index.en.shtml",
    publishedFacts: ["wheelchair-access services listed", "food and beverage outlets", "outside the historic city center"],
    openQuestions: [...common, "beverage package including wine/beer may be unavailable"]
  }
};
export const HUMA_PUBLIC_VERIFICATION: Record<string, PublicHotelVerification> = {
  "huma kotor bay hotel and villas": {
    email: "groups@humahotel.me",
    contactType: "sales",
    phone: "+382 67 075 484",
    source: "https://www.humahotel.me/reservation-policy/",
    facilitiesSource: "https://www.humahotel.me/accomodation/",
    publishedFacts: [
      "Official reservation policy directs groups of five or more rooms to the group reservations team",
      "Official contact page publishes the hotel telephone number"
    ],
    openQuestions: [
      "20-room availability for 8-10 May 2027",
      "Double/twin and single room availability",
      "Published property capacity and suitable room inventory",
      "Walk-in showers, lifts and accessible rooms",
      "Coach access and parking",
      "Porterage and group dinner arrangements",
      "Private Mass meeting room",
      "BB/HB rates, payment and cancellation terms"
    ]
  }
};
const ROGNER_TIRANA_PUBLIC_VERIFICATION: PublicHotelVerification = {
  email: "info.tirana@rogner.com",
  contactType: "general",
  phone: "+355 4 2235035",
  source: "https://www.hotel-europapark.com/en/contact-info.html",
  facilitiesSource: "https://www.hotel-europapark.com/en/mice.html",
  publishedFacts: ["central Tirana location", "conference and banquet facilities"],
  openQuestions: [
    "group reservations contact and room availability for the requested dates",
    "walk-in showers and lifts", "coach access and porterage",
    "group dinner, beverages and commercial terms"
  ],
  reviewedOn: "25 Nov 2026"
};

const SCANDIC_GRAND_MARINA_PUBLIC_VERIFICATION: PublicHotelVerification = {
  email: "grandmarina@scandichotels.com",
  contactType: "general",
  phone: "+358 300 308 404",
  source: "https://www.scandichotels.com/en/hotels/scandic-grand-marina",
  facilitiesSource: "https://www.scandichotels.com/en/hotels/scandic-grand-marina/meetings-conferences-events",
  publishedFacts: ["Hotel restaurant and meeting facilities advertised"],
  openQuestions: ["Group allotment and rates for the requested dates", "Walk-in showers and lift access", "Coach drop-off, porterage and group dinners"],
  reviewedOn: "25 Nov 2026",
};

const SCANDIC_SODRA_KAJEN_PUBLIC_VERIFICATION: PublicHotelVerification = {
  email: "sodrakajen@scandichotels.com",
  contactType: "general",
  phone: "+46 8 517 386 00",
  source: "https://www.scandichotels.com/en/hotels/scandic-sodra-kajen",
  facilitiesSource: "https://www.scandichotels.com/en/hotels/scandic-sodra-kajen",
  publishedFacts: ["323 rooms", "Hotel restaurant and rooms with showers advertised"],
  openQuestions: ["Group allotment and rates for the requested dates", "Walk-in showers and lift access", "Coach drop-off, porterage and group dinners"],
  reviewedOn: "25 Nov 2026",
};

const ELITE_STORA_HOTELLET_PUBLIC_VERIFICATION: PublicHotelVerification = {
  email: "reservations.jonkoping@elite.se",
  contactType: "reservations",
  phone: "+46 36 100 000",
  source: "https://www.elite.se/en/hotels/hotels-in-jonkoping/elite-stora-hotellet-jonkoping/",
  facilitiesSource: "https://www.elite.se/en/conference/jonkoping/stora-hotellet/",
  publishedFacts: ["Hotel restaurant and conference facilities advertised", "A group reservations contact is published"],
  openQuestions: ["Group allotment and rates for the requested dates", "Walk-in showers and lift access", "Coach drop-off, porterage and group dinners"],
  reviewedOn: "26 Nov 2026",
};

const AC_BELLA_SKY_PUBLIC_VERIFICATION: PublicHotelVerification = {
  email: "hotel@bellasky.dk",
  contactType: "general",
  phone: "+45 32 47 30 00",
  source: "https://bellagroup.dk/en/experiences-and-offers/hotel-offers-at-ac-hotel-bella-sky",
  facilitiesSource: "https://bellagroup.dk/en/about-bellagroup/business-areas/ac-bella-sky",
  publishedFacts: ["Nearly 800 rooms advertised by the operator", "Restaurants and conference facilities advertised"],
  openQuestions: ["Group reservations contact, room allotment and rates for the requested dates", "Walk-in showers and lift access", "Coach drop-off, porterage and group dinners"],
  reviewedOn: "26 Nov 2026",
};

const THON_OPERA_PUBLIC_VERIFICATION: PublicHotelVerification = {
  email: "opera@thon.no",
  contactType: "general",
  phone: "+47 24 10 30 00",
  source: "https://www.thonhotels.com/information/contact-information-hotels/",
  facilitiesSource: "https://www.thonhotels.com/conference/norway/oslo/thon-hotel-opera/",
  publishedFacts: ["480 rooms advertised", "Hotel restaurant and conference facilities advertised"],
  openQuestions: ["Group reservations contact, room allotment and rates for the requested dates", "Walk-in showers and lift access", "Coach drop-off, porterage and group dinners"],
  reviewedOn: "26 Nov 2026",
};

const HILTON_REYKJAVIK_PUBLIC_VERIFICATION: PublicHotelVerification = {
  email: "groups@islandshotel.is",
  contactType: "groups",
  phone: "+354 510 5130",
  source: "https://www.islandshotel.is/is/hotelin/hilton-reykjavik/",
  facilitiesSource: "https://www.hilton.com/en/hotels/kefhfhi-hilton-reykjavik/hotel-info/",
  publishedFacts: ["Group reservations contact for five or more rooms", "Hotel restaurant and meeting facilities advertised"],
  openQuestions: ["Group allotment and rates for the requested dates", "Walk-in showers and lift access", "Coach drop-off, porterage and group dinners"],
  reviewedOn: "26 Nov 2026",
};

const HYATT_KOTOR_BAY_PUBLIC_VERIFICATION: PublicHotelVerification = {
  email: "sales.kotorregency@hyatt.com",
  contactType: "sales",
  phone: "+382 32 311 200",
  source: "https://www.hyatt.com/hyatt-regency/en-US/tivrk-hyatt-regency-kotor-bay-resort/meetings/unique-venues",
  facilitiesSource: "https://www.hyatt.com/hyatt-regency/en-US/tivrk-hyatt-regency-kotor-bay-resort",
  publishedFacts: ["Hyatt lists a property sales email, telephone and event venues"],
  openQuestions: ["Group allotment and rates for the requested dates", "Walk-in showers and lift access", "Coach drop-off, porterage and group dinners"],
  reviewedOn: "26 Nov 2026",
};

const fold = (value?: string) => value?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";

export function hotelPublicResearchName(name: string, city?: string, country?: string) {
  return /^hilton reykjavik(?: nordica)?$/.test(fold(name)) &&
    fold(city) === "reykjavik" && fold(country) === "iceland" ? "Hilton Reykjavik" : name;
}

export function publishedHotelVerification(name: string, city?: string, country?: string): PublicHotelVerification | undefined {
  const key = fold(name);
  if (/^hyatt regency kotor bay(?: resort)?$/.test(key) &&
      /^(?:kotor(?: bay)?|donji stoliv)$/.test(fold(city)) && fold(country) === "montenegro") {
    return HYATT_KOTOR_BAY_PUBLIC_VERIFICATION;
  }
  if (hotelPublicResearchName(name, city, country) === "Hilton Reykjavik" &&
      fold(city) === "reykjavik" && fold(country) === "iceland") {
    return HILTON_REYKJAVIK_PUBLIC_VERIFICATION;
  }
  if (/^thon hotel opera(?:,? oslo)?$/.test(key) &&
      fold(city) === "oslo" && fold(country) === "norway") {
    return THON_OPERA_PUBLIC_VERIFICATION;
  }
  if (/^ac (?:hotel )?bella sky(?:,? copenhagen)?$/.test(key) &&
      fold(city) === "copenhagen" && fold(country) === "denmark") {
    return AC_BELLA_SKY_PUBLIC_VERIFICATION;
  }
  if (/^elite stora hotellet(?:,? jonkoping)?$/.test(key) &&
      fold(city) === "jonkoping" && fold(country) === "sweden") {
    return ELITE_STORA_HOTELLET_PUBLIC_VERIFICATION;
  }
  if ((key === "scandic sodra kajen" || key === "scandic sodra kajen, stockholm") &&
      city?.trim().toLowerCase() === "stockholm" && country?.trim().toLowerCase() === "sweden") {
    return SCANDIC_SODRA_KAJEN_PUBLIC_VERIFICATION;
  }
  if ((key === "scandic grand marina" || key === "scandic grand marina, helsinki") &&
      city?.trim().toLowerCase() === "helsinki" && country?.trim().toLowerCase() === "finland") {
    return SCANDIC_GRAND_MARINA_PUBLIC_VERIFICATION;
  }
  if (key === "rogner hotel tirana" && city?.trim().toLowerCase() === "tirana" &&
      country?.trim().toLowerCase() === "albania") {
    return ROGNER_TIRANA_PUBLIC_VERIFICATION;
  }
  return SARAJEVO_PUBLIC_VERIFICATION[key] || HUMA_PUBLIC_VERIFICATION[key];
}
