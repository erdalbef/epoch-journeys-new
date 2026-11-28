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
import { fillHotelOfferRateDraft, HOTEL_OFFER_RATE_DRAFT_EVENT, HOTEL_OFFER_RATE_IMPORT_EVENT, hotelOfferPriceQualifier, OFFER_RATE_SOURCE, prepareHotelOfferRateDraft } from "@/lib/epoch-ai/hotelOfferRateDraft";
import { readHotelOfferRateEvent } from "@/lib/epoch-ai/hotelOfferWorkflow";
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

const currentOffer = {
  id: "offer", supplierId: "hotel", version: 2, reviewStatus: "TERMS_VERIFIED",
  acceptanceStatus: "NOT_ESTABLISHED", reviewedTerms: terms,
  sourceDate: new Date("2026-11-25T00:00:00Z"),
  supplier: {name: "Ibis", status: "ACTIVE"}, events: [{eventType: HOTEL_OFFER_RATE_IMPORT_EVENT, detail: null}],
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
      sourceSubject: "Group accommodation offer", sourceDate: currentOffer.sourceDate,
      hotelInquiry: {tourId: "balkans", supplierId: "hotel", destination: "Belgrade", checkIn: "2027-05-17", checkOut: "2027-05-19"},
    }).mockResolvedValueOnce(null);
    db.tx.supplierCommercialEvidence.findMany.mockResolvedValue([currentOffer, {...currentOffer, id: "earlier-offer", version: 3, sourceDate: new Date("2026-11-19"), reviewStatus: "REVIEW_PENDING"}]);
    db.tx.supplier.findUnique.mockResolvedValue({id: "hotel", status: "ACTIVE", type: "HOTEL", country: "Serbia"});
    db.tx.supplierService.findMany.mockResolvedValue([{id: "accommodation"}]);
  });

  it("prefills the supplier amounts and leaves unstated units open", () => {
    expect(prepareHotelOfferRateDraft(terms)).toMatchObject({
      currency: "EUR", doubleTwin: "239", single: "199", triple: "", extraBed: "50", unit: "",
      halfBoard: {amount: "30", unit: ""},
      cityTax: {amount: "2", unit: "PER_PERSON_PER_NIGHT"},
      beverages: {amount: "8", unit: ""},
      porterage: {amount: "6", unit: ""},
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
      halfBoard: {amount: "30.00", unit: "PER_PERSON"},
      cityTax: {amount: "0.60", unit: "PER_PERSON_PER_NIGHT"},
    });
  });

  it("leaves conflicting group prices and FIT-only prices for review", () => {
    expect(prepareHotelOfferRateDraft({...terms,
      doubleTwin: "€210 (FIT), €200 (GROUP), €190 (GROUP) per room, per night",
      single: "€180 (FIT) per room, per night",
    })).toMatchObject({doubleTwin: "", single: ""});
  });

  it("approves the room rates with a warning and keeps indicative charges out of costing", async () => {
    const response = await save({...approval, confirmIndicativeCharges: false});
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({warnings: expect.arrayContaining([
      "City tax (EUR 2) is indicative and is excluded from the costing.",
    ])});
    expect(db.tx.supplierRate.createMany.mock.calls[0][0].data[0]).toMatchObject({
      cityTaxAmount: null, dinnerAmount: null, amount: "239",
    });
  });

  it("uses the saved source reference and saves quoted room rates with missing details", async () => {
    const response = await save({...approval, supplierConfirmation: "", single: "", mealBasis: "", taxIncluded: "",
      cityTax: {amount: "", unit: ""}, beverages: {amount: "8", unit: ""}});
    expect(response.status).toBe(201);
    const record = db.tx.supplierCommercialEvidenceEvent.create.mock.calls[0][0].data;
    expect(JSON.parse(record.detail).rates).toMatchObject({
      supplierConfirmation: "Group accommodation offer · 2026-11-25",
      beverages: {amount: "8", unit: ""},
    });
    expect(db.tx.supplierRate.createMany.mock.calls[0][0].data).toEqual([expect.objectContaining({
      roomType: "DOUBLE_TWIN", cityTaxAmount: null, beveragePackageAmount: null, breakfastIncluded: null, mealBasis: null,
    })]);
    expect(readHotelOfferRateEvent(record)).toMatchObject({ratesSaved: true, warnings: expect.arrayContaining([
      "Dinner beverages (EUR 8) needs a billing unit.",
      "City tax is unspecified or unconfirmed and is excluded from the costing.",
    ])});
  });

  it("saves a recoverable partial draft when the room unit is missing", async () => {
    const response = await save({...approval, unit: "", activateSupplier: true});
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({savedDraft: true, warnings: expect.arrayContaining(["Room billing unit is missing or unclear."])});
    expect(db.tx.supplierRate.createMany).not.toHaveBeenCalled();
    expect(db.tx.supplier.update).not.toHaveBeenCalled();
    const record = db.tx.supplierCommercialEvidenceEvent.create.mock.calls[0][0].data;
    expect(record.eventType).toBe(HOTEL_OFFER_RATE_DRAFT_EVENT);
    expect(readHotelOfferRateEvent(record)).toMatchObject({ratesSaved: false, savedDraft: {unit: "", doubleTwin: "239"}});
  });

  it("still requires explicit approval before writing rates or a draft", async () => {
    expect((await save({...approval, confirmation: "", unit: ""})).status).toBe(400);
    expect(db.tx.supplierCommercialEvidenceEvent.create).not.toHaveBeenCalled();
    expect(db.tx.supplierRate.createMany).not.toHaveBeenCalled();
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
    const savedEvent = db.tx.supplierCommercialEvidenceEvent.create.mock.calls[0][0].data;
    db.eligibleOffers.mockImplementation(async (args) => args.where.OR[0].hotelInquiry.tourId === "balkans"
      ? [{...currentOffer, events: [{...savedEvent, detail: JSON.stringify({warnings: ["Verify hotel allotment."]})}]}]
      : []);
    const matching = await (await quote("&tourId=balkans" + dates)).json();
    expect(db.eligibleOffers).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        acceptanceStatus: {notIn: ["REJECTED", "SUPERSEDED"]},
        OR: expect.arrayContaining([expect.objectContaining({hotelInquiry: expect.objectContaining({tourId: "balkans"})})]),
      }),
    }));
    expect(matching.hotels.find((item: {rate: {staySpecific: boolean}}) => item.rate.staySpecific)).toMatchObject({
      rate: {supplierReference: "offer", staySpecific: true}, rateValidity: "VALID_FOR_REQUEST",
      offerWarnings: ["Verify hotel allotment."],
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
      ...currentOffer,
      sourceDate: new Date("2020-01-01"), reviewedTerms: {...terms, validity: "Valid for 10 days from receipt"},
    }]);
    const expired = await (await quote("&tourId=balkans" + dates)).json();
    expect(expired.hotels.find((item: {rate: {staySpecific: boolean}}) => item.rate.staySpecific)).toMatchObject({
      rateValidity: "EXPIRED_ESTIMATE", requiresReconfirmation: true,
    });
    expect(otherDates.hotels).toHaveLength(1);
    expect(otherDates.hotels[0].rate.staySpecific).toBe(false);
  });

  it("blocks an older reviewed offer when the later supplier reply still needs review", async () => {
    db.tx.supplierCommercialEvidence.findMany.mockResolvedValue([
      {...currentOffer, id: "newer", version: 3, sourceDate: new Date("2026-11-26"), reviewStatus: "REVIEW_PENDING"},
      currentOffer,
    ]);
    const response = await save(approval);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({error: expect.stringContaining("2026-11-26")});
    expect(db.tx.supplierRate.createMany).not.toHaveBeenCalled();
  });

  it("explains absent CRM rates even when no accommodation service exists", async () => {
    db.supplier.findMany.mockResolvedValue([]);
    db.eligibleOffers.mockResolvedValue([{...currentOffer, events: []}]);
    const response = await quote("&tourId=balkans&startDate=2027-05-17&endDate=2027-05-19");
    expect(await response.json()).toMatchObject({
      hotels: [], offerStatuses: [{supplierName: "Ibis", status: "APPROVE_RATES"}],
    });
  });

  it("prefills the Ibis one-night offer and preserves the combined tax wording for review", () => {
    const ibis = {...terms,
      doubleTwin: "44.62 EUR per person per day + 1.79 EUR tax and insurance per person per day.",
      single: "79.25 EUR + 1.79 EUR tax and insurance per day.",
      triple: "33.08 EUR per person per day + 1.79 EUR tax and insurance per person per day.",
      cityTax: "1.79 EUR tax and insurance per person per day included in stated prices.",
      halfBoard: "20.45 EUR per person per day with unlimited non-alcoholic drinks.",
    };
    const draft = prepareHotelOfferRateDraft(ibis, true);
    expect(draft).toMatchObject({doubleTwin: "44.62", single: "79.25", triple: "33.08", unit: "PER_PERSON_PER_NIGHT",
      currency: "EUR", cityTaxIncluded: false, cityTax: {amount: "", unit: ""},
      halfBoard: {amount: "20.45", unit: "PER_PERSON_PER_NIGHT"}});
    expect(fillHotelOfferRateDraft(draft, {...draft, doubleTwin: "46.41", extraBed: "20", cityTaxIncluded: false,
      cityTax: {amount: "1.79", unit: "PER_PERSON_PER_NIGHT"}}, ibis)).toMatchObject({
      doubleTwin: "44.62", extraBed: "20", cityTax: {amount: "", unit: ""}, cityTaxIncluded: false,
    });
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
