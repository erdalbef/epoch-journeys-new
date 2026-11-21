export type Stay = { city: string; checkIn: string; checkOut: string; rooms: number; massRoom: boolean };
export type HotelContact = { id: string; name: string; city: string | null; country: string | null; email: string | null; preferred: boolean; contacts: { email: string | null; isPrimary: boolean }[] };
export const balkanStays: Stay[] = [
  {city:"Sarajevo",checkIn:"2027-05-07",checkOut:"2027-05-08",rooms:20,massRoom:false},
  {city:"Kotor Bay",checkIn:"2027-05-08",checkOut:"2027-05-10",rooms:20,massRoom:true},
  {city:"Tirana",checkIn:"2027-05-10",checkOut:"2027-05-12",rooms:20,massRoom:false},
  {city:"Ohrid",checkIn:"2027-05-12",checkOut:"2027-05-14",rooms:20,massRoom:false},
  {city:"Pristina",checkIn:"2027-05-14",checkOut:"2027-05-15",rooms:20,massRoom:false},
  {city:"Skopje",checkIn:"2027-05-15",checkOut:"2027-05-17",rooms:20,massRoom:false},
  {city:"Belgrade",checkIn:"2027-05-17",checkOut:"2027-05-19",rooms:20,massRoom:false},
];
const key=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z]/g,"");
export function matchingHotels(city:string, hotels:HotelContact[]):HotelContact[]{
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
export function contactEmail(h:HotelContact):string { return h.contacts.find(c=>c.isPrimary && c.email)?.email || h.contacts.find(c=>c.email)?.email || h.email || ""; }
export function nights(s:Stay): number {
 const from=Date.parse(s.checkIn+"T00:00:00Z"),to=Date.parse(s.checkOut+"T00:00:00Z");
 return Number.isFinite(from)&&Number.isFinite(to)?Math.round((to-from)/86400000):0;
}
export function inquiry(stay:Stay,hotelName:string): { subject:string; body:string; errors:string[] } {
 const errors:string[]=[];
 if(!stay.city.trim())errors.push("Destination required");
 if(nights(stay)<1 || nights(stay)>30)errors.push("Valid check-in and check-out dates required");
 if(!Number.isInteger(stay.rooms)||stay.rooms<1||stay.rooms>250)errors.push("Valid room count required");
 const fmt=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)?new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}):d;
 const dates=`${fmt(stay.checkIn)}–${fmt(stay.checkOut)}`;
 const subject=`Group Accommodation Request – ${dates} | Epoch Journeys`;
 const body=`Dear Reservations Team,\n\nGreetings from Epoch Journeys.\n\nWe are organizing a Catholic pilgrimage group from the USA and would appreciate your best group accommodation offer for the following:\n\nAccommodation Details\n- Destination: ${stay.city}\n- Check-in: ${fmt(stay.checkIn)}\n- Check-out: ${fmt(stay.checkOut)}\n- Duration: ${nights(stay)} night${nights(stay)===1?"":"s"}\n- Rooms requested: ${stay.rooms} rooms (Double/Twin and Single)\n\nPlease include the following in your quotation:\n- Room rates with breakfast included (BB)\n- Half-board supplement (HB)\n- Beverage package for group dinners: 2 glasses of wine, beer, or soft drinks per person\n- City tax, if applicable\n- Porterage availability and charges\n\nPlease also confirm coach access and parking facilities, your complimentary room policy, and your payment and cancellation conditions.${stay.massRoom?"\n\nAdditionally, we would appreciate confirmation of whether a suitable private meeting room could be arranged for our group's Mass on ${fmt(stay.checkIn)}.":""}\n\nThank you for your assistance. We look forward to receiving your offer.\n\nKind regards,\nErdal Vardarli\nManaging Director | Epoch Journeys OOD\n+90 555 985 4924\nerdal@epochjourneys.com\nwww.epochjourneys.com`;
 void hotelName; // supplier choice controls recipient; template has no unapproved named salutation
 return {subject,body:body.replaceAll("\\n","\n"),errors};
}
