import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isRequestWithinLimit } from "./requestBodyLimit";

function makeRequest(body: string, headers?: HeadersInit): Request {
  return new Request("https://example.test/api", {
    method: "POST",
    headers,
    body,
  });
}

describe("Epoch AI request-size protection", () => {
  it("accepts a request below the limit", async () => {
    const request = makeRequest("hello");
    expect(await isRequestWithinLimit(request, 10)).toBe(true);
  });

  it("accepts a request exactly at the limit", async () => {
    const request = makeRequest("12345");
    expect(await isRequestWithinLimit(request, 5)).toBe(true);
  });

  it("rejects an oversized request without Content-Length", async () => {
    const request = makeRequest("123456");
    expect(await isRequestWithinLimit(request, 5)).toBe(false);
  });

  it("rejects Content-Length larger than the limit", async () => {
    const request = makeRequest("hello", {
      "content-length": "100",
    });
    expect(await isRequestWithinLimit(request, 10)).toBe(false);
  });

  it("rejects an invalid Content-Length", async () => {
    const request = makeRequest("hello", {
      "content-length": "invalid",
    });
    expect(await isRequestWithinLimit(request, 10)).toBe(false);
  });

  it("preserves the original request body after validation", async () => {
    const request = makeRequest('{"message":"test"}');
    expect(await isRequestWithinLimit(request, 1024)).toBe(true);
    expect(await request.json()).toEqual({ message: "test" });
  });

  it("rejects invalid size-limit configuration", async () => {
    const request = makeRequest("hello");
    await expect(isRequestWithinLimit(request, 0)).rejects.toThrow();
  });
});