import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/security/requireAdminApiAccess", () => ({
  requireAdminApiAccess: vi.fn(async () => null)
}));

import { POST } from "./route";

function request() {
  return new Request(
    "http://localhost:3000/api/admin/epoch-ai/hotel-research/shortlist",
    {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        city: "Tirana",
        country: "Albania",
        knownNames: []
      })
    }
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function successfulSearch() {
  return json({
    web: {
      results: [{
        title: "Example Grand Hotel Tirana",
        url: "https://example-hotel.com/",
        description: "Hotel accommodation and meeting rooms"
      }]
    }
  });
}

describe("Hotel shortlist research reliability", () => {
  beforeEach(() => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "test-key-not-real");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns a JSON dependency error when discovery fails", async () => {
    const fetchMock = vi.fn(async () => json({
      error: {
        code: "VALIDATION",
        detail: "DO_NOT_EXPOSE_RAW_PROVIDER_DETAIL"
      }
    }, 422));

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(424);
    expect(body.error).toContain("422");
    expect(body.error).toContain("VALIDATION");
    expect(JSON.stringify(body)).not.toContain("DO_NOT_EXPOSE");
    expect(JSON.stringify(body)).not.toContain("test-key-not-real");
  });

  it("preserves primary discovery when secondary discovery fails", async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => successfulSearch())
      .mockImplementationOnce(async () => json({
        error: { code: "VALIDATION" }
      }, 422))
      .mockImplementation(async () => successfulSearch());

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.partial).toBe(true);
    expect(body.discovered.length).toBeGreaterThan(0);
    expect(body.errors[0]).toContain("discovery-secondary");
  });

  it("does not continue after a provider rate limit", async () => {
    const fetchMock = vi.fn(async () => json({
      error: { code: "RATE_LIMITED" }
    }, 429));

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());

    expect(response.status).toBe(424);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles upstream HTML without exposing its contents", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      "<html>PRIVATE_UPSTREAM_BODY</html>",
      { status: 502 }
    )));

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(424);
    expect(body.error).toContain("NON_JSON_RESPONSE");
    expect(JSON.stringify(body)).not.toContain("PRIVATE_UPSTREAM_BODY");
  });

  it("preserves discovery if individual hotel research fails", async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(async () => successfulSearch())
      .mockImplementationOnce(async () => successfulSearch())
      .mockImplementation(async () => json({
        error: { code: "VALIDATION" }
      }, 422));

    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.partial).toBe(true);
    expect(body.discovered.length).toBeGreaterThan(0);
    expect(body.researchedCount).toBe(0);
  });
});