import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { checkRateLimit } from "@/lib/rate-limit";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { registerCommercialEvidence } from "@/lib/epoch-ai/finance/registerCommercialEvidence";
import { POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/authOptions", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/security/requireAdminApiAccess", () => ({
  requireAdminApiAccess: vi.fn(),
}));

vi.mock("@/lib/epoch-ai/finance/registerCommercialEvidence", () => ({
  registerCommercialEvidence: vi.fn(),
}));

const validBody = {
  supplierId: "supplier-1",
  sourceType: "QUOTATION_ATTACHMENT",
  sourceDocumentId: "document-1",
  sourceReference: "Supplier quotation",
};

function request(
  body = JSON.stringify(validBody),
  origin: string | null = "http://localhost:3000",
  contentType = "application/json",
) {
  const headers = new Headers({
    host: "localhost:3000",
    "content-type": contentType,
  });

  if (origin !== null) headers.set("origin", origin);

  return new Request(
    "http://localhost:3000/api/admin/epoch-ai/finance/commercial-evidence",
    {
      method: "POST",
      headers,
      body,
    },
  );
}

describe("Commercial evidence Admin API", () => {
  beforeEach(() => {
    process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION = "enabled";
    vi.clearAllMocks();

    vi.mocked(requireAdminApiAccess).mockResolvedValue(null);

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1" },
    } as never);

    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: true,
      retryAfter: 0,
    } as never);

    vi.mocked(registerCommercialEvidence).mockResolvedValue({
      id: "evidence-1",
      acceptanceStatus: "NOT_ESTABLISHED",
      reviewStatus: "NOT_VERIFIED",
    } as never);
  });

  it("rejects unauthorized requests", async () => {
    vi.mocked(requireAdminApiAccess).mockResolvedValue(
      NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 },
      ),
    );

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(registerCommercialEvidence).not.toHaveBeenCalled();
  });

  it("rejects a missing origin", async () => {
    const response = await POST(request(
      JSON.stringify(validBody),
      null,
    ));

    expect(response.status).toBe(403);
    expect(registerCommercialEvidence).not.toHaveBeenCalled();
  });

  it("rejects a different origin", async () => {
    const response = await POST(request(
      JSON.stringify(validBody),
      "https://other.example",
    ));

    expect(response.status).toBe(403);
    expect(registerCommercialEvidence).not.toHaveBeenCalled();
  });

  it("enforces rate limiting", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: false,
      retryAfter: 60,
    } as never);

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(registerCommercialEvidence).not.toHaveBeenCalled();
  });

  it("rejects non-JSON requests", async () => {
    const response = await POST(request(
      "invalid",
      "http://localhost:3000",
      "text/plain",
    ));

    expect(response.status).toBe(415);
    expect(registerCommercialEvidence).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(request("{invalid"));

    expect(response.status).toBe(400);
    expect(registerCommercialEvidence).not.toHaveBeenCalled();
  });

  it("registers evidence without approving it", async () => {
    const response = await POST(request());
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.evidence.acceptanceStatus)
      .toBe("NOT_ESTABLISHED");
    expect(result.evidence.reviewStatus)
      .toBe("NOT_VERIFIED");
    expect(registerCommercialEvidence).toHaveBeenCalledOnce();
  });

  it("blocks registration when document protection is disabled", async () => {
    delete process.env.EPOCH_COMMERCIAL_EVIDENCE_PROTECTION;

    const response = await POST(
      new Request(
        "http://localhost:3000/api/admin/epoch-ai/finance/commercial-evidence",
        { method: "POST" },
      ),
    );

    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.error).toBe(
      "Commercial evidence registration is not enabled.",
    );
  });
});