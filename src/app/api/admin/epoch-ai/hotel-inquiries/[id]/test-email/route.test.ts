import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findInquiry, findAttempt, createAttempt, updateAttempt, sendEmail } = vi.hoisted(() => ({
  findInquiry: vi.fn(),
  findAttempt: vi.fn(),
  createAttempt: vi.fn(),
  updateAttempt: vi.fn(),
  sendEmail: vi.fn()
}));

vi.mock("@/lib/security/requireAdminApiAccess", () => ({requireAdminApiAccess: async () => null}));
vi.mock("@/lib/db", () => ({
  db: {
    hotelInquiry: {findUnique: findInquiry},
    epochEmailOutbox: {findUnique: findAttempt, create: createAttempt, update: updateAttempt}
  }
}));
vi.mock("@/lib/email/sendEmail", () => ({sendEmail}));

import { POST } from "./route";

const url = "https://epoch.example/api/admin/epoch-ai/hotel-inquiries/hotel-1/test-email";

function request(confirmation: string) {
  return POST(new Request(url, {
    method: "POST",
    headers: {origin: "https://epoch.example", "content-type": "application/json"},
    body: JSON.stringify({confirmation, to: "hotel@example.com", cc: "external@example.com"})
  }), {params: Promise.resolve({id: "hotel-1"})});
}

describe("Internal hotel inquiry test email", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EPOCH_SUPPLIER_SEND_ACTIVATION", "EXPLICIT_STAGE3C_APPROVED");
    vi.stubEnv("RESEND_API_KEY", "test-only");
    findInquiry.mockResolvedValue({
      id: "hotel-1", status: "APPROVED", recipient: "hotel@example.com",
      subject: "Group accommodation request", destination: "Tirana", rooms: 20,
      checkIn: "2027-05-10", checkOut: "2027-05-12",
      approvedAt: new Date("2026-11-25"), approvedBy: "admin",
      body: "Dear Reservations Team, we request 20 rooms in Tirana from 10 May 2027 to 12 May 2027. Please quote bed and breakfast and itemize the half-board supplement, city taxes, porterage and deposit separately."
    });
    findAttempt.mockResolvedValue(null);
    sendEmail.mockResolvedValue({data: {id: "message-1"}, error: null});
  });

  afterEach(() => vi.unstubAllEnvs());

  it("delivers only to the fixed company mailboxes and records the test separately", async () => {
    const response = await request("SEND TEST");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({status: "ACCEPTED", supplierSent: false});
    expect(sendEmail).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      to: "erdal@epochjourneys.com",
      cc: "info@epochjourneys.com",
      subject: "TEST – Group accommodation request"
    }));
    expect(createAttempt).toHaveBeenCalledWith({data: expect.objectContaining({
      eventKey: "test:hotel-inquiry:hotel-1:erdal",
      recipient: "erdal@epochjourneys.com"
    })});
  });

  it("requires test confirmation and refuses repeat attempts", async () => {
    expect((await request("SEND")).status).toBe(400);
    findAttempt.mockResolvedValue({status: "ACCEPTED", providerMessageId: "message-1"});
    expect((await request("SEND TEST")).status).toBe(409);
    expect(createAttempt).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
