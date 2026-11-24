import {describe,it,expect} from "vitest";
import {inquiry,balkanStays} from "./hotelProcurement";
import {formatHotelInquiryEmail} from "./hotelInquiryEmailFormat";

describe("Hotel BB room rate and separately itemized charges",()=>{
 it("uses the approved concise master rate request and itemized supplements",()=>{
  const draft=inquiry(balkanStays[0],"Courtyard by Marriott Sarajevo");
  expect(draft.errors).toHaveLength(0);
  expect(draft.body).toContain("Please advise your availability for the requested dates and provide your best group rates for Double/Twin and Single rooms, including the Single Supplement where applicable.");
  expect(draft.body).toContain("Double/Twin and Single; Triple rooms subject to request");
  expect(draft.body).toContain("- Hotel: Courtyard by Marriott Sarajevo");
  expect(draft.body).not.toContain("Please quote your best group room rates");
  expect(draft.body).toContain("additional charges separately from the BB room rate");
  expect(draft.body).toContain("Half-board supplement (HB)");
  expect(draft.body).toContain("Dinner beverage package supplement: 2 glasses");
  expect(draft.body).toContain("City tax, if applicable");
  expect(draft.body).toContain("Porterage charges, if available");
  expect(draft.body).not.toContain("per person per dinner");
  expect(draft.body).not.toContain("specifying whether per bag or per person");
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
  expect((rendered.text.match(/Erdal Vardarli/g)||[]).length).toBe(1);
 });
 it("retains the Kotor Mass meeting-room request",()=>{
  expect(inquiry(balkanStays[1],"Hotel").body).toContain("private meeting room");
 });
});
