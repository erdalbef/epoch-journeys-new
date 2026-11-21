/** Pure, conservative gate. Does NOT send or change any record. */
export type InquirySnapshot={id:string;status:string;recipient:string;subject:string;body:string;destination:string;checkIn:string;checkOut:string;rooms:number;approvedAt:Date|null;approvedBy:string|null};
const validEmail=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function evaluateHotelSendReadiness(x:InquirySnapshot){
 const checks:string[]=[]; const blocks:string[]=[];
 if(x.status!=="APPROVED" || !x.approvedAt || !x.approvedBy) blocks.push("Inquiry must have an approved, frozen snapshot.");
 else checks.push("Approved inquiry record found.");
 if(!validEmail.test(x.recipient.trim()) || x.recipient!==x.recipient.trim()) blocks.push("Recipient address is invalid or contains extra whitespace.");
 else checks.push("Recipient address has valid syntax (not independently verified).");
 if(!x.subject || /[\r\n]/.test(x.subject)) blocks.push("Subject contains invalid characters.");
 const ambiguous=(x.subject+"\n"+x.body).match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
 if(ambiguous) blocks.push(`Ambiguous numeric date '${ambiguous[0]}' exists in the SAVED ${x.subject.includes(ambiguous[0])?"subject":"body"}. Make a new draft with written month names.`);
 const placeholder=x.body.match(/\[(?:Insert|Actual|Name|Signature|Your|Official|Hotel|Check-in|Check-out)[^\]]*\]/i);
 if(placeholder) blocks.push(`Unreplaced placeholder in SAVED body: ${placeholder[0].slice(0,120)}. A corrected, newly approved draft is required.`);
 if(!x.body.includes(x.destination) || !x.body.includes(String(x.rooms))) blocks.push("Destination or room count is missing from message body.");
 if(!x.body.toLowerCase().includes("breakfast") || !x.body.toLowerCase().includes("half-board")) blocks.push("Master inquiry BB/HB details are missing.");
 const date=/^\d{4}-\d{2}-\d{2}$/;
 if(!date.test(x.checkIn)||!date.test(x.checkOut)||Date.parse(x.checkOut+"T00:00:00Z")<=Date.parse(x.checkIn+"T00:00:00Z")) blocks.push("Stay dates are invalid.");
 const longDate=(iso:string)=>/^\d{4}-\d{2}-\d{2}$/.test(iso)?new Date(iso+"T00:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}):"";
 for(const [label,iso] of [["Check-in",x.checkIn],["Check-out",x.checkOut]] as const){
  const human=longDate(iso);
  if(human && !x.body.includes(human)) blocks.push(`${label} ${iso} does not match the saved message body; expected '${human}'.`);
 }
 if(x.body.length<150 || x.body.length>25000) blocks.push("Message length is outside accepted limits.");
 if(!blocks.length)checks.push("Required content, dates, and signature placeholder checks passed.");
 checks.push("Supplier email delivery is disabled in this stage; a passing review does NOT authorize sending.");
 return {ready:blocks.length===0,checks,blocks,sendEnabled:false as const};
}
