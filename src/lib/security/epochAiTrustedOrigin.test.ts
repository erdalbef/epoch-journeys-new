import { describe, expect, it } from "vitest";
import { isTrustedEpochAiOrigin } from "./epochAiTrustedOrigin";

describe("Epoch AI trusted origins", () => {
  it("allows the canonical production website", () => {
    expect(isTrustedEpochAiOrigin(
      "https://www.epochjourneys.com", "production"
    )).toBe(true);
  });

  it("rejects missing Origin", () => {
    expect(isTrustedEpochAiOrigin(null, "production")).toBe(false);
  });

  it("rejects an unrelated website", () => {
    expect(isTrustedEpochAiOrigin(
      "https://other.example", "production"
    )).toBe(false);
  });

  it("rejects spoofed subdomains", () => {
    expect(isTrustedEpochAiOrigin(
      "https://www.epochjourneys.com.evil.example", "production"
    )).toBe(false);
  });

  it("rejects localhost in production", () => {
    expect(isTrustedEpochAiOrigin(
      "http://localhost:3000", "production"
    )).toBe(false);
  });

  it("allows localhost in development", () => {
    expect(isTrustedEpochAiOrigin(
      "http://localhost:3000", "development"
    )).toBe(true);
  });

  it("allows an explicitly configured HTTPS preview", () => {
    expect(isTrustedEpochAiOrigin(
      "https://preview.example",
      "production",
      "https://preview.example"
    )).toBe(true);
  });

  it("rejects an HTTP preview in production", () => {
    expect(isTrustedEpochAiOrigin(
      "http://preview.example",
      "production",
      "http://preview.example"
    )).toBe(false);
  });

  it("rejects malformed Origin", () => {
    expect(isTrustedEpochAiOrigin(
      "not-a-url", "production"
    )).toBe(false);
  });

  it("rejects an Origin with path", () => {
    expect(isTrustedEpochAiOrigin(
      "https://www.epochjourneys.com/other", "production"
    )).toBe(false);
  });
});