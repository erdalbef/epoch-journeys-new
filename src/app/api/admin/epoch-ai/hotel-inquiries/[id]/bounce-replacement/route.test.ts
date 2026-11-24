import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplacementDependencies } from "@/lib/epoch-ai/hotelBounceReplacementService";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  session: vi.fn(),
  createService: vi.fn(),
  review: vi.fn(),
  submit: vi.fn(),
  loadContext: vi.fn(),
  claim: vi.fn(),
  finalize: vi.fn(),
  send: vi.fn(),
  verifyEvidence: vi.fn(),
  authorizedDatabase: vi.fn(),
  buildEnabled: true,
  cc: "info@epochjourneys.com",
}));

vi.mock("next/server", () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("@/lib/security/requireAdminApiAccess", () => ({ requireAdminApiAccess: mocks.requireAdmin }));
vi.mock("@/lib/email/sendEmail", () => ({ sendEmail: mocks.send }));
vi.mock("@/lib/epoch-ai/hotelSupplierSendSafety", () => ({
  get SUPPLIER_SEND_ENABLED() { return mocks.buildEnabled; },
  get SUPPLIER_CC() { return mocks.cc; },
}));
vi.mock("@/lib/epoch-ai/hotelTestEmail", () => ({ isAuthorizedTestDatabase: mocks.authorizedDatabase }));
vi.mock("@/lib/epoch-ai/hotelBounceReplacementStore", () => ({
  loadBounceReplacementContext: mocks.loadContext,
  claimBounceReplacement: mocks.claim,
  finalizeBounceReplacement: mocks.finalize,
}));
vi.mock("@/lib/epoch-ai/hotelBounceReplacementEvidence", async () => {
  const actual = await vi.importActual<typeof import("@/lib/epoch-ai/hotelBounceReplacementEvidence")>(
    "@/lib/epoch-ai/hotelBounceReplacementEvidence",
  );
  return { ...actual, fetchVerifiedRecipientEvents: mocks.verifyEvidence };
});
vi.mock("@/lib/epoch-ai/hotelBounceReplacementService", () => ({
  createBounceReplacementService: (dependencies: ReplacementDependencies) => {
    mocks.createService(dependencies);
    return { review: mocks.review, submit: mocks.submit };
  },
}));

import { ReplacementBlocked } from "@/lib/epoch-ai/hotelBounceReplacementCore";
import { EvidenceReadError } from "@/lib/epoch-ai/hotelBounceReplacementEvidence";
import { GET, POST } from "./route";

const ORIGIN = "https://www.epochjourneys.com";
const PATH = `${ORIGIN}/api/admin/epoch-ai/hotel-inquiries/revised-123/bounce-replacement`;
const params = (id = "revised-123") => ({ params: Promise.resolve({ id }) });
const confirmation = {
  mode: "VALIDATE_ONLY",
  confirmation: "VALIDATE",
  inquiryId: "revised-123",
  originalOutboxId: "original-outbox",
  originalProviderMessageId: "original-provider-id",
  to: "reservations@humahotel.me",
  cc: "info@epochjourneys.com",
  subject: "Hotel inquiry",
  fingerprint: "fingerprint",
};
const request = (body: unknown = confirmation, origin: string | null = ORIGIN) => new Request(PATH, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(origin ? { origin } : {}) },
  body: JSON.stringify(body),
});

function expectNoSideEffects() {
  expect(mocks.loadContext).not.toHaveBeenCalled();
  expect(mocks.claim).not.toHaveBeenCalled();
  expect(mocks.finalize).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.verifyEvidence).not.toHaveBeenCalled();
}

describe("Admin hotel bounce replacement endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(null);
    mocks.session.mockResolvedValue({ user: { id: "authenticated-admin" } });
    mocks.review.mockResolvedValue({ inquiryId: "revised-123", eligible: false, blocks: ["Review required"] });
    mocks.submit.mockResolvedValue({
      inquiryId: "revised-123", status: "VALIDATED_NOT_SENT", fingerprint: "fingerprint",
      sent: false, outboxCreated: false,
    });
    mocks.authorizedDatabase.mockReturnValue(false);
    mocks.buildEnabled = true;
    mocks.cc = "info@epochjourneys.com";
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "test-key-never-used-on-network");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("requires Admin access for both review and submission before constructing the service", async () => {
    mocks.requireAdmin.mockImplementation(async () => new Response("Denied", { status: 403 }));
    expect((await GET(new Request(PATH), params())).status).toBe(403);
    expect((await POST(request(), params())).status).toBe(403);
    expect(mocks.createService).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("rejects missing or foreign origins without loading a send context", async () => {
    for (const origin of [null, "https://other.example", "https://www.epochjourneys.com.attacker.example"]) {
      const result = await POST(request(confirmation, origin), params());
      expect(result.status).toBe(403);
      expect(await result.json()).toEqual({ error: "Same-origin confirmation required." });
    }
    expect(mocks.createService).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("bounds the route inquiry ID for GET and POST before calling the service", async () => {
    for (const id of ["", "x".repeat(129)]) {
      expect((await GET(new Request(PATH), params(id))).status).toBe(400);
      expect((await POST(request(), params(id))).status).toBe(400);
    }
    expect(mocks.createService).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("GET returns only the review result with no-store and never submits or sends", async () => {
    const response = await GET(new Request(PATH), params());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ inquiryId: "revised-123", eligible: false, blocks: ["Review required"] });
    expect(mocks.review).toHaveBeenCalledExactlyOnceWith("revised-123");
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("takes the actor from the authenticated session and forwards the exact request for server validation", async () => {
    const submitted = { ...confirmation, authorizedBy: "forged-client-admin", originalRecipientBounceVerified: true };
    const response = await POST(request(submitted), params());
    expect(response.status).toBe(200);
    expect(mocks.submit).toHaveBeenCalledExactlyOnceWith("revised-123", submitted, "authenticated-admin");
    expect(await response.json()).toEqual({
      inquiryId: "revised-123", status: "VALIDATED_NOT_SENT", fingerprint: "fingerprint",
      sent: false, outboxCreated: false,
    });
    expect(mocks.review).not.toHaveBeenCalled();
    expectNoSideEffects();

    mocks.session.mockResolvedValue({ user: {} });
    expect((await POST(request(), params())).status).toBe(403);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it("wires production and authorized development gates, activation, configured email and mandatory CC into the service", async () => {
    await GET(new Request(PATH), params());
    const dependencies = mocks.createService.mock.calls[0][0] as ReplacementDependencies;
    expect(dependencies.environmentAllowed()).toBe(true);
    expect(dependencies.sendEnabled()).toBe(true);
    expect(dependencies.emailConfigured()).toBe(true);
    expect(dependencies.send).toBe(mocks.send);
    expect(dependencies.claim).toBe(mocks.claim);
    expect(dependencies.finalize).toBe(mocks.finalize);

    vi.stubEnv("NODE_ENV", "development");
    expect(dependencies.environmentAllowed()).toBe(false);
    mocks.authorizedDatabase.mockReturnValue(true);
    expect(dependencies.environmentAllowed()).toBe(true);
    vi.stubEnv("NODE_ENV", "test");
    expect(dependencies.environmentAllowed()).toBe(false);
    mocks.buildEnabled = false;
    expect(dependencies.sendEnabled()).toBe(false);
    mocks.buildEnabled = true;
    mocks.cc = "changed@example.com";
    expect(dependencies.sendEnabled()).toBe(false);
    vi.stubEnv("RESEND_API_KEY", "  ");
    expect(dependencies.emailConfigured()).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects malformed or oversized authorization bodies before session lookup or service construction", async () => {
    const malformed = new Request(PATH, { method: "POST", headers: { origin: ORIGIN }, body: "{" });
    const oversized = request({ data: "x".repeat(8193) });
    const declaredOversized = new Request(PATH, {
      method: "POST", headers: { origin: ORIGIN, "Content-Length": "8193" }, body: "{}",
    });
    expect((await POST(malformed, params())).status).toBe(400);
    expect((await POST(oversized, params())).status).toBe(413);
    expect((await POST(declaredOversized, params())).status).toBe(413);
    expect(mocks.createService).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("preserves safe review errors and does not expose arbitrary provider or database error text", async () => {
    mocks.submit.mockRejectedValueOnce(new ReplacementBlocked("Review changed.", 409, ["Reload REVIEW."]));
    const blocked = await POST(request(), params());
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toEqual({ error: "Review changed.", blocks: ["Reload REVIEW."] });

    mocks.review.mockRejectedValueOnce(new EvidenceReadError("PROVIDER_ACCESS_DENIED", "Provider evidence access unavailable.", 503));
    const unavailable = await GET(new Request(PATH), params());
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ error: "Provider evidence access unavailable.", code: "PROVIDER_ACCESS_DENIED" });

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.submit.mockRejectedValueOnce(new Error("private connection string and token"));
    const failed = await POST(request(), params());
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("private connection string and token");
    expect(log).toHaveBeenCalledExactlyOnceWith("HOTEL_BOUNCE_REPLACEMENT_FAILED");
    expectNoSideEffects();
  });
});
