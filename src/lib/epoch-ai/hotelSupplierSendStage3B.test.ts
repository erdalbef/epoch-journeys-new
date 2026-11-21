import { describe,it,expect } from "vitest";
import { SUPPLIER_SEND_ENABLED, SUPPLIER_CC, supplierEventKey, supplierSendSnapshot,supplierMessageFingerprint,validateSupplierSendConfirmation,reviewSupplierSend, supplierDeliveryState } from "./hotelSupplierSendSafety";
describe("Stage 3B controlled supplier send",()=>{
 const approved={inquiryId:"inq-1",to:"sales@courtyardsarajevo.com",cc:"info@epochjourneys.com",subject:"Group Accommodation Request – 7–8 May 2027 | Epoch Journeys",fingerprint:"a".repeat(64)};
 it("is hard locked pending separately approved activation",()=>{expect(SUPPLIER_SEND_ENABLED).toBe(false)});
 it("requires exact confirmation and frozen recipient details",()=>{
  expect(validateSupplierSendConfirmation({...approved,confirmation:"SEND SUPPLIER"},approved)).toBe(true);
  expect(validateSupplierSendConfirmation({...approved,confirmation:"SEND TEST"},approved)).toBe(false);
  expect(validateSupplierSendConfirmation({...approved,to:"other@example.com",confirmation:"SEND SUPPLIER"},approved)).toBe(false);
 });
 it("binds confirmation to exact rendered content",()=>{
  const item={inquiryId:"x",supplierId:"s",to:approved.to,cc:approved.cc,subject:approved.subject,html:"<p>Hello</p>",text:"Hello"};
  expect(supplierMessageFingerprint(item)).toBe(supplierMessageFingerprint(item));
  expect(supplierMessageFingerprint({...item,html:"<p>Changed</p>"})).not.toBe(supplierMessageFingerprint(item));
  expect(validateSupplierSendConfirmation({...approved,confirmation:"SEND SUPPLIER",fingerprint:"wrong"},approved)).toBe(false);
 });
 it("uses a stable unique key per inquiry",()=>{expect(supplierEventKey("abc")).toBe(supplierEventKey("abc"));expect(supplierEventKey("abc")).not.toBe(supplierEventKey("xyz"))});
 it("records immutable To/CC and message snapshot",()=>{const snap=JSON.parse(supplierSendSnapshot({inquiryId:"a",supplierId:"s",to:approved.to,cc:SUPPLIER_CC,subject:approved.subject,html:"<p>hello</p>",text:"hello"}));expect(snap.cc).toBe("info@epochjourneys.com");expect(snap.supplierSentAttempted).toBe(true)});
 it("rejects unknown CRM recipient or prior send attempt",()=>{
  const core={inquiryId:"abc",recipient:approved.to,supplierType:"HOTEL",supplierEmail:"sales@courtyardsarajevo.com",contactEmails:[],contentReady:true,isNewest:true,outboxExists:false};
  expect(reviewSupplierSend(core).readyForActivation).toBe(true);
  expect(reviewSupplierSend({...core,outboxExists:true}).readyForActivation).toBe(false);
  expect(reviewSupplierSend({...core,supplierEmail:"other@example.com"}).readyForActivation).toBe(false);
 });
});

import { validateSupplierAuthorizationRehearsal } from "./hotelSupplierSendSafety";

describe("Stage 3C no-send authorization rehearsal",()=>{
 const expected={inquiryId:"inquiry-7",to:"reservations@example.com",cc:"info@epochjourneys.com",subject:"Hotel request",fingerprint:"abc123"};
 it("requires exact no-send confirmation",()=>{
  expect(validateSupplierAuthorizationRehearsal({mode:"VALIDATE_ONLY",confirmation:"VALIDATE ONLY",...expected},expected)).toBe(true);
  expect(validateSupplierAuthorizationRehearsal({mode:"SEND",confirmation:"VALIDATE ONLY",...expected},expected)).toBe(false);
  expect(validateSupplierAuthorizationRehearsal({mode:"VALIDATE_ONLY",confirmation:"SEND SUPPLIER",...expected},expected)).toBe(false);
 });
 it("rejects changed rendered content and recipients",()=>{
  expect(validateSupplierAuthorizationRehearsal({mode:"VALIDATE_ONLY",confirmation:"VALIDATE ONLY",...expected,fingerprint:"different"},expected)).toBe(false);
  expect(validateSupplierAuthorizationRehearsal({mode:"VALIDATE_ONLY",confirmation:"VALIDATE ONLY",...expected,to:"other@example.com"},expected)).toBe(false);
  expect(validateSupplierAuthorizationRehearsal(null,expected)).toBe(false);
 });
});


describe("Stage 3C read-only delivery classification",()=>{
 it("never mistakes provider acceptance for delivery",()=>{
  const state=supplierDeliveryState({status:"ACCEPTED",providerMessageId:"provider-1"});
  expect(state.code).toBe("PROVIDER_ACCEPTED");expect(state.delivered).toBe(false);
 });
 it("preserves non-attempt status",()=>{expect(supplierDeliveryState(null).code).toBe("NOT_ATTEMPTED")});
 it("treats uncertain and failed attempts as manual investigation",()=>{
  expect(supplierDeliveryState({status:"SENDING"}).requiresInvestigation).toBe(true);
  expect(supplierDeliveryState({status:"UNCERTAIN"}).requiresInvestigation).toBe(true);
  expect(supplierDeliveryState({status:"FAILED"}).requiresInvestigation).toBe(true);
 });
 it("requires explicit provider evidence before delivered status is set",()=>{
  expect(supplierDeliveryState({status:"DELIVERED"}).code).toBe("DELIVERED_REPORTED");
 });
});
