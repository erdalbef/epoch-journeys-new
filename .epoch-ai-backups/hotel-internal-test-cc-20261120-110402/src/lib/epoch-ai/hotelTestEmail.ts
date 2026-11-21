/** Server-only decision helpers. No email delivery and no DB mutation here. */
export const HOTEL_TEST_RECIPIENT="erdal@epochjourneys.com" as const;
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
