import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    supplierCommercialEvidence: {findFirst: vi.fn(), findMany: vi.fn()},
    supplierCommercialEvidenceEvent: {findFirst: vi.fn(), create: vi.fn()},
    supplier: {findUnique: vi.fn(), update: vi.fn()},
    supplierService: {findMany: vi.fn(), create: vi.fn()},
    supplierRate: {createMany: vi.fn(), updateMany: vi.fn()},
  };
  return {tx, supplier: {findMany: vi.fn()}, eligibleOffers: vi.fn()};
});

vi.mock("@/lib/security/requireAdminApiAccess", () => ({requireAdminApiAccess: async () => null}));
vi.mock("@/lib/security/requestBodyLimit", () => ({isRequestWithinLimit: async () => true}));
vi.mock("@/lib/authOptions", () => ({authOptions: {}}));
vi.mock("next-auth", () => ({getServerSession: async () => ({user: {id: "admin", role: "ADMIN"}})}));
vi.mock("@/lib/db", () => ({db: {supplier: db.supplier, supplierCommercialEvidence: {findMany: db.eligibleOffers}, $transaction: (run: (tx: typeof db.tx) => unknown) => run(db.tx)}}));

import { GET } from "@/app/api/admin/quotes/supplier-hotels/route";
import { hotelOfferPriceQualifier, hotelOfferRateApproval, hotelOfferRateApprovalIssues, OFFER_RATE_SOURCE, prepareHotelOfferRateDraft } from "@/lib/epoch-ai/hotelOfferRateDraft";
import { POST } from "./route";

const terms = {
  availability: "No specific stay dates or allotment.",
  doubleTwin: "Double room EUR 239 net to agency. Twin room EUR 239 net to agency.",
  single: "Single room EUR 199 net to agency.",
  triple: "Additional bed supplement EUR 50 per night.",
  halfBoard: "Half-board supplement from EUR 30.",
  beverages: "Beverage package (2 glasses of wine, beer, or soft drinks) EUR 8.",
  cityTax: "Approximately EUR 2 per person, per night.",
  porterage: "EUR 6 for in/out.",
  payment: "", cancellation: "", validity: "10 days", other: "Rates include breakfast and VAT.",
};

const approval = {
  ...prepareHotelOfferRateDraft(terms),
  unit: "PER_ROOM_PER_NIGHT", taxIncluded: true, supplierConfirmation: "Confirmed by Hotel Sales in email May 1",
  confirmIndicativeCharges: true,
  beverages: {amount: "8", unit: "PER_MEAL"}, cityTax: {amount: "2", unit: "PER_PERSON_PER_NIGHT"},
  porterage: {amount: "", unit: ""}, activateSupplier: false, confirmation: "APPROVE_HOTEL_OFFER_RATES",
};
const params = {params: Promise.resolve({id: "inquiry", offerId: "offer"})};

function save(data: object) {
  return POST(new Request("https://epoch.example/api/admin/epoch-ai/hotel-inquiries/inquiry/offers/offer/rates", {
    method: "POST", headers: {origin: "https://epoch.example", "content-type": "application/json"}, body: JSON.stringify(data),
  }), params);
}

function quote(dates: string) {
  return GET(new Request("https://epoch.example/api/admin/quotes/supplier-hotels?city=Belgrade" + dates));
}

describe("Supplier rates from reviewed hotel offers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    db.tx.supplierCommercialEvidence.findFirst.mockResolvedValueOnce({
      id: "offer", supplierId: "hotel", reviewStatus: "TERMS_VERIFIED", reviewedTerms: terms, version: 2,
      hotelInquiry: {supplierId: "hotel", destination: "Belgrade", checkIn: "2027-05-17", checkOut: "2027-05-19"},
    }).mockResolvedValueOnce(null);
    db.tx.supplierCommercialEvidence.findMany.mockResolvedValue([{id: "earlier-offer"}]);
    db.tx.supplier.findUnique.mockResolvedValue({id: "hotel", status: "ACTIVE", type: "HOTEL", country: "Serbia"});
    db.tx.supplierService.findMany.mockResolvedValue([{id: "accommodation"}]);
  });

  it("prefills supplier amounts and applies the standard unit even when the drinks list includes alternatives", () => {
    expect(prepareHotelOfferRateDraft(terms)).toMatchObject({
      currency: "EUR", doubleTwin: "239", single: "199", triple: "", extraBed: "50", unit: "",
      halfBoard: {amount: "30", unit: "PER_PERSON_PER_NIGHT"},
      cityTax: {amount: "2", unit: "PER_PERSON_PER_NIGHT"},
      beverages: {amount: "8", unit: "PER_PERSON_PER_NIGHT"},
      porterage: {amount: "6", unit: "PER_PERSON_PER_NIGHT"},
    });
    expect(hotelOfferPriceQualifier(terms.halfBoard)).toBe("Starting price");
    expect(hotelOfferPriceQualifier(terms.cityTax)).toBe("Approximate");
  });

  it("keeps explicit units, leaves unsupported units for review, and skips ambiguous alternative amounts", () => {
    expect(prepareHotelOfferRateDraft({...terms,
      halfBoard: "EUR 30 per person, per dinner",
      beverages: "EUR 8 or 10 per dinner",
      porterage: "EUR 6 per bag per night",
    })).toMatchObject({
      halfBoard: {amount: "30", unit: "PER_MEAL"},
      beverages: {amount: "", unit: ""},
      porterage: {amount: "6", unit: ""},
    });
  });

  it("prefills Hotel Crystal group prices, half board and excluded city tax", () => {
    expect(prepareHotelOfferRateDraft({...terms,
      doubleTwin: "€210.00 (FIT), €200.00 (GROUP) per room, per night",
      single: "€180.00 (FIT), €170.00 (GROUP) per room, per night",
      halfBoard: "€30.00 per person",
      cityTax: "€0.60 per person per night (excluded)",
      other: "Rates exclude insurance (EUR 0.60 per person per night). Rates include breakfast, Wi-Fi, and VAT.",
    })).toMatchObject({
      currency: "EUR", doubleTwin: "200.00", single: "170.00", unit: "PER_ROOM_PER_NIGHT",
      mealBasis: "BB", taxIncluded: "yes", cityTaxIncluded: false,
      halfBoard: {amount: "30.00", unit: "PER_PERSON_PER_NIGHT"},
      cityTax: {amount: "0.60", unit: "PER_PERSON_PER_NIGHT"},
    });
  });

  it("leaves conflicting group prices and FIT-only prices for review", () => {
    expect(prepareHotelOfferRateDraft({...terms,
      doubleTwin: "€210 (FIT), €200 (GROUP), €190 (GROUP) per room, per night",
      single: "€180 (FIT) per room, per night",
    })).toMatchObject({doubleTwin: "", single: ""});
  });

  it("requires confirmation before saving a starting price or approximate tax", async () => {
    expect((await save({...approval, confirmIndicativeCharges: false})).status).toBe(400);
    expect(db.tx.supplierRate.createMany).not.toHaveBeenCalled();
  });

  it("requires explicit approval and a confirmation reference, and rejects incomplete charges", async () => {
    expect((await save({...approval, supplierConfirmation: ""})).status).toBe(400);
    expect((await save({...approval, beverages: {amount: "8", unit: ""}})).status).toBe(400);
    expect(db.tx.supplierRate.createMany).not.toHaveBeenCalled();
  });

  it("identifies the room rate unit as the remaining approval blocker", () => {
    const result = hotelOfferRateApproval.safeParse({...approval, unit: "", supplierConfirmation: "EMAIL"});
    expect(result.success).toBe(false);
    expect(hotelOfferRateApprovalIssues(result.error?.issues ?? [])).toEqual([
      "Select the room rate unit for the Double/Twin and Single prices.",
    ]);
    expect(hotelOfferRateApproval.safeParse({...approval, supplierConfirmation: "EMAIL"}).success).toBe(true);
  });

  it("makes reviewed offer rates available only for the matching tour and stay", async () => {
    expect((await save(approval)).status).toBe(201);
    const [{data}] = db.tx.supplierRate.createMany.mock.calls[0];
    expect(data).toMatchObject([
      {supplierReference: "offer", rateSource: OFFER_RATE_SOURCE, roomType: "DOUBLE_TWIN", amount: "239", extraBedRate: "50"},
      {supplierReference: "offer", rateSource: OFFER_RATE_SOURCE, roomType: "SINGLE", amount: "199"},
    ]);
    expect(db.tx.supplierRate.updateMany.mock.calls[0][0].where.supplierReference).toEqual({in: ["earlier-offer"]});
    const legacySingle = {...data[1], amount: 75, supplierReference: "contract", rateSource: null, id: "legacy-single"};
    db.supplier.findMany.mockResolvedValue([{services: [{rates: [...data.map((rate: object, index: number) =>
      ({...rate, id: String(index)})), legacySingle]}]}]);

    const dates = "&startDate=2027-05-17&endDate=2027-05-19";
    db.eligibleOffers.mockImplementation(async (args) => args.where.OR[0].hotelInquiry.tourId === "balkans"
      ? [{id: "offer", supplierId: "hotel", acceptanceStatus: "NOT_ESTABLISHED", reviewedTerms: terms}]
      : []);
    const matching = await (await quote("&tourId=balkans" + dates)).json();
    expect(db.eligibleOffers).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: {in: ["offer"]}, reviewStatus: "TERMS_VERIFIED", newerEvidence: {none: {}},
      }),
    }));
    expect(matching.hotels.find((item: {rate: {staySpecific: boolean}}) => item.rate.staySpecific)).toMatchObject({
      rate: {supplierReference: "offer", staySpecific: true}, rateValidity: "VALID_FOR_REQUEST",
      effectiveCost: {singlePerPersonPerNight: 201, doubleTwinPerPersonPerNight: 121.5, triplePerPersonPerNight: null},
    });
    const [otherDates, otherTour, noTour] = await Promise.all([
      quote("&tourId=balkans&startDate=2027-05-18&endDate=2027-05-19"),
      quote("&tourId=another-tour" + dates),
      quote(dates),
    ]).then(responses => Promise.all(responses.map(response => response.json())));
    expect(otherTour.hotels).toHaveLength(1);
    expect(noTour.hotels).toHaveLength(1);
    db.eligibleOffers.mockResolvedValue([{
      id: "offer", supplierId: "hotel", acceptanceStatus: "NOT_ESTABLISHED",
      sourceDate: new Date("2020-01-01"), reviewedTerms: {...terms, validity: "Valid for 10 days from receipt"},
    }]);
    const expired = await (await quote("&tourId=balkans" + dates)).json();
    expect(expired.hotels.find((item: {rate: {staySpecific: boolean}}) => item.rate.staySpecific)).toMatchObject({
      rateValidity: "EXPIRED_ESTIMATE", requiresReconfirmation: true,
    });
    expect(otherDates.hotels).toHaveLength(1);
    expect(otherDates.hotels[0].rate.staySpecific).toBe(false);
  });

  it("returns the existing result when the same approval is retried", async () => {
    db.tx.supplierCommercialEvidenceEvent.findFirst.mockResolvedValue({id: "saved"});
    expect(await (await save(approval)).json()).toEqual({alreadySaved: true, supplierId: "hotel"});
    expect(db.tx.supplierRate.createMany).not.toHaveBeenCalled();
  });

  it("saves rates for an inactive CRM candidate and preserves its supplier status", async () => {
    db.tx.supplier.findUnique.mockResolvedValue({id: "hotel", status: "INACTIVE", type: "HOTEL", country: "Serbia"});
    const response = await save(approval);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({saved: true, supplierId: "hotel", supplierActive: false});
    expect(db.tx.supplierRate.createMany).toHaveBeenCalledOnce();
    expect(db.tx.supplier.update).not.toHaveBeenCalled();
  });
});
