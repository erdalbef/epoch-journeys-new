import { describe,it,expect } from "vitest";
import { reviewSupplierSend,supplierEventKey,supplierStayEventKey,SUPPLIER_SEND_ENABLED,SUPPLIER_CC } from "./hotelSupplierSendSafety";
const valid={inquiryId:"abc123",recipient:"sales@hotel.com",supplierType:"HOTEL",supplierEmail:"sales@hotel.com",contactEmails:[],contentReady:true,approved:true,isNewest:true,outboxExists:false};
describe("hotel supplier-send Stage 3A fail-closed review",()=>{
 it("never enables sending, even when all other checks pass",()=>{const x=reviewSupplierSend(valid);expect(x.readyForActivation).toBe(true);expect(x.canSend).toBe(false);expect(SUPPLIER_SEND_ENABLED).toBe(false);expect(x.blocks).toHaveLength(1);});
 it("requires current CRM supplier email match",()=>{expect(reviewSupplierSend({...valid,recipient:"other@example.com"}).readyForActivation).toBe(false)});
 it("accepts a verified CRM contact",()=>{expect(reviewSupplierSend({...valid,recipient:"buyer@hotel.com",contactEmails:["buyer@hotel.com"]}).readyForActivation).toBe(true)});
 it("blocks unapproved inquiry",()=>{expect(reviewSupplierSend({...valid,approved:false}).readyForActivation).toBe(false)});
 it("blocks superseded inquiry",()=>{expect(reviewSupplierSend({...valid,isNewest:false}).readyForActivation).toBe(false)});
 it("blocks an existing send attempt, even if failed",()=>{expect(reviewSupplierSend({...valid,outboxExists:true}).readyForActivation).toBe(false)});
 it("enforces correct supplier type and CC",()=>{expect(reviewSupplierSend({...valid,supplierType:"BUS"}).readyForActivation).toBe(false);expect(SUPPLIER_CC).toBe("info@epochjourneys.com")});
 it("gives stable event key for idempotence",()=>{expect(supplierEventKey("foo")).toBe(supplierEventKey("foo"));expect(supplierEventKey("foo")).not.toBe(supplierEventKey("bar"))});
 it("creates one stable stay key across inquiry revisions",()=>{
  const stay={tourId:"tour1",supplierId:"hotel1",destination:"Sarajevo",checkIn:"2027-05-07",checkOut:"2027-05-08",rooms:20};
  expect(supplierStayEventKey(stay)).toBe(supplierStayEventKey({...stay,destination:" sarajevo "}));
  expect(supplierStayEventKey(stay)).not.toBe(supplierStayEventKey({...stay,checkOut:"2027-05-09"}));
 });
 it("blocks any earlier hotel-stay attempt even after a revised inquiry",()=>{
  const result=reviewSupplierSend({...valid,priorStayAttemptExists:true});
  expect(result.readyForActivation).toBe(false);
  expect(result.canSend).toBe(false);
 });
});
