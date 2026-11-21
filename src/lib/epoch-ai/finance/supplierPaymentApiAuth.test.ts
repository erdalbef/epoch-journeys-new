import { beforeEach, describe, expect, it, vi } from "vitest";

// Test the actual exported Next.js handlers, but replace sessions and all
// external side effects. These are route-handler unit tests, not HTTP+DB tests.
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  payableLookup: vi.fn(),
  paymentLookup: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
  },
}));
vi.mock("@/lib/authOptions", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  db: {
    supplierPayable: { findUnique: mocks.payableLookup },
    supplierPayablePayment: { findFirst: mocks.paymentLookup },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/storage/finansFileStorage", () => ({
  saveFinanceFile: vi.fn(() => { throw new Error("UNEXPECTED_FILE_WRITE"); }),
  deleteFinanceFile: vi.fn(() => { throw new Error("UNEXPECTED_FILE_DELETE"); }),
  getFinanceFile: vi.fn(() => { throw new Error("UNEXPECTED_FILE_READ"); }),
}));

import { POST } from "@/app/api/admin/supplier-payables/[id]/payments/route";
import {
  GET,
  PATCH,
} from "@/app/api/admin/supplier-payables/[id]/payments/[paymentId]/route";

const createContext = { params: Promise.resolve({ id: "payable-test" }) };
const editContext = {
  params: Promise.resolve({ id: "payable-test", paymentId: "payment-test" }),
};
const admin = { user: { id: "admin-test", role: "ADMIN" } };
const agent = { user: { id: "agent-test", role: "AGENT" } };

function formRequest(fields: Record<string, string> = {}) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return new Request("http://localhost/api/test", { method: "POST", body });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.payableLookup.mockImplementation(() => {
    throw new Error("UNEXPECTED_DB_LOOKUP");
  });
  mocks.paymentLookup.mockImplementation(() => {
    throw new Error("UNEXPECTED_PAYMENT_LOOKUP");
  });
  mocks.transaction.mockImplementation(() => {
    throw new Error("UNEXPECTED_DB_WRITE");
  });
});

describe("supplier payment API handlers: authentication and early validation", () => {
  it.each([
    ["missing session", null],
    ["agent session", agent],
  ])("POST rejects %s without database access", async (_case, session) => {
    mocks.session.mockResolvedValue(session);
    const result = await POST(formRequest(), createContext);
    expect(result.status).toBe(401);
    expect(mocks.payableLookup).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["missing session", null],
    ["agent session", agent],
  ])("PATCH rejects %s without database access", async (_case, session) => {
    mocks.session.mockResolvedValue(session);
    const result = await PATCH(formRequest() as never, editContext);
    expect(result.status).toBe(401);
    expect(mocks.paymentLookup).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("GET rejects unauthorized access without fetching payment", async () => {
    mocks.session.mockResolvedValue(null);
    const result = await GET(new Request("http://localhost/api/test") as never, editContext);
    expect(result.status).toBe(401);
    expect(mocks.paymentLookup).not.toHaveBeenCalled();
  });

  it("POST requires a valid payment date before looking up payable", async () => {
    mocks.session.mockResolvedValue(admin);
    const missing = await POST(formRequest(), createContext);
    expect(missing.status).toBe(400);
    const invalid = await POST(formRequest({ paymentDate: "2026-02-31" }), createContext);
    expect(invalid.status).toBe(400);
    expect(mocks.payableLookup).not.toHaveBeenCalled();
  });

  it("PATCH requires a payment amount before looking up records", async () => {
    mocks.session.mockResolvedValue(admin);
    const result = await PATCH(formRequest() as never, editContext);
    expect(result.status).toBe(400);
    expect(mocks.paymentLookup).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
