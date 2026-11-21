import {describe,it,expect} from "vitest";
import {HOTEL_TEST_RECIPIENT,HOTEL_TEST_CC,HOTEL_SUPPLIER_CC,testOutboxSnapshot} from "./hotelTestEmail";
describe("Epoch internal hotel test CC policy",()=>{
 it("hardcodes exactly the two authorized Epoch addresses",()=>{
  expect(HOTEL_TEST_RECIPIENT).toBe("erdal@epochjourneys.com");
  expect(HOTEL_TEST_CC).toBe("info@epochjourneys.com");
  expect(HOTEL_SUPPLIER_CC).toBe(HOTEL_TEST_CC);
  expect(HOTEL_TEST_CC).not.toBe(HOTEL_TEST_RECIPIENT);
 });
 it("retains immutable To, CC, exact message and internal-only classification in outbox body",()=>{
  const record=JSON.parse(testOutboxSnapshot({inquiryId:"test-123",to:HOTEL_TEST_RECIPIENT,cc:HOTEL_TEST_CC,subject:"TEST subject",html:"<p>Test</p>",text:"Test"}));
  expect(record).toEqual({schema:"epoch-hotel-test-v1",supplierSent:false,inquiryId:"test-123",to:HOTEL_TEST_RECIPIENT,cc:HOTEL_TEST_CC,subject:"TEST subject",html:"<p>Test</p>",text:"Test"});
 });
});
