/** CRM research registration payload validation. No rates or confirmations inferred. */
export const PENDING_HOTEL_CONTACT_NOTE = "Contact verification: pending";
type ResearchRegistrationBase = {
  name:string;city:string;country:string;
  hotelStay:{checkIn:string;checkOut:string;rooms:number};
};
type VerifiedResearchRegistration = ResearchRegistrationBase & {
  mode:"verified";email:string;phone:string;source:string;facilitiesSource?:string;
  adminVerification?:{confirmation:string;contactChecked:boolean;facilitiesChecked:boolean};
};
export type ResearchRegistration = VerifiedResearchRegistration | (ResearchRegistrationBase & {mode:"pending-contact"});

export function canonicalHotelName(value:string) {
  return value.normalize("NFD").replace(/(\p{Script=Latin})\p{M}+/gu, "$1").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
export function parseResearchRegistration(data:unknown):ResearchRegistration {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid request.");
  const v=data as Record<string,unknown>;
  const field=(k:string,max:number)=>{
    if (typeof v[k]!=="string") throw new Error(`${k} required.`);
    const text=v[k].trim(); if (!text || text.length>max) throw new Error(`Invalid ${k}.`); return text;
  };
  const name=field("name",180),city=field("city",100),country=field("country",100);
  if (![name,city,country].every(value => /\p{L}/u.test(value))) throw new Error("Invalid hotel name or location.");
  if (v.mode !== undefined && v.mode !== "verified" && v.mode !== "pending-contact") {
    throw new Error("Invalid registration mode.");
  }
  const input=v.hotelStay;
  if (!input || typeof input!=="object" || Array.isArray(input)) throw new Error("Hotel stay is required.");
  const stay=input as Record<string,unknown>;
  if (typeof stay.checkIn!=="string" || typeof stay.checkOut!=="string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(stay.checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(stay.checkOut) ||
    stay.checkOut<=stay.checkIn || !Number.isInteger(stay.rooms) || (stay.rooms as number)<1 || (stay.rooms as number)>250) throw new Error("Invalid stay details.");
  const hotelStay = {checkIn:stay.checkIn,checkOut:stay.checkOut,rooms:stay.rooms as number};
  if (v.mode === "pending-contact") {
    if (v.confirmation !== "REGISTER LEAD WITH CONTACT PENDING") throw new Error("Explicit approval required to register a lead with contact pending.");
    if (["email","phone","source","facilitiesSource","adminVerification"].some(key => v[key] !== undefined)) {
      throw new Error("Invalid contact details for a pending lead.");
    }
    return {mode:"pending-contact",name,city,country,hotelStay};
  }
  const email=field("email",254),phone=field("phone",60),source=field("source",1500);
  const facilitiesSource = v.facilitiesSource === undefined ||
    (typeof v.facilitiesSource === "string" && !v.facilitiesSource.trim())
    ? undefined
    : field("facilitiesSource",1500);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email.");
  for (const link of facilitiesSource ? [source, facilitiesSource] : [source]) {
    let url:URL;
    try {url=new URL(link);} catch {throw new Error("Evidence must use valid HTTPS links.");}
    if (url.protocol!=="https:" || url.username || url.password || !url.hostname.includes(".") ||
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i.test(url.hostname)) throw new Error("Evidence must use public HTTPS links.");
  }
  const vfy=v.adminVerification;
  const adminVerification=vfy && typeof vfy==="object" && !Array.isArray(vfy)
    ? {confirmation:(vfy as Record<string,unknown>).confirmation,contactChecked:(vfy as Record<string,unknown>).contactChecked,facilitiesChecked:(vfy as Record<string,unknown>).facilitiesChecked}
    : undefined;
  return {mode:"verified",name,city,country,email,phone,source,facilitiesSource,
    adminVerification:adminVerification && typeof adminVerification.confirmation==="string"
    && typeof adminVerification.contactChecked==="boolean" && typeof adminVerification.facilitiesChecked==="boolean"
    ? adminVerification as VerifiedResearchRegistration["adminVerification"]:undefined,hotelStay};
}
