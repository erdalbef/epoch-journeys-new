import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hotelOfferRateExtractionFormat } from "@/lib/epoch-ai/hotelOfferRateExtraction";
import { POST } from "./route";
import { hotelOfferFields } from "@/lib/epoch-ai/receivedHotelOffer";

const { findFirst, findMany, readFinanceFile } = vi.hoisted(() => ({findFirst: vi.fn(), findMany: vi.fn(), readFinanceFile: vi.fn()}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({db: {supplierCommercialEvidence: {findFirst, findMany}}}));
vi.mock("@/lib/storage/finansFileStorage", () => ({readFinanceFile}));
vi.mock("@/lib/security/requireAdminApiAccess", () => ({requireAdminApiAccess: async () => null}));
vi.mock("@/lib/authOptions", () => ({authOptions: {}}));
vi.mock("next-auth", () => ({getServerSession: async () => ({user: {id: "admin"}})}));
vi.mock("@/lib/rate-limit", () => ({checkRateLimit: () => ({allowed: true})}));

const groupDouble = "€200 (GROUP) per room per night";
const groupSingle = "€170 (GROUP) per room per night";
const separatelyChargedTax = "€0.60 per person per night (excluded)";
const output = {
  ...Object.fromEntries(hotelOfferRateExtractionFormat.schema.required.map(key => {
    const empty = {value: "", source: ""};
    return [key, ["halfBoard", "beverages", "cityTax", "porterage"].includes(key) ? {...empty, unit: ""} : empty];
  })),
  currency: {value: "EUR", source: groupDouble},
  unit: {value: "PER_ROOM_PER_NIGHT", source: groupDouble},
  doubleTwin: {value: "200", source: groupDouble},
  single: {value: "170", source: groupSingle},
  cityTaxIncluded: {value: "no", source: separatelyChargedTax},
  cityTax: {value: "0.60", unit: "PER_PERSON_PER_NIGHT", source: separatelyChargedTax},
};

const verifiedOffer = {
  id: "offer", supplierId: "hotel", reviewStatus: "TERMS_VERIFIED", acceptanceStatus: "NOT_ESTABLISHED",
  reviewedTerms: Object.fromEntries(Object.keys(hotelOfferFields).map(field => [field, ""])),
  hotelInquiry: {tourId: "balkans", supplierId: "hotel", destination: "Sarajevo", checkIn: "2027-05-07", checkOut: "2027-05-08"},
};
function draft() {
  return POST(new Request("https://epoch.example/api/admin/epoch-ai/hotel-inquiries/inquiry/offers/offer", {
    method: "POST", headers: {origin: "https://epoch.example", "content-type": "application/json"},
    body: JSON.stringify({action: "draft-rates"}),
  }), {params: Promise.resolve({id: "inquiry", offerId: "offer"})});
}

describe("Drafting rates from original hotel offers", () => {
  const fetchModel = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", fetchModel);
    findMany.mockResolvedValue([verifiedOffer]);
    fetchModel.mockImplementation(async () => Response.json({output_text: JSON.stringify(output)}));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reads original email text and ignores an AI excerpt absent from the source", async () => {
    findFirst.mockResolvedValue({
      ...verifiedOffer,
      sourceBody: `Group offer\nDouble/twin: ${groupDouble}\nCity tax: ${separatelyChargedTax}`,
    });
    const response = await draft();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({rateDraft: {
      draft: {currency: "EUR", doubleTwin: "200", single: "", cityTaxIncluded: false,
        cityTax: {amount: "0.60", unit: "PER_PERSON_PER_NIGHT"}},
      sources: {doubleTwin: groupDouble, single: "", cityTax: separatelyChargedTax},
    }});
    expect(JSON.parse(fetchModel.mock.calls[0][1].body)).toMatchObject({
      store: false,
      text: {format: hotelOfferRateExtractionFormat},
    });
  });

  it("passes the original private PDF to the model for a previously reviewed offer", async () => {
    findFirst.mockResolvedValue({
      ...verifiedOffer,
      sourceDocument: {originalFileName: "Crystal.pdf", fileSize: 8,
        storagePath: "https://store.private.blob.vercel-storage.com/offer.pdf"},
    });
    readFinanceFile.mockResolvedValue(Buffer.from("%PDF-1.7"));
    const response = await draft();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({rateDraft: {
      draft: {doubleTwin: "200", single: "170"}, sources: {single: groupSingle},
    }});
    expect(JSON.parse(fetchModel.mock.calls[0][1].body).input[0].content).toMatchObject([
      {type: "input_file", filename: "Crystal.pdf", file_data: expect.stringMatching(/^data:application\/pdf;base64,/)},
    ]);
  });

  it("rejects superseded offers before analysis", async () => {
    findFirst.mockResolvedValue({id: "offer", reviewStatus: "TERMS_VERIFIED", acceptanceStatus: "SUPERSEDED"});
    expect((await draft()).status).toBe(409);
    expect(fetchModel).not.toHaveBeenCalled();
  });

  it("returns reviewed rate values with a warning when the original cannot be processed", async () => {
    findFirst.mockResolvedValue({
      ...verifiedOffer,
      reviewedTerms: {...verifiedOffer.reviewedTerms, doubleTwin: groupDouble, single: groupSingle},
      sourceBody: `${groupDouble}\n${groupSingle}`,
    });
    fetchModel.mockResolvedValue(new Response(null, {status: 502}));
    const response = await draft();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      rateDraft: {draft: {doubleTwin: "200", single: "170", unit: "PER_ROOM_PER_NIGHT"}},
      sourceWarning: expect.stringContaining("used the reviewed terms"),
    });
  });
});
