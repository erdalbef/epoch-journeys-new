/** Reviewed public hotel contacts for the 2027 Sarajevo procurement pilot.
 * Research snapshot checked 2026-11-18. These are published addresses, NOT confirmed group-sales recipients.
 * This module must not make network requests or mark supplier services as confirmed.
 */
export type PublicHotelVerification = {
  email: string;
  contactType: "sales" | "reservations" | "general";
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

export function publishedHotelVerification(name: string, city?: string, country?: string): PublicHotelVerification | undefined {
  const key = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (key === "rogner hotel tirana" && city?.trim().toLowerCase() === "tirana" &&
      country?.trim().toLowerCase() === "albania") {
    return ROGNER_TIRANA_PUBLIC_VERIFICATION;
  }
  return SARAJEVO_PUBLIC_VERIFICATION[key] || HUMA_PUBLIC_VERIFICATION[key];
}
