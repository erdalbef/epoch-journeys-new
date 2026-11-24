/** Email presentation only. Never use for approvals or modify saved inquiry snapshots. */
const ESCAPE:Record<string,string>={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};
export function escapeHotelHtml(s:string):string{return s.replace(/[&<>"']/g,ch=>ESCAPE[ch]);}
const BRAND="#001F3F";
const LOGO="https://www.epochjourneys.com/epoch-compass-logo.png";
const signatureStart=/^\s*(Kind regards,?|Best regards,?)\s*$/i;
const signatureName=/^\s*Erdal Vardarli\s*$/i;
function normalize(text:string):string{
 // Normalize literal escape sequences left by older template serialization, and true line endings.
 return text.replace(/\r\n?/g,"\n").replace(/\\r\\n|\\n/g,"\n");
}
function stripExistingSignature(lines:string[]):string[]{
 const signIdx=lines.findIndex(s=>signatureStart.test(s));
 if(signIdx!==-1)return lines.slice(0,signIdx);
 const nameIdx=lines.findIndex(s=>signatureName.test(s));
 return nameIdx===-1?lines:lines.slice(0,nameIdx);
}
function paragraph(s:string):string{return `<p style="margin:0 0 15px;line-height:1.7">${escapeHotelHtml(s)}</p>`;}
function renderBody(content:string):string{
 const lines=stripExistingSignature(normalize(content).split("\n")).map(s=>s.trim());
 const parts:string[]=[];let inList=false;
 const closeList=()=>{if(inList){parts.push('</ul>');inList=false;}};
 for(const s of lines){
  if(!s){closeList();continue;}
  if(/^[-•]\s+/.test(s)){
   if(!inList){parts.push('<ul style="margin:0 0 18px;padding-left:23px;line-height:1.65">');inList=true;}
   parts.push(`<li style="margin:0 0 6px">${escapeHotelHtml(s.replace(/^[-•]\s+/,""))}</li>`);
  }else{
   closeList();
   const heading=/^(Accommodation Details|Please itemize these additional charges separately from the BB room rate:)$/i.test(s);
   parts.push(heading?`<p style="margin:22px 0 10px;font-weight:700;color:${BRAND}">${escapeHotelHtml(s)}</p>`:paragraph(s));
  }
 }
 closeList();return parts.join("\n");
}
export function formatHotelInquiryEmail(subject:string,content:string,isTest:boolean):{html:string;text:string}{
 const cleanSubject=subject.replace(/^TEST\s*[–-]\s*/i,"");
 const lines=stripExistingSignature(normalize(content).split("\n"));
 const body=lines.join("\n").trim();
 const signaturePlain="Kind regards,\n\nErdal Vardarli\nManaging Director | Epoch Journeys\n+90 555 985 4924\nerdal@epochjourneys.com\nwww.epochjourneys.com\nThoughtfully Planned. Faithfully Delivered.";
 const testLabel=isTest?'<p style="font-weight:700;color:#9B4200;margin:0 0 22px">INTERNAL TEST ONLY — NOT SENT TO THE HOTEL</p>':"";
 const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#203246"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:680px;margin:0 auto;background:#ffffff;border-collapse:collapse"><tr><td style="background:${BRAND};padding:20px 26px;color:#fff"><span style="font-size:18px;font-weight:700">Epoch Journeys</span><span style="display:block;margin-top:5px;font-size:12px;color:#dbe4ef">Thoughtfully Planned. Faithfully Delivered.</span></td></tr><tr><td style="padding:26px 28px;font-size:14px">${testLabel}<p style="font-size:16px;font-weight:700;color:${BRAND};margin:0 0 20px">${escapeHotelHtml(cleanSubject)}</p>${renderBody(content)}<p style="margin:22px 0 15px">Kind regards,</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #b9c7d6;margin-top:9px;border-collapse:collapse"><tr><td width="76" valign="top" style="padding:12px 10px 0 0;width:76px"><img src="${LOGO}" alt="Epoch Journeys logo" width="66" style="display:block;width:66px;max-width:66px;height:auto;border:0"></td><td valign="top" style="padding:12px 0 0 10px;border-left:1px solid #dce3eb;font-size:13px;line-height:1.4"><strong style="font-size:15px;color:${BRAND}">Erdal Vardarli</strong><div style="margin-top:2px;color:#455468">Managing Director | Epoch Journeys</div><div style="margin-top:6px"><a href="tel:+905559854924" style="color:${BRAND};text-decoration:none">+90 555 985 4924</a><br><a href="mailto:erdal@epochjourneys.com" style="color:${BRAND};text-decoration:none">erdal@epochjourneys.com</a><br><a href="https://www.epochjourneys.com" style="color:${BRAND};text-decoration:none">www.epochjourneys.com</a></div><div style="margin-top:5px;color:#50657c;font-style:italic;font-size:11px">Thoughtfully Planned. Faithfully Delivered.</div></td></tr></table></td></tr></table></body></html>`;
 const text=`${isTest?"INTERNAL TEST ONLY — NOT SENT TO THE HOTEL\n\n":""}${cleanSubject}\n\n${body}\n\n${signaturePlain}`;
 return {html,text};
}
