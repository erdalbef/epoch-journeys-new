import { describe, expect, it } from "vitest";
import {
  getItineraryApplyPermission,
  type ApplyPermissionInput,
} from "./itineraryApplyPermission";

const valid = (): ApplyPermissionInput => ({
  hasDraft: true,
  hasReview: true,
  blockingErrors: 0,
  generatedForDuration: 12,
  tourDuration: 12,
  currentItinerary: "Day 1 - Lisbon",
  currentOverview: "Marian pilgrimage",
  originalAtGeneration: "Day 1 - Lisbon",
  overviewAtGeneration: "Marian pilgrimage",
  revisionMode: true,
  revisionAtGeneration: true,
  approvedReplacement: true,
});

describe("Epoch AI approval permission", () => {
  it("allows an explicitly approved valid replacement", () => {
    expect(getItineraryApplyPermission(valid()).allowed).toBe(true);
  });

  it("blocks replacement without approval", () => {
    const input = valid();
    input.approvedReplacement = false;
    expect(getItineraryApplyPermission(input).allowed).toBe(false);
  });

  it("blocks when the original itinerary changes", () => {
    const input = valid();
    input.currentItinerary = "Day 1 - Porto";
    expect(getItineraryApplyPermission(input).allowed).toBe(false);
  });

  it("blocks when the overview changes", () => {
    const input = valid();
    input.currentOverview = "Different program";
    expect(getItineraryApplyPermission(input).allowed).toBe(false);
  });

  it("blocks when Revision Mode changes", () => {
    const input = valid();
    input.revisionMode = false;
    expect(getItineraryApplyPermission(input).allowed).toBe(false);
  });

  it("blocks structural errors even with approval", () => {
    const input = valid();
    input.blockingErrors = 1;
    expect(getItineraryApplyPermission(input).allowed).toBe(false);
  });

  it("blocks duration changes", () => {
    const input = valid();
    input.tourDuration = 11;
    expect(getItineraryApplyPermission(input).allowed).toBe(false);
  });

  it("blocks when the proposal is unavailable", () => {
    const input = valid();
    input.hasDraft = false;
    expect(getItineraryApplyPermission(input).allowed).toBe(false);
  });

  it("blocks when the review is unavailable", () => {
    const input = valid();
    input.hasReview = false;
    expect(getItineraryApplyPermission(input).allowed).toBe(false);
  });

  it("permits a new empty working draft without replacement approval", () => {
    const input = valid();
    input.currentItinerary = "";
    input.currentOverview = "";
    input.originalAtGeneration = "";
    input.overviewAtGeneration = "";
    input.approvedReplacement = false;
    expect(getItineraryApplyPermission(input).allowed).toBe(true);
  });

  it("does not accept whitespace-only approval substitutes", () => {
    const input = valid();
    input.currentItinerary = " ";
    input.originalAtGeneration = " ";
    input.currentOverview = "Existing overview";
    input.overviewAtGeneration = "Existing overview";
    input.approvedReplacement = false;
    expect(getItineraryApplyPermission(input).allowed).toBe(false);
  });
});