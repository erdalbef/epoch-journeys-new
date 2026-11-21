import {describe,it,expect} from "vitest";
import {isAuthorizedTestDatabase,formatTestHtml,testEventKey,HOTEL_TEST_RECIPIENT} from "./hotelTestEmail";
const host="ep-red-waterfall-ai5fcms9.c-4.us-east-1.aws.neon.tech";
describe("hotel inquiry test email protections",()=>{
 it("requires both URLs to point to approved development host",()=>{
  expect(isAuthorizedTestDatabase(`postgresql://u:p@${host}/neondb`,`postgresql://u:p@${host}/neondb`)).toBe(true);
  expect(isAuthorizedTestDatabase(`postgresql://u:p@${host}/neondb`,`postgresql://u:p@production.example/neondb`)).toBe(false);
  expect(isAuthorizedTestDatabase(undefined,`postgresql://u:p@${host}/neondb`)).toBe(false);
 });
 it("hardcodes the test recipient and has deterministic deduplication",()=>{
  expect(HOTEL_TEST_RECIPIENT).toBe("erdal@epochjourneys.com");
  expect(testEventKey("abc")).toBe(testEventKey("abc"));
  expect(testEventKey("abc")).not.toBe(testEventKey("xyz"));
 });
 it("escapes the email content against HTML injection",()=>{
  const html=formatTestHtml("Hi <script>","hello <img src=x>");
  expect(html).toContain("&lt;script&gt;");expect(html).not.toContain("<script>");expect(html).not.toContain("<img src=x>");
 });
});
