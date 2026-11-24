import { describe,it,expect } from "vitest";
import {formatHotelInquiryEmail,escapeHotelHtml} from "./hotelInquiryEmailFormat";
const body=`Dear Reservations Team,\n\nGreetings from Epoch Journeys.\n\nAccommodation Details\n- Destination: Sarajevo\n- Check-in: 7 May 2027\n- Check-out: 8 May 2027\n- Rooms requested: 20 rooms\n\nPlease include the following in your quotation:\n- Room rates with breakfast included (BB)\n- Half-board supplement (HB)\n\nThank you for your assistance.\n\nKind regards,\nErdal Vardarli\nManaging Director | Epoch Journeys`;
describe("Hotel inquiry email layout",()=>{
 it("builds readable paragraphs and real list elements",()=>{const x=formatHotelInquiryEmail("TEST – Group Accommodation Request",body,true);expect(x.html).toContain('<ul');expect(x.html).toContain('<li');expect(x.html).toContain('margin:0 0 15px');expect(x.text).toContain('Check-in: 7 May 2027');});
 it("uses a single branded signature and the public logo path",()=>{const x=formatHotelInquiryEmail("TEST – Group Accommodation Request",body,true);expect(x.html).toContain('epoch-compass-logo.png');expect(x.html).toContain('Thoughtfully Planned. Faithfully Delivered.');expect((x.html.match(/Managing Director \| Epoch Journeys/g)||[]).length).toBe(1);});
 it("retains strict internal-only banner",()=>{const x=formatHotelInquiryEmail("TEST – Inquiry",body,true);expect(x.html).toContain('INTERNAL TEST ONLY');expect(x.text).toContain('INTERNAL TEST ONLY');});
 it("escapes arbitrary external inquiry content",()=>{expect(escapeHotelHtml('<script>\"&')).toBe('&lt;script&gt;&quot;&amp;');expect(formatHotelInquiryEmail('Hello',body+'\n<script>',false).html).not.toContain('<script>');});
 it("adds plain-text signature and does not duplicate old one",()=>{const x=formatHotelInquiryEmail('Test',body,true);expect(x.text.match(/Erdal Vardarli/g)?.length).toBe(1);});
});
