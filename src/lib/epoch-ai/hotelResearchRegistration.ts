/** CRM research registration payload validation. No rates or confirmations inferred. */
export type ResearchRegistration = {
  name:string;city:string;country:string;email:string;phone:string;source:string;facilitiesSource:string;
  adminVerification?:{confirmation:string;contactChecked:boolean;facilitiesChecked:boolean};
  hotelStay:{checkIn:string;checkOut:string;rooms:number};
};
export function canonicalHotelName(value:string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export function parseResearchRegistration(data:unknown):ResearchRegistration {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid request.");
  const v=data as Record<string,unknown>;
  const field=(k:string,max:number)=>{
    if (typeof v[k]!=="string") throw new Error(`${k} required.`);
    const text=v[k].trim(); if (!text || text.length>max) throw new Error(`Invalid ${k}.`); return text;
  };
  const name=field("name",180),city=field("city",100),country=field("country",100),email=field("email",254),phone=field("phone",60),source=field("source",1500),facilitiesSource=field("facilitiesSource",1500);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email.");
  for (const link of [source,facilitiesSource]) {
    let url:URL;
    try {url=new URL(link);} catch {throw new Error("Evidence must use valid HTTPS links.");}
    if (url.protocol!=="https:" || url.username || url.password || !url.hostname.includes(".") ||
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i.test(url.hostname)) throw new Error("Evidence must use public HTTPS links.");
  }
  const input=v.hotelStay;
  if (!input || typeof input!=="object" || Array.isArray(input)) throw new Error("Hotel stay is required.");
  const stay=input as Record<string,unknown>;
  if (typeof stay.checkIn!=="string" || typeof stay.checkOut!=="string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(stay.checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(stay.checkOut) ||
    stay.checkOut<=stay.checkIn || !Number.isInteger(stay.rooms) || (stay.rooms as number)<1 || (stay.rooms as number)>250) throw new Error("Invalid stay details.");
  const vfy=v.adminVerification;
  const adminVerification=vfy && typeof vfy==="object" && !Array.isArray(vfy)
    ? {confirmation:(vfy as Record<string,unknown>).confirmation,contactChecked:(vfy as Record<string,unknown>).contactChecked,facilitiesChecked:(vfy as Record<string,unknown>).facilitiesChecked}
    : undefined;
  return {name,city,country,email,phone,source,facilitiesSource,
    adminVerification:adminVerification && typeof adminVerification.confirmation==="string"
    && typeof adminVerification.contactChecked==="boolean" && typeof adminVerification.facilitiesChecked==="boolean"
    ? adminVerification as ResearchRegistration["adminVerification"]:undefined,hotelStay:{checkIn:stay.checkIn,checkOut:stay.checkOut,rooms:stay.rooms as number}};
}
