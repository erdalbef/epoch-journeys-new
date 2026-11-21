/** Stage 3A: supplier delivery is deliberately unavailable. Pure guards only. */
import { HOTEL_SUPPLIER_CC } from "./hotelTestEmail";
export const SUPPLIER_SEND_ENABLED = false as const;
export const SUPPLIER_CC = HOTEL_SUPPLIER_CC;
export function supplierEventKey(inquiryId:string){return `supplier:hotel-inquiry:${inquiryId}:v1`;}
const emailPattern=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function reviewSupplierSend(input:{inquiryId:string;recipient:string;supplierType:string;supplierEmail:string|null;contactEmails:string[];contentReady:boolean;isNewest:boolean;outboxExists:boolean}){
 const blocks:string[]=[];
 const checks:string[]=[];
 const recipient=input.recipient.trim().toLowerCase();
 const permitted=[input.supplierEmail,...input.contactEmails].filter((e):e is string=>typeof e==="string"&&!!e.trim()).map(e=>e.trim().toLowerCase());
 if(input.supplierType!=="HOTEL")blocks.push("Selected CRM record is not a hotel.");
 else checks.push("Hotel supplier linked to the approved inquiry.");
 if(!emailPattern.test(recipient)||input.recipient!==input.recipient.trim())blocks.push("Recipient email is invalid.");
 else if(!permitted.includes(recipient))blocks.push("Approved inquiry recipient is not a current email address in this supplier's CRM record. Review the CRM contact before any sending.");
 else checks.push("Recipient matches an address currently stored in Supplier CRM.");
 if(!input.contentReady)blocks.push("Approved inquiry failed the saved-content readiness checks.");
 else checks.push("Approved inquiry content passes readiness review.");
 if(!input.isNewest)blocks.push("This inquiry was superseded by a newer record for the same hotel stay.");
 else checks.push("Inquiry is the most recent record for this hotel stay.");
 if(input.outboxExists)blocks.push("An outgoing supplier-email attempt is already recorded for this inquiry; automatic retry is prohibited.");
 else checks.push("No supplier-email attempt is recorded under this inquiry's unique outbox key.");
 checks.push(`Required CC: ${SUPPLIER_CC}`);
 blocks.push("Stage 3A safety lock: supplier email delivery is disabled, regardless of readiness or user confirmation.");
 return {readyForActivation:blocks.length===1,canSend:false as const,checks,blocks,cc:SUPPLIER_CC};
}
