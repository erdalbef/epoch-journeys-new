import { Resend } from "resend";
const RESEND_API_KEY = process.env.RESEND_API_KEY;const FROM_EMAIL = "Epoch Journeys <no-reply@epochjourneys.com>";
type Attachment={filename:string;content:Buffer|string};type SendEmailInput={to:string|string[];subject:string;html:string;attachments?:Attachment[]};
export async function sendEmail({to,subject,html,attachments}:SendEmailInput){if(!RESEND_API_KEY){console.error("Missing RESEND_API_KEY");return null}try{const resend=new Resend(RESEND_API_KEY);return await resend.emails.send({from:FROM_EMAIL,to,subject,html,attachments})}catch(err){console.error("Email send error:",err);return null}}
