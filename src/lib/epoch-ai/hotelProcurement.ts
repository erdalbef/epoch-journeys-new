import { itineraryProcurementStays } from "./hotelStayCities";

export type Stay = { city: string; checkIn: string; checkOut: string; rooms: number; massRoom: boolean; originCountry?: string };
export type HotelContact = { id: string; name: string; city: string | null; country: string | null; email: string | null; preferred: boolean; contacts: { email: string | null; isPrimary: boolean; notes?: string | null }[] };
export const balkanStays: Stay[] = [
  {city:"Sarajevo",checkIn:"2027-05-07",checkOut:"2027-05-08",rooms:20,massRoom:false,originCountry:"USA"},
  {city:"Kotor Bay",checkIn:"2027-05-08",checkOut:"2027-05-10",rooms:20,massRoom:true,originCountry:"USA"},
  {city:"Tirana",checkIn:"2027-05-10",checkOut:"2027-05-12",rooms:20,massRoom:false,originCountry:"USA"},
  {city:"Ohrid",checkIn:"2027-05-12",checkOut:"2027-05-14",rooms:20,massRoom:false,originCountry:"USA"},
  {city:"Pristina",checkIn:"2027-05-14",checkOut:"2027-05-15",rooms:20,massRoom:false,originCountry:"USA"},
  {city:"Skopje",checkIn:"2027-05-15",checkOut:"2027-05-17",rooms:20,massRoom:false,originCountry:"USA"},
  {city:"Belgrade",checkIn:"2027-05-17",checkOut:"2027-05-19",rooms:20,massRoom:false,originCountry:"USA"},
];
export type ProcurementStay = Stay & { id: number; country?: string; reference?: Stay; ferry?: { day: number; label: string } };

const balkanPilotTourId = "cmwjahwcc0000c1fglvy5yrdm";

export function createProcurementStay(id: number, city = ""): ProcurementStay {
  return { id, city, checkIn: "", checkOut: "", rooms: 20, massRoom: false };
}

export function initialProcurementStays(tourId: string, destinations: string[], itinerary?: string | null): ProcurementStay[] {
  if (tourId === balkanPilotTourId) {
    return balkanStays.map((reference, id) => ({ ...reference, id, reference }));
  }

  return itineraryProcurementStays(itinerary, destinations)
    .map(({ city, country, ferry, checkIn, checkOut }, id) => ({
      ...createProcurementStay(id, city), country, ferry,
      checkIn: checkIn ?? "", checkOut: checkOut ?? "",
    }));
}

const key=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z]/g,"");
export function matchingHotels(city:string, hotels:HotelContact[]):HotelContact[]{
 if (!key(city)) return [];
 const terms = key(city).includes("kotor")?["kotor","dobrota","prcanj","perast","tivat"]:[key(city),...(key(city)==="pristina"?["prishtina"]:[])];
 return hotels.filter(h=>h.city && terms.some(t=>key(h.city||"").includes(t))).sort((a,b)=>Number(b.preferred)-Number(a.preferred));
}
export function searchCrmHotels(hotels:HotelContact[], city:string, search:string):HotelContact[] {
 const query=key(search.trim());
 const cityMatches=matchingHotels(city,hotels);
 if (!query) return cityMatches;
 return hotels.filter(h=>[h.name,h.city||"",h.country||""].some(v=>key(v).includes(query)))
   .sort((a,b)=>Number(cityMatches.some(v=>v.id===b.id))-Number(cityMatches.some(v=>v.id===a.id)) || Number(b.preferred)-Number(a.preferred) || a.name.localeCompare(b.name));
}
export function contactEmail(h: Pick<HotelContact, "contacts" | "email">): string {
  return h.contacts.find(contact => contact.isPrimary && contact.email)?.email ||
    h.contacts.find(contact => contact.email && !contact.notes?.startsWith("Public source: https://"))?.email ||
    h.email || "";
}
export function nights(s:Stay): number {
 const from=Date.parse(s.checkIn+"T00:00:00Z"),to=Date.parse(s.checkOut+"T00:00:00Z");
 return Number.isFinite(from)&&Number.isFinite(to)?Math.round((to-from)/86400000):0;
}
export function inquiry(stay:Stay,hotelName:string): { subject:string; body:string; errors:string[] } {
 const errors:string[]=[];
 if(!stay.city.trim())errors.push("Destination required");
 if(!hotelName.trim())errors.push("Hotel name required");
 if(nights(stay)<1 || nights(stay)>30)errors.push("Valid check-in and check-out dates required");
 if(!Number.isInteger(stay.rooms)||stay.rooms<1||stay.rooms>250)errors.push("Valid room count required");
 const fmt=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)?new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}):d;
 const dates=`${fmt(stay.checkIn)}–${fmt(stay.checkOut)}`;
 const subject=`Group Accommodation Request | ${dates} | Epoch Journeys`;
 const origin=stay.originCountry?.trim();
 const originPhrase=origin ? ` from ${origin.toUpperCase()==="USA"?"the USA":origin}` : "";
 const body=`Dear Reservations Team,\n\nGreetings from Epoch Journeys.\n\nWe are organizing a Catholic pilgrimage group${originPhrase} and would appreciate your best group accommodation offer for the following:\n\nAccommodation Details\n- Destination: ${stay.city}\n- Hotel: ${hotelName.trim()}\n- Check-in: ${fmt(stay.checkIn)}\n- Check-out: ${fmt(stay.checkOut)}\n- Duration: ${nights(stay)} night${nights(stay)===1?"":"s"}\n- Rooms requested: ${stay.rooms} rooms (Double/Twin, Single, and Triple where available)\n- Meal plan: Bed & Breakfast (BB)\n\nPlease advise on availability for the requested dates and quote your best group rates for Double/Twin and Single rooms, plus Triple rooms where available.\n\nPlease itemize these additional charges separately from the BB room rate:\n- Half-board supplement (HB)\n- Dinner beverage package supplement: 2 glasses of wine, beer, or soft drinks\n- City tax, if applicable\n- Porterage charges, if available\n\nAdditional Information\nPlease also advise on:\n- Standard guest room sizes (m²), walk-in showers and accessible rooms\n- Lobby facilities and suitability for group check-in\n- Full-size coach access and parking arrangements\n- Complimentary room policy\n- Payment and cancellation conditions.\n- Offer validity${stay.massRoom?"\n- Availability of a suitable private meeting room for the group's Mass on "+fmt(stay.checkIn)+" (please advise whether complimentary or subject to a charge)":""}\n\nThank you for your assistance. We look forward to receiving your offer.\n\nKind regards,`;

 return {subject,body:body.replaceAll("\\n","\n"),errors};
}
