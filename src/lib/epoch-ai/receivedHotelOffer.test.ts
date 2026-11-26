import { describe, expect, it } from "vitest";
import { hotelOfferUploadTooLarge, maxHotelOfferFileSize, readHotelOfferResponse, validateHotelOfferAttachment } from "./receivedHotelOffer";

describe("Received offer upload", () => {
  it("rejects attachments over the application limit before uploading", () => {
    expect(() => validateHotelOfferAttachment(new File([new Uint8Array(maxHotelOfferFileSize + 1)], "offer.pdf")))
      .toThrow(hotelOfferUploadTooLarge);
    expect(() => validateHotelOfferAttachment(new File([new Uint8Array(maxHotelOfferFileSize)], "offer.PDF")))
      .not.toThrow();
  });

  it("handles plain-text platform rejections and preserves application error messages", async () => {
    await expect(readHotelOfferResponse(new Response("Request Entity Too Large", {status: 413}), "Save failed"))
      .rejects.toThrow(hotelOfferUploadTooLarge);
    await expect(readHotelOfferResponse(new Response("<html>Service unavailable</html>", {status: 502}), "Save failed"))
      .rejects.toThrow("Save failed");
    await expect(readHotelOfferResponse(Response.json({error: "Select a hotel first."}, {status: 400}), "Save failed"))
      .rejects.toThrow("Select a hotel first.");
    await expect(readHotelOfferResponse(Response.json({recorded: true}), "Save failed")).resolves.toEqual({recorded: true});
  });
});
