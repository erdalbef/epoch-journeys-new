import { describe, expect, it } from "vitest";
import { supplierDeliveryStateWithEvents } from "./hotelSupplierSendSafety";

const accepted = { status: "ACCEPTED" };

const event = (type: string) => ({
  type,
  occurredAt: new Date("2026-11-20T12:00:00Z"),
});

describe("Stage 3C supplier delivery status", () => {
  it("does not mistake provider acceptance for delivery", () => {
    const result = supplierDeliveryStateWithEvents(accepted, []);
    expect(result.delivered).toBe(false);
    expect(result.code).toBe("PROVIDER_ACCEPTED");
  });

  it("recognizes verified delivery", () => {
    const result = supplierDeliveryStateWithEvents(
      accepted, [event("email.delivered")]
    );
    expect(result.delivered).toBe(true);
    expect(result.code).toBe("DELIVERED_REPORTED");
  });

  it("prioritizes bounce over delivery", () => {
    const result = supplierDeliveryStateWithEvents(
      accepted,
      [event("email.bounced"), event("email.delivered")]
    );
    expect(result.delivered).toBe(false);
    expect(result.requiresInvestigation).toBe(true);
    expect(result.code).toBe("DELIVERY_PROBLEM");
  });

  it("prioritizes complaints over delivery", () => {
    const result = supplierDeliveryStateWithEvents(
      accepted,
      [event("email.delivered"), event("email.complained")]
    );
    expect(result.delivered).toBe(false);
    expect(result.requiresInvestigation).toBe(true);
  });

  it("reports delayed delivery without confirming delivery", () => {
    const result = supplierDeliveryStateWithEvents(
      accepted, [event("email.delivery_delayed")]
    );
    expect(result.code).toBe("DELIVERY_DELAYED");
    expect(result.delivered).toBe(false);
  });
});