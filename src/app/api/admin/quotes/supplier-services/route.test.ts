import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyOperationalSupplierRate, matchesOperationalSupplierService, operationalDisplayBasis, operationalRateSnapshotIssue, readOperationalRateSource,
  type OperationalCostCategory, type OperationalSupplierService,
} from "@/lib/quotes/operationalSupplierRates";
import type { SupplierServiceType } from "@prisma/client";
import { GET } from "./route";

const {findMany, getServerSession} = vi.hoisted(() => ({findMany: vi.fn(), getServerSession: vi.fn()}));
vi.mock("@/lib/db", () => ({db: {supplier: {findMany}}}));
vi.mock("@/lib/authOptions", () => ({authOptions: {}}));
vi.mock("next-auth", () => ({getServerSession}));

const dates = {startDate: "2027-05-07", endDate: "2027-05-08"};
const coach = {
  id: "coach", type: "TRANSPORT", name: "Private 49-seat coach", city: "Sarajevo", country: "Bosnia and Herzegovina",
  rates: [{
    id: "coach-rate", name: "Group charter", amount: 420, currency: "EUR", unit: "PER_GROUP",
    validFrom: new Date("2027-05-01"), validTo: new Date("2027-06-01"), taxIncluded: true,
    lastVerifiedAt: null, taxRate: null, beveragePackageAmount: null, minPax: 15, maxPax: 40,
  }, {
    id: "driver-rate", name: "Driver only", amount: 100, currency: "EUR", unit: "PER_DAY",
    validFrom: new Date("2027-05-01"), validTo: new Date("2027-06-01"), taxIncluded: true,
    lastVerifiedAt: null, taxRate: null, beveragePackageAmount: null, minPax: null, maxPax: null,
  }],
};
const request = (query: Record<string, string>) =>
  new Request(`https://epoch.example/api/admin/quotes/supplier-services?${new URLSearchParams(query)}`);

describe("Operational rates from Supplier CRM", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerSession.mockResolvedValue({user: {role: "ADMIN"}});
    findMany.mockResolvedValue([{id: "supplier", name: "Sarajevo Supplier", services: [coach]}]);
  });

  it("uses active, tax-inclusive rates covering the selected dates, group and currency", async () => {
    const response = await GET(request({operationalCategory: "BUS", ...dates, pax: "22", currency: "EUR"}));
    expect(response.status).toBe(200);
    const {services} = await response.json() as {services: OperationalSupplierService[]};
    expect(services[0].rates.map(rate => rate.id)).toEqual(["coach-rate"]);
    const query = findMany.mock.calls[0][0];
    expect(query).toMatchObject({
      where: {status: "ACTIVE", services: {some: {isActive: true, type: {in: ["TRANSPORT", "DMC_SERVICE", "OTHER"]}}}},
      select: {services: {select: {rates: {where: {
        isActive: true, validFrom: {lte: new Date(dates.startDate)}, validTo: {gte: new Date(dates.endDate)},
        currency: {equals: "EUR", mode: "insensitive"}, taxIncluded: true,
        AND: [
          {OR: [{minPax: null}, {minPax: {lte: 22}}]},
          {OR: [{maxPax: null}, {maxPax: {gte: 22}}]},
        ],
      }}}}},
    });
    expect(query.select.services.select.rates.where.unit.in).not.toContain("PER_ROOM_PER_NIGHT");
    const row = applyOperationalSupplierRate(services[0], services[0].rates[0], dates, dates, "CORE");
    expect(row).toMatchObject({costMode: "TOTAL", totalContractCost: 420, pricingBasis: "GROUP_TOTAL"});
    const saved = readOperationalRateSource(JSON.parse(JSON.stringify(row.supplierOperationalRate)));
    expect(saved).toEqual(row.supplierOperationalRate);
    expect(operationalRateSnapshotIssue(row.supplierOperationalRate, "EUR", 42, dates)).toContain("group size");
    expect(operationalRateSnapshotIssue(row.supplierOperationalRate, "USD", 22, dates)).toContain("currency");
    expect(operationalRateSnapshotIssue(row.supplierOperationalRate, "EUR", 22, {...dates, endDate: "2027-05-09"})).toContain("dates");
  });

  it("selects a separately priced driver service and keeps the billing quantity", async () => {
    const response = await GET(request({operationalCategory: "DRIVER", ...dates, pax: "22", currency: "EUR"}));
    const {services} = await response.json() as {services: OperationalSupplierService[]};
    expect(services[0].rates.map(rate => rate.id)).toEqual(["driver-rate"]);
    const row = applyOperationalSupplierRate(services[0], services[0].rates[0], dates, dates, "CORE");
    expect(row).toMatchObject({costMode: "DAILY", pricingBasis: "GROUP_TOTAL", dailyRate: 100, numberOfDays: 2});
    expect(applyOperationalSupplierRate(services[0], {...services[0].rates[0], unit: "PER_TICKET"}, dates, dates, "PRE"))
      .toMatchObject({scope: "PRE", costMode: "DAILY", pricingBasis: "PER_PERSON", numberOfDays: 1});
    const optionalVehicle = applyOperationalSupplierRate(services[0], {...services[0].rates[0], unit: "PER_VEHICLE"}, dates, dates, "PRE");
    expect(operationalDisplayBasis(optionalVehicle)).toBe("PER_VEHICLE");
    expect(operationalDisplayBasis({...optionalVehicle, numberOfDays: 2})).toBe("GROUP_TOTAL");
  });

  it("offers eligible additional services without bringing hotel rooms into Group Operations", async () => {
    findMany.mockResolvedValue([{id: "supplier", name: "Supplier", services: [
      coach, {...coach, id: "hotel", name: "Hotel rooms", type: "ACCOMMODATION"},
      {...coach, id: "audio", name: "Guided-tour audio equipment", type: "DMC_SERVICE"},
    ]}]);
    const response = await GET(request({operationalCategory: "ADDITIONAL_SERVICE", ...dates, pax: "22", currency: "EUR"}));
    const {services} = await response.json() as {services: OperationalSupplierService[]};
    expect(services.map(({service}) => service.id)).toEqual(["coach", "audio"]);
    expect(findMany.mock.calls[0][0].select.services.where.type).toEqual({not: "ACCOMMODATION"});
  });

  it("recognizes guide, tour manager, assistant, transfer staff, ferry and transfer records", () => {
    const cases: [OperationalCostCategory, SupplierServiceType, string][] = [
      ["TOUR_GUIDE", "GUIDE", "City walking tour"], ["TOUR_MANAGER", "TOUR_MANAGER", "Seven-day escort"],
      ["ASSISTANT", "DMC_SERVICE", "Local assistant"], ["TRANSFERMAN", "OTHER", "Airport Meet & Greet"],
      ["FERRY", "FERRY", "Helsinki to Stockholm"], ["TRANSFER", "TRANSPORT", "Airport transfer"],
    ];
    for (const [category, type, name] of cases) {
      expect(matchesOperationalSupplierService(category, {type, name}, {name: "Contract rate"})).toBe(true);
    }
    expect(matchesOperationalSupplierService("DRIVER", {type: "TRANSPORT", name: "Coach with driver"}, {name: "Group charter"})).toBe(false);
  });

  it("requires complete operational search dates and preserves the existing service lookup", async () => {
    expect((await GET(request({operationalCategory: "BUS", pax: "22", currency: "EUR"}))).status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
    const response = await GET(request({type: "TRANSPORT"}));
    expect(response.status).toBe(200);
    expect(findMany.mock.calls[0][0].select.services.select.rates.where).toEqual({isActive: true});
  });
});
