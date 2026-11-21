import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";

const ADMIN_EMAIL = process.env.EPOCH_ADMIN_NOTIFY_EMAIL || "erdal@epochjourneys.com";
export function supportAdminEmail() { return ADMIN_EMAIL; }
export function escapeHtml(s:string) { return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c)); }
export async function createAdminAlert(eventKey:string,title:string,description:string,href:string){
  try {
    await db.$executeRaw`INSERT INTO "EpochAdminAlert" ("id","eventKey","title","description","href","createdAt") VALUES (${randomUUID()},${eventKey},${title},${description},${href},NOW()) ON CONFLICT ("eventKey") DO NOTHING`;
    return true;
  } catch(e){ console.error("Admin alert could not be persisted",e); return false; }
}
export async function notifyEmail(to:string,subject:string,body:string,url:string){
  try {
    const result = await sendEmail({to,subject,html:`<p>${escapeHtml(body)}</p><p><a href="${escapeHtml(url)}">Open in Epoch Journeys</a></p>`});
    return !!result && !("error" in result && result.error) && !!("data" in result && result.data?.id);
  } catch(e){ console.error("Support email delivery error",e);return false; }
}
export function absoluteAdminUrl(path:string){
  const raw=process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  try { const u=new URL(raw); if(!["https:","http:"].includes(u.protocol))return "";return new URL(path,u).toString(); }catch{return "";}
}
