import { describe,it,expect } from "vitest";
import { reviewSupplierSend,supplierEventKey,supplierStayEventKey,SUPPLIER_SEND_ENABLED,SUPPLIER_CC } from "./hotelSupplierSendSafety";
const valid={inquiryId:"abc123",recipient:"sales@hotel.com",supplierType:"HOTEL",supplierEmail:"sales@hotel.com",contactEmails:[],contentReady:true,isNewest:true,outboxExists:false};
describe("hotel supplier-send Stage 3A fail-closed review",()=>{
 it("never enables sending, even when all other checks pass",()=>{const x=reviewSupplierSend(valid);expect(x.readyForActivation).toBe(true);expect(x.canSend).toBe(false);expect(SUPPLIER_SEND_ENABLED).toBe(false);expect(x.blocks).toHaveLength(1);});
 it("requires current CRM supplier email match",()=>{expect(reviewSupplierSend({...valid,recipient:"other@example.com"}).readyForActivation).toBe(false)});
 it("accepts a verified CRM contact",()=>{expect(reviewSupplierSend({...valid,recipient:"buyer@hotel.com",contactEmails:["buyer@hotel.com"]}).readyForActivation).toBe(true)});
 it("blocks superseded inquiry",()=>{expect(reviewSupplierSend({...valid,isNewest:false}).readyForActivation).toBe(false)});
 it("blocks an existing send attempt, even if failed",()=>{expect(reviewSupplierSend({...valid,outboxExists:true}).readyForActivation).toBe(false)});
 it("blocks attempts already recorded under older versions for the same stay",()=>{const x=reviewSupplierSend({...valid,priorStayAttemptExists:true});expect(x.readyForActivation).toBe(false);expect(x.blocks.some(b=>b.includes("another inquiry version"))).toBe(true)});
 it("enforces correct supplier type and CC",()=>{expect(reviewSupplierSend({...valid,supplierType:"BUS"}).readyForActivation).toBe(false);expect(SUPPLIER_CC).toBe("info@epochjourneys.com")});
 it("uses same atomic stay claim for revised inquiries",()=>{
  const stay={tourId:"tour1",supplierId:"hotel1",destination:"Sarajevo",checkIn:"2027-05-07",checkOut:"2027-05-08",rooms:20};
  expect(supplierStayEventKey(stay)).toBe(supplierStayEventKey({...stay,destination:" sarajevo "}));
  expect(supplierStayEventKey(stay)).not.toBe(supplierStayEventKey({...stay,checkIn:"2027-05-08"}));
  expect(supplierStayEventKey(stay)).not.toBe(supplierStayEventKey({...stay,supplierId:"hotel2"}));
  expect(supplierStayEventKey(stay)).not.toBe(supplierStayEventKey({...stay,tourId:"tour2"}));
  expect(supplierStayEventKey(stay)).not.toBe(supplierStayEventKey({...stay,rooms:25}));
  expect(supplierStayEventKey(stay)).toMatch(/^supplier:hotel-inquiry:stay:[0-9a-f]{64}:v1$/);
  expect(SUPPLIER_SEND_ENABLED).toBe(false);
 });
 it("gives stable event key for idempotence",()=>{expect(supplierEventKey("foo")).toBe(supplierEventKey("foo"));expect(supplierEventKey("foo")).not.toBe(supplierEventKey("bar"))});
});
