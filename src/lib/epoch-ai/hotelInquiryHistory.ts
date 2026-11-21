import { inquiry, nights, type Stay } from "@/lib/epoch-ai/hotelProcurement";

export type CreateInquiryInput={tourId:string;supplierId:string;stay:Stay;recipient:string;subject:string;body:string};
const mail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateHotelInquiry(value:unknown):CreateInquiryInput {
  if(!value || typeof value!=="object")throw Error("Invalid inquiry data");
  const x=value as Record<string,unknown>;
  if(typeof x.tourId!=="string"||x.tourId.length<6||typeof x.supplierId!=="string"||x.supplierId.length<6)throw Error("Tour and CRM hotel required");
  const stay=x.stay as Stay;
  if(!stay||typeof stay.city!=="string"||typeof stay.checkIn!=="string"||typeof stay.checkOut!=="string"||!Number.isInteger(stay.rooms)||typeof stay.massRoom!=="boolean"||nights(stay)<1||nights(stay)>30||stay.rooms<1||stay.rooms>250)throw Error("Valid hotel dates and room count required");
  if(typeof x.recipient!=="string"||!mail.test(x.recipient.trim())||x.recipient.length>255)throw Error("Verified recipient email required");
  if(typeof x.subject!=="string"||x.subject.trim().length<10||x.subject.length>400||/[\r\n]/.test(x.subject))throw Error("Valid email subject required");
  if(typeof x.body!=="string"||x.body.length<150||x.body.length>25000)throw Error("Valid inquiry email body required");
  if(!x.body.includes(stay.city)||!x.body.includes(String(stay.rooms)))throw Error("Draft does not match stay details");
  return {tourId:x.tourId,supplierId:x.supplierId,stay:{...stay},recipient:x.recipient.trim(),subject:x.subject.trim(),body:x.body};
}
export function sameApprovedSnapshot(old:{recipient:string;subject:string;body:string}, next:{recipient:string;subject:string;body:string}){return old.recipient===next.recipient&&old.subject===next.subject&&old.body===next.body;}
export function defaultHotelInquiry(stay:Stay,name:string){return inquiry(stay,name);}
