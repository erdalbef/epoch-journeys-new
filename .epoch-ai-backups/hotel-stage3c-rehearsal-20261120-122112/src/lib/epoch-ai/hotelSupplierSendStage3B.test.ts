import { describe,it,expect } from "vitest";
import { SUPPLIER_SEND_ENABLED, SUPPLIER_CC, supplierEventKey, supplierSendSnapshot,supplierMessageFingerprint,validateSupplierSendConfirmation,reviewSupplierSend } from "./hotelSupplierSendSafety";
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
