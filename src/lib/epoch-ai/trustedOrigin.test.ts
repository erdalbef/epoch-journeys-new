import { describe, expect, it } from "vitest";
import { isTrustedEpochAiOrigin } from "./trustedOrigin";

describe("Epoch AI trusted origin", () => {
  const config = {
    nextAuthUrl: "https://epoch.example.com",
    publicAppUrl: "https://www.epoch.example.com",
  };

  it("accepts configured application origins", () => {
    expect(isTrustedEpochAiOrigin(
      "https://epoch.example.com", config
    )).toBe(true);
    expect(isTrustedEpochAiOrigin(
      "https://www.epoch.example.com", config
    )).toBe(true);
  });

  it("rejects external origins", () => {
    expect(isTrustedEpochAiOrigin(
      "https://evil.example.com", config
    )).toBe(false);
  });

  it("rejects missing or malformed origins", () => {
    expect(isTrustedEpochAiOrigin(null, config)).toBe(false);
    expect(isTrustedEpochAiOrigin("null", config)).toBe(false);
    expect(isTrustedEpochAiOrigin(
      "https://epoch.example.com/extra", config
    )).toBe(false);
  });

  it("fails closed without trusted configuration", () => {
    expect(isTrustedEpochAiOrigin(
      "https://epoch.example.com"
    )).toBe(false);
  });

  it("supports explicitly configured localhost", () => {
    expect(isTrustedEpochAiOrigin(
      "http://localhost:3000",
      { nextAuthUrl: "http://localhost:3000" }
    )).toBe(true);
  });

  it("rejects insecure nonlocal configuration", () => {
    expect(isTrustedEpochAiOrigin(
      "http://epoch.example.com",
      { nextAuthUrl: "http://epoch.example.com" }
    )).toBe(false);
  });
});
