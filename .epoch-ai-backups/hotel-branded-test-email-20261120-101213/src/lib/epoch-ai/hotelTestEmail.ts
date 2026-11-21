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
export function formatTestHtml(subject:string,body:string):string{
 const escape=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
 return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:700px;margin:auto;color:#152b42"><div style="background:#002b50;color:white;padding:18px 22px"><strong>Epoch Journeys — INTERNAL TEST EMAIL</strong></div><div style="padding:22px"><p style="color:#a34e00;font-weight:bold">TEST ONLY — NOT SENT TO THE HOTEL</p><p><strong>${escape(subject)}</strong></p><div style="white-space:pre-wrap;font-size:14px;line-height:1.6">${escape(body)}</div></div></div>`;
}
export function testEventKey(inquiryId:string):string{return `test:hotel-inquiry:${inquiryId}:erdal`;}
