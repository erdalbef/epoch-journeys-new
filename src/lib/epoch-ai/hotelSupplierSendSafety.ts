import { createHash } from "node:crypto";
/** Supplier send safety: stage 3B is PREPARED but intentionally LOCKED. */
import { HOTEL_SUPPLIER_CC } from "./hotelTestEmail";
export const SUPPLIER_SEND_ENABLED = false as boolean;
export const SUPPLIER_CC = HOTEL_SUPPLIER_CC;
export function supplierEventKey(inquiryId:string){return `supplier:hotel-inquiry:${inquiryId}:v1`;}
/** Unique across revised inquiry records for one hotel on one tour stay.
 * Existing EpochEmailOutbox.eventKey UNIQUE constraint serializes concurrent attempts.
 * No sending is enabled by this helper.
 */
export function supplierStayEventKey(stay:{tourId:string;supplierId:string;destination:string;checkIn:string;checkOut:string;rooms:number}):string{
 const normalized=JSON.stringify([stay.tourId,stay.supplierId,stay.destination.trim().toLowerCase(),stay.checkIn,stay.checkOut,stay.rooms]);
 return `supplier:hotel-inquiry:stay:${createHash("sha256").update(normalized).digest("hex")}:v1`;
}

const emailPattern=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function reviewSupplierSend(input:{inquiryId:string;recipient:string;supplierType:string;supplierEmail:string|null;contactEmails:string[];contentReady:boolean;isNewest:boolean;outboxExists:boolean;priorStayAttemptExists?:boolean}){
 const blocks:string[]=[];const checks:string[]=[];
 const recipient=input.recipient.trim().toLowerCase();
 const permitted=[input.supplierEmail,...input.contactEmails].filter((e):e is string=>typeof e==="string"&&!!e.trim()).map(e=>e.trim().toLowerCase());
 if(input.supplierType!=="HOTEL")blocks.push("Selected CRM record is not a hotel.");else checks.push("Hotel supplier linked to the approved inquiry.");
 if(!emailPattern.test(recipient)||input.recipient!==input.recipient.trim())blocks.push("Recipient email is invalid.");
 else if(!permitted.includes(recipient))blocks.push("Approved inquiry recipient is not a current email address in this supplier's CRM record.");
 else checks.push("Recipient matches an address currently stored in Supplier CRM.");
 if(!input.contentReady)blocks.push("Approved inquiry failed the saved-content readiness checks.");else checks.push("Approved inquiry content passes readiness review.");
 if(!input.isNewest)blocks.push("This inquiry was superseded by a newer record for the same hotel stay.");else checks.push("Inquiry is the most recent record for this hotel stay.");
 if(input.outboxExists)blocks.push("A supplier send attempt is already recorded for this inquiry; manual investigation is required before any further action.");else checks.push("No supplier-email attempt is recorded under this inquiry's unique outbox key.");
 if(input.priorStayAttemptExists)blocks.push("A supplier send attempt already exists for this hotel, tour, dates and room count on another inquiry version. Review existing correspondence; do not send again.");else checks.push("No prior supplier send attempt recorded for this hotel stay on another inquiry version.");
 checks.push(`Required CC: ${SUPPLIER_CC}`);
 blocks.push("Stage 3B safety lock: live supplier delivery is not yet enabled.");
 return {readyForActivation:blocks.length===1,canSend:false as const,checks,blocks,cc:SUPPLIER_CC};
}
/** Preview fingerprint binds the explicit Admin confirmation to exactly the rendered content. */
export function supplierMessageFingerprint(input:{inquiryId:string;supplierId:string;to:string;cc:string;subject:string;html:string;text:string}):string{
 return createHash("sha256").update(supplierSendSnapshot(input)).digest("hex");
}
type SendConfirmation={confirmation:string;inquiryId:string;to:string;cc:string;subject:string;fingerprint:string};
export function validateSupplierSendConfirmation(value:unknown,expected:Omit<SendConfirmation,"confirmation">):boolean{
 if(!value||typeof value!=="object")return false;
 const v=value as Partial<SendConfirmation>;
 return v.confirmation==="SEND SUPPLIER"&&v.inquiryId===expected.inquiryId&&v.to===expected.to&&v.cc===expected.cc&&v.subject===expected.subject&&v.fingerprint===expected.fingerprint;
}
export function supplierSendSnapshot(input:{inquiryId:string;supplierId:string;to:string;cc:string;subject:string;html:string;text:string;authorizedBy?:string;authorizedAt?:string;fingerprint?:string}):string{
 return JSON.stringify({schema:"epoch-hotel-supplier-email-v1",test:false,supplierSentAttempted:true,...input});
}

/** No-send rehearsal. Never grants sending permission; checks a fresh preview token. */
export function validateSupplierAuthorizationRehearsal(value:unknown,expected:{inquiryId:string;to:string;cc:string;subject:string;fingerprint:string}):boolean{
 if(!value || typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.mode==="VALIDATE_ONLY" && v.confirmation==="VALIDATE ONLY" &&
   v.inquiryId===expected.inquiryId && v.to===expected.to && v.cc===expected.cc &&
   v.subject===expected.subject && v.fingerprint===expected.fingerprint;
}

/** Read-only delivery state: a provider's acceptance is not inbox delivery. No retries. */
export function supplierDeliveryState(outbox:null|{
 status:string;providerMessageId?:string|null;acceptedAt?:Date|string|null;
 lastAttemptAt?:Date|string|null;lastError?:string|null
}){
 if(!outbox)return {code:"NOT_ATTEMPTED",label:"No supplier send attempt recorded",delivered:false,requiresInvestigation:false};
 const status=outbox.status.toUpperCase();
 if(status==="DELIVERED")return {code:"DELIVERED_REPORTED",label:"Delivery reported by provider (requires verified webhook evidence)",delivered:true,requiresInvestigation:false};
 if(status==="ACCEPTED")return {code:"PROVIDER_ACCEPTED",label:"Accepted by email provider; delivery not confirmed",delivered:false,requiresInvestigation:false};
 if(status==="FAILED")return {code:"FAILED",label:"Failed; manual investigation required before any new attempt",delivered:false,requiresInvestigation:true};
 if(status==="BOUNCED"||status==="COMPLAINED")return {code:"DELIVERY_PROBLEM",label:"Delivery problem reported; manual investigation required",delivered:false,requiresInvestigation:true};
 return {code:"UNCERTAIN",label:"Send outcome pending or uncertain; DO NOT retry automatically",delivered:false,requiresInvestigation:true};
}


/**
 * Supplier delivery evidence comes from signed Resend webhook events.
 * Provider acceptance alone never proves delivery.
 * A bounce or complaint takes precedence over delivery notifications.
 */
export function supplierDeliveryStateWithEvents(
  outbox: Parameters<typeof supplierDeliveryState>[0],
  events: ReadonlyArray<{type:string;occurredAt:Date|string}>
) {
  const types = new Set(events.map(e => e.type));

  if (types.has("email.bounced") || types.has("email.complained")) {
    return {
      code:"DELIVERY_PROBLEM",
      label:types.has("email.complained")
        ? "Complaint reported — manual investigation required"
        : "Bounced — manual investigation required",
      delivered:false,
      requiresInvestigation:true
    };
  }

  if (types.has("email.delivered")) {
    return {
      code:"DELIVERED_REPORTED",
      label:"Delivery reported by provider",
      delivered:true,
      requiresInvestigation:false
    };
  }

  if (types.has("email.delivery_delayed")) {
    return {
      code:"DELIVERY_DELAYED",
      label:"Delivery delayed — monitor; do not resend automatically",
      delivered:false,
      requiresInvestigation:true
    };
  }

  return supplierDeliveryState(outbox);
}