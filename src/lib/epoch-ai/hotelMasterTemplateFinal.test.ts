import { describe, expect, it } from "vitest";
import { balkanStays, inquiry } from "./hotelProcurement";

describe("Final approved Epoch master hotel inquiry", () => {
  const draft = () =>
    inquiry(balkanStays[1], "HUMA Kotor Bay Hotel and Villas");

  it("requests separate room rates and offer validity", () => {
    const result = draft();

    expect(result.errors).toHaveLength(0);
    expect(result.body).toContain("Double/Twin and Single rooms");
    expect(result.body).toContain("Single Supplement");
    expect(result.body).toContain("Offer validity");
    expect(result.body).toContain("2 glasses of wine");
  });

  it("includes Mass room cost only when Mass room is needed", () => {
    const withMass = draft().body;
    const withoutMass = inquiry(
      { ...balkanStays[1], massRoom: false },
      "HUMA Kotor Bay Hotel and Villas"
    ).body;

    expect(withMass).toContain("private meeting room");
    expect(withMass).toContain("complimentary or subject to a charge");
    expect(withoutMass).not.toContain("private meeting room");
  });

  it("preserves the room count and signature boundary", () => {
    const body = draft().body;

    expect(body).toContain("- Rooms requested: 20 rooms");
    expect(body).not.toContain("Group size:");
    expect(body).not.toContain("Total pilgrims:");
    expect(body).toMatch(/Kind regards,$/);
    expect(body).not.toContain("Erdal Vardarli");
  });
});
