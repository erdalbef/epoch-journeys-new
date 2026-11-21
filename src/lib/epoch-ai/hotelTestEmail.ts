/** Server-only decision helpers. No email delivery and no DB mutation here. */
export const HOTEL_TEST_RECIPIENT="erdal@epochjourneys.com" as const;
/** Every supplier email will eventually use this CC; live supplier sending remains disabled. */
export const HOTEL_SUPPLIER_CC="info@epochjourneys.com" as const;
export const HOTEL_TEST_CC=HOTEL_SUPPLIER_CC;
export const HOTEL_TEST_DEV_HOST="ep-red-waterfall-ai5fcms9.c-4.us-east-1.aws.neon.tech" as const;
export function isAuthorizedTestDatabase(dbUrl: string|undefined,directUrl: string|undefined):boolean{
 try{
  if(!dbUrl||!directUrl)return false;
  const first=new URL(dbUrl),second=new URL(directUrl);
  return [first,second].every(u=>(u.protocol==="postgres:"||u.protocol==="postgresql:")&&u.hostname===HOTEL_TEST_DEV_HOST&&u.pathname.replace(/^\//,"")!=="");
 }catch{return false;}
}
import { formatHotelInquiryEmail } from "@/lib/epoch-ai/hotelInquiryEmailFormat";
export function formatTestHtml(subject:string,body:string):string{
 return formatHotelInquiryEmail(subject,body,true).html;
}
export function testEventKey(inquiryId:string):string{return `test:hotel-inquiry:${inquiryId}:erdal`;}

/** Immutable recipient/content snapshot for this hotel's internal TEST outbox record.
 * Stored in the existing body field because the outbox currently has no CC column.
 * It must not be parsed as an ordinary email body by other workflows. */
export function testOutboxSnapshot(input:{inquiryId:string;to:string;cc:string;subject:string;html:string;text:string}):string{
 return JSON.stringify({schema:"epoch-hotel-test-v1",supplierSent:false,...input});
}
