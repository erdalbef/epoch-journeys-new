import { describe, expect, it } from "vitest";
import {
  isPublicIPv4,
  validateHotelPageUrl
} from "./hotelSecurePageFetch";

describe("Secure hotel webpage retrieval", () => {
  it("rejects private and reserved IPv4 addresses", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "192.0.2.1",
      "198.51.100.1",
      "203.0.113.1"
    ]) {
      expect(isPublicIPv4(address)).toBe(false);
    }
  });

  it("recognizes ordinary public IPv4 addresses", () => {
    expect(isPublicIPv4("8.8.8.8")).toBe(true);
    expect(isPublicIPv4("1.1.1.1")).toBe(true);
  });

  it("rejects unsafe website URLs", () => {
    for (const url of [
      "http://example.com",
      "https://localhost/private",
      "https://127.0.0.1/",
      "https://[::1]/",
      "https://example.com:8443/",
      "https://user:password@example.com/"
    ]) {
      expect(() => validateHotelPageUrl(url)).toThrow();
    }
  });

  it("accepts a normal HTTPS hotel webpage URL", () => {
    expect(
      validateHotelPageUrl(
        "https://www.humahotel.me/reservation-policy/"
      ).hostname
    ).toBe("www.humahotel.me");
  });
});