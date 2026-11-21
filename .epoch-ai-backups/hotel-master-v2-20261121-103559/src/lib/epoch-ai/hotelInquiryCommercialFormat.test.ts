import {describe,it,expect} from "vitest";
import {inquiry,balkanStays} from "./hotelProcurement";
import {formatHotelInquiryEmail} from "./hotelInquiryEmailFormat";

describe("Hotel BB room rate and separately itemized charges",()=>{
 it("asks for BB room rates and itemized supplements rather than including all in room rate",()=>{
  const draft=inquiry(balkanStays[0],"Courtyard by Marriott Sarajevo");
  expect(draft.errors).toHaveLength(0);
  expect(draft.body).toContain("room rates for Double/Twin and Single rooms, including breakfast (BB)");
  expect(draft.body).toContain("additional charges separately from the BB room rate");
  expect(draft.body).toContain("Half-board supplement (HB), per person per dinner");
  expect(draft.body).toContain("Dinner beverage package supplement, per person per dinner");
  expect(draft.body).toContain("City tax, if applicable, per person per night");
  expect(draft.body).toContain("Porterage charges, if available");
 });
 it("formats the itemization heading and keeps real lists and official logo",()=>{
  const draft=inquiry(balkanStays[0],"Courtyard");
  const rendered=formatHotelInquiryEmail(draft.subject,draft.body,true);
  expect(rendered.html).toContain('font-weight:700;color:#001F3F');
  expect(rendered.html).toContain('<li');
  expect(rendered.html).toContain('width="66"');
  expect(rendered.html).toContain('epoch-compass-logo.png');
  expect(rendered.text).toContain("additional charges separately");
  expect(rendered.html).toContain("INTERNAL TEST ONLY");
 });
 it("retains the Kotor Mass meeting-room request",()=>{
  expect(inquiry(balkanStays[1],"Hotel").body).toContain("private meeting room");
 });
});
