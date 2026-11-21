import React from "react";
import { auditQuotationExpenses } from "@/lib/quotes/quotationExpenseAudit";
import { buildGroupFinancialSummary } from "@/lib/quotes/groupFinancialSummary";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

type QuotePdfItem = {
  id: string;
  title: string;
  description: string | null;
  itemType: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  optional: boolean;
  sortOrder: number;
};

type QuotePdfData = {
  id: string;
  quoteNumber: number;
  quoteReference: string | null;
  title: string | null;
  purpose: string;
  status: string;
  currency: string;
  recipientName: string | null;
  recipientEmail: string | null;
  internalNotes: string | null;
  termsAndNotes: string | null;
  validUntil: Date | string | null;
  createdAt: Date | string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  items: QuotePdfItem[];
  quoteBuilderSummary?: unknown;
  tour?: {
    title: string;
    category: string;
  } | null;
  departureDate?: {
    date: Date | string;
    season: string;
    status: string;
  } | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 34,
    fontSize: 10,
    color: "#111827",
    lineHeight: 1.4,
  },
  brandBar: {
    height: 8,
    backgroundColor: "#8B0000",
    marginBottom: 18,
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  companyBlock: {
    width: "55%",
  },
  quoteBlock: {
    width: "40%",
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#001F3F",
    marginBottom: 4,
  },
  companySub: {
    fontSize: 9,
    color: "#4B5563",
    marginBottom: 2,
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#001F3F",
    marginBottom: 6,
  },
  quoteMeta: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 2,
  },
  section: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#001F3F",
    marginBottom: 8,
  },
  twoCol: {
    flexDirection: "row",
    gap: 16,
  },
  col: {
    flex: 1,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    fontWeight: 700,
    color: "#111827",
  },
  table: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 9,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 9,
  },
  cellTitle: {
    width: "40%",
    paddingRight: 8,
  },
  cellType: {
    width: "16%",
    paddingRight: 8,
  },
  cellQty: {
    width: "10%",
    textAlign: "right",
    paddingRight: 8,
  },
  cellUnit: {
    width: "17%",
    textAlign: "right",
    paddingRight: 8,
  },
  cellTotal: {
    width: "17%",
    textAlign: "right",
  },
  itemTitle: {
    fontWeight: 700,
    marginBottom: 2,
  },
  itemDesc: {
    color: "#6B7280",
    fontSize: 8,
  },
  totalsWrap: {
    marginTop: 12,
    marginLeft: "52%",
    width: "48%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 9,
  },
  totalRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    fontSize: 11,
    fontWeight: 700,
    color: "#001F3F",
  },
  internalNotice: { marginBottom: 8, padding: 7, fontSize: 9, backgroundColor: "#FFF4DA", color: "#754600" },
  priceGrid: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  costInfo: { fontSize: 9, marginBottom: 5, color: "#374151" },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 18,
    fontSize: 8,
    color: "#6B7280",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
  },
});

function formatMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
}

type InternalCostingSnapshot = {
  version: "GROUP_NET_V2";
  payingPassengers: number;
  freePassengers: number;
  totalTravelers: number;
  hotelDoubleTwinPerPayingPax: number;
  otherPerPayingPax: number;
  groupOperationalPerPayingPax: number;
  coreGroupOperationalTotal?: number;
  groupLeaderAllowancePerPayingPax: number;
  groupLeaderAllowanceTotal?: number;
  complimentaryExpenseTotal: number;
  complimentaryExpensePerPayingPax: number;
  costPerPayingPax: { single: number; doubleTwin: number; triple: number };
  netSellingPerPayingPax: { single: number; doubleTwin: number; triple: number };
  unpricedCompAccommodations?: string[];
  complimentaryExpenseLines?: Array<{category: string; travelers: number; accommodation: string; netTotal: number}>;
};
function getCostingSnapshot(summary: unknown): InternalCostingSnapshot | null {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  const raw = (summary as { costingSnapshot?: unknown }).costingSnapshot;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const v = raw as Partial<InternalCostingSnapshot>;
  if (v.version !== "GROUP_NET_V2" || typeof v.payingPassengers !== "number" ||
      v.payingPassengers <= 0 || !v.costPerPayingPax || !v.netSellingPerPayingPax) return null;
  return v as InternalCostingSnapshot;
}


/** Read-only hotel detail for the INTERNAL PDF. Uses the frozen quote snapshot,
 * not current CRM rates. No costing or database changes are performed here. */
type SavedHotel = {
  hotelName: string;
  destination: string;
  nights: number;
  stayType: "CORE" | "PRE" | "POST";
  singlePerNight: number;
  doubleTwinPerNight: number;
  triplePerNight: number;
  singleTotal: number | null;
  doubleTwinTotal: number | null;
  tripleTotal: number | null;
  hasSelectedExtras: boolean;
  estimated: boolean;
  supplierIncludedPorterage: boolean;
  mealBasis: string;
  cityTaxPerPayingTraveler: number;
  cityTaxDescription: string;
  selectedHotelExtras: string[];
};

const detailStyles = StyleSheet.create({
  notice: { marginTop: 7, marginBottom: 7, padding: 8, backgroundColor: "#FFF3DB", color: "#754600", fontSize: 8.5 },
  heading: { fontSize: 11, fontWeight: 700, color: "#001F3F", marginBottom: 8 },
  micro: { fontSize: 8.2, lineHeight: 1.35, color: "#5D6775", marginBottom: 6 },
  section: { marginBottom: 13, padding: 11, borderWidth: 1, borderColor: "#DFE4EA", borderRadius: 5 },
  tableHead: { flexDirection: "row", backgroundColor: "#F1F4F7", paddingHorizontal: 7, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#DCE2E8" },
  tableLine: { flexDirection: "row", paddingHorizontal: 7, paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: "#E7EBEF" },
  table: { borderWidth: 1, borderColor: "#DCE2E8", borderRadius: 4, overflow: "hidden" },
  total: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, marginTop: 6, borderTopWidth: 1, borderTopColor: "#DCE2E8", fontWeight: 700, fontSize: 10, color: "#001F3F" },
  smallLabel: { fontSize: 7.5, color: "#657383", marginTop: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#E7EBEF", fontSize: 9 },
  pageHeader: { fontSize: 18, color: "#001F3F", fontWeight: 700, marginBottom: 4 },
  pill: { color: "#8B0000", fontSize: 8.2, fontWeight: 700, marginBottom: 12 },
});

function savedRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function savedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function savedAmount(value: unknown): number {
  const number = typeof value === "number" || typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/** Mirrors OPTIONAL hotel services in QuoteCreateForm. This code is used for
 * display/reconciliation ONLY and must never become a second pricing engine. */
function hotelOptionalExtras(source: Record<string, unknown>, occupancy: 1 | 2 | 3, nights: number): number {
  if (!savedString(source.supplierRateId)) return 0;
  const unitCost = (rawPrice: unknown, rawUnit: unknown, rawQty: number): number => {
    const price = savedAmount(rawPrice);
    const unit = savedString(rawUnit).toUpperCase();
    switch (unit) {
      case "PER_PERSON": case "PER_PERSON_PER_STAY": return price;
      case "PER_ROOM": case "PER_ROOM_PER_STAY": return price / occupancy;
      case "PER_PERSON_PER_NIGHT": return price * rawQty;
      case "PER_ROOM_PER_NIGHT": return price * rawQty / occupancy;
      case "PER_MEAL": case "PER_PERSON_PER_MEAL": return price * rawQty;
      case "PER_ROOM_PER_MEAL": return price * rawQty / occupancy;
      default: return 0;
    }
  };
  const halfBoard = /^(HB|HALF[ _-]?BOARD)$/i.test(
    savedString(source.supplierSelectedMealBasis) || savedString(source.supplierMealBasis),
  );
  let extra = 0;
  if (!halfBoard && source.supplierDinnerIncluded !== true && source.supplierDinnerSelected === true) {
    extra += unitCost(source.supplierDinnerAmount, source.supplierDinnerUnit, Math.floor(savedAmount(source.supplierDinnerMeals)));
  }
  if (source.supplierPorterageAvailable !== false && source.supplierPorterageIncluded !== true && source.supplierPorterageSelected === true) {
    extra += unitCost(source.supplierPorterageAmount, source.supplierPorterageUnit, nights);
  }
  if (source.supplierBeveragePackageIncluded !== true && source.supplierBeverageSelected === true) {
    extra += unitCost(source.supplierBeveragePackageAmount, source.supplierBeveragePackageUnit, Math.floor(savedAmount(source.supplierBeverageMeals)));
  }
  return extra;
}

function getSavedHotels(summary: unknown): SavedHotel[] {
  const record = savedRecord(summary);
  if (!record || !Array.isArray(record.hotels)) return [];
  return record.hotels.map(savedRecord).filter((h): h is Record<string, unknown> => h !== null).map((h) => {
    const nights = Math.floor(savedAmount(h.nights));
    const singlePerNight = savedAmount(h.singlePerPerson);
    const doubleTwinPerNight = savedAmount(h.doubleTwinPerPerson);
    const triplePerNight = savedAmount(h.triplePerPerson);
    const stay = savedString(h.stayType);
    const hasSelectedExtras = [h.supplierDinnerSelected, h.supplierPorterageSelected, h.supplierBeverageSelected]
      .some((value) => value === true);
    const taxUnit = savedString(h.supplierCityTaxUnit).toUpperCase();
    const cityTaxAmount = savedAmount(h.supplierCityTaxAmount);
    const taxPerTravelerNight = h.supplierCityTaxIncluded === false
      ? taxUnit === "PER_PERSON_PER_NIGHT" ? cityTaxAmount
        : taxUnit === "PER_ROOM_PER_NIGHT" ? cityTaxAmount / 2 : 0
      : 0;
    const cityTaxPerPayingTraveler = taxPerTravelerNight * nights;
    const cityTaxDescription = cityTaxPerPayingTraveler > 0
      ? `City tax: ${formatMoney(taxPerTravelerNight, savedString(h.supplierCityTaxCurrency) || savedString(h.supplierRateCurrency) || "EUR")} pp/night; ${formatMoney(cityTaxPerPayingTraveler, savedString(h.supplierCityTaxCurrency) || savedString(h.supplierRateCurrency) || "EUR")} pp/stay (included in room rate)`
      : "";
    const selectedHotelExtras: string[] = [];
    if (h.supplierDinnerSelected === true) selectedHotelExtras.push(`Dinner x${Math.floor(savedAmount(h.supplierDinnerMeals))} at ${formatMoney(savedAmount(h.supplierDinnerAmount), savedString(h.supplierRateCurrency) || "EUR")}`);
    if (h.supplierPorterageSelected === true) selectedHotelExtras.push(`Porterage at ${formatMoney(savedAmount(h.supplierPorterageAmount), savedString(h.supplierRateCurrency) || "EUR")}`);
    if (h.supplierBeverageSelected === true) selectedHotelExtras.push(`Drinks x${Math.floor(savedAmount(h.supplierBeverageMeals))} at ${formatMoney(savedAmount(h.supplierBeveragePackageAmount), savedString(h.supplierRateCurrency) || "EUR")}`);
    return {
      hotelName: savedString(h.hotelName) || "Unnamed hotel",
      destination: savedString(h.destination),
      nights,
      stayType: stay === "PRE" || stay === "POST" ? stay : "CORE",
      singlePerNight, doubleTwinPerNight, triplePerNight,
      singleTotal: nights > 0 && singlePerNight > 0 ? singlePerNight * nights + hotelOptionalExtras(h, 1, nights) : null,
      doubleTwinTotal: nights > 0 && doubleTwinPerNight > 0 ? doubleTwinPerNight * nights + hotelOptionalExtras(h, 2, nights) : null,
      tripleTotal: nights > 0 && triplePerNight > 0 ? triplePerNight * nights + hotelOptionalExtras(h, 3, nights) : null,
      hasSelectedExtras,
      estimated: savedString(h.supplierRateValidity) === "EXPIRED_ESTIMATE" || h.supplierRateRequiresReconfirmation === true,
      supplierIncludedPorterage: h.supplierPorterageIncluded === true,
      mealBasis: savedString(h.supplierSelectedMealBasis) || savedString(h.supplierMealBasis),
      cityTaxPerPayingTraveler, cityTaxDescription, selectedHotelExtras,
    };
  });
}

const HotelRateCell = ({total, nightly, currency}: {total: number | null; nightly: number; currency: string}) => (
  <View style={{alignItems: "flex-end"}}>
    <Text style={{fontSize: 8.5, fontWeight: 700}}>{total === null ? "Not available" : formatMoney(total, currency)}</Text>
    <Text style={detailStyles.smallLabel}>{nightly > 0 ? `${formatMoney(nightly, currency)} / night` : "Rate required"}</Text>
  </View>
);

const HotelTable = ({rows, currency}: {rows: SavedHotel[]; currency: string}) => (
    <View style={detailStyles.table}>
      <View style={detailStyles.tableHead} wrap={false}>
        <Text style={{width:"33%", fontSize:8, fontWeight:700}}>Hotel / destination</Text>
        <Text style={{width:"8%", fontSize:8, fontWeight:700, textAlign:"center"}}>Nights</Text>
        <Text style={{width:"19%", fontSize:8, fontWeight:700, textAlign:"right"}}>Double/Twin</Text>
        <Text style={{width:"20%", fontSize:8, fontWeight:700, textAlign:"right"}}>Single</Text>
        <Text style={{width:"20%", fontSize:8, fontWeight:700, textAlign:"right"}}>Triple</Text>
      </View>
      {rows.map((hotel, i) => (
        <View key={`hotel-${hotel.stayType}-${i}`} style={detailStyles.tableLine} wrap={false}>
          <View style={{width:"33%", paddingRight:6}}>
            <Text style={{fontSize:8.5, fontWeight:700}}>{hotel.hotelName}</Text>
            <Text style={detailStyles.smallLabel}>{hotel.destination || "Destination not entered"}</Text>
            {!!hotel.mealBasis && <Text style={detailStyles.smallLabel}>Meal basis: {hotel.mealBasis}</Text>}
            {!!hotel.cityTaxDescription && <Text style={detailStyles.smallLabel}>{hotel.cityTaxDescription}</Text>}
            {hotel.selectedHotelExtras.length > 0 && <Text style={detailStyles.smallLabel}>Selected hotel extras: {hotel.selectedHotelExtras.join("; ")}</Text>}
            {hotel.estimated && <Text style={{fontSize:7.5,color:"#9B5A00"}}>Rate requires reconfirmation</Text>}
          </View>
          <Text style={{width:"8%",fontSize:8.5,textAlign:"center"}}>{hotel.nights}</Text>
          <View style={{width:"19%"}}><HotelRateCell total={hotel.doubleTwinTotal} nightly={hotel.doubleTwinPerNight} currency={currency}/></View>
          <View style={{width:"20%"}}><HotelRateCell total={hotel.singleTotal} nightly={hotel.singlePerNight} currency={currency}/></View>
          <View style={{width:"20%"}}><HotelRateCell total={hotel.tripleTotal} nightly={hotel.triplePerNight} currency={currency}/></View>
        </View>
      ))}
    </View>
  );

export default function QuotePdfDocument({ quote }: { quote: QuotePdfData }) {
  const costing = getCostingSnapshot(quote.quoteBuilderSummary);
  const audit = auditQuotationExpenses(quote.quoteBuilderSummary);
  const hotels = getSavedHotels(quote.quoteBuilderSummary);
  const coreHotels = hotels.filter((hotel) => hotel.stayType === "CORE");
  const extensions = hotels.filter((hotel) => hotel.stayType !== "CORE");
  const fmt = (amount: number) => formatMoney(amount, quote.currency);
  const coreHotelDoubleTwinTotal = coreHotels.reduce((total, hotel) => total + (hotel.doubleTwinTotal ?? 0), 0);
  const identifiableCityTaxPerPayer = coreHotels.reduce((total, hotel) => total + hotel.cityTaxPerPayingTraveler, 0);
  const missingCoreDoubleTwin = coreHotels.length === 0 || coreHotels.some((hotel) => hotel.doubleTwinTotal === null);
  const missingCoreSingle = coreHotels.length === 0 || coreHotels.some((hotel) => hotel.singleTotal === null);
  const missingCoreTriple = coreHotels.length === 0 || coreHotels.some((hotel) => hotel.tripleTotal === null);
  const incompleteSupplierRates = coreHotels.some((hotel) => hotel.estimated);
  const financial = costing ? buildGroupFinancialSummary({
    payingPassengers: costing.payingPassengers,
    freePassengers: costing.freePassengers,
    hotelPerPayingPax: costing.hotelDoubleTwinPerPayingPax,
    otherPerPayingPax: costing.otherPerPayingPax,
    coreOperationalGroupTotal: costing.coreGroupOperationalTotal ?? costing.groupOperationalPerPayingPax * costing.payingPassengers,
    groupLeaderAllowanceTotal: costing.groupLeaderAllowanceTotal ?? costing.groupLeaderAllowancePerPayingPax * costing.payingPassengers,
    complimentaryExpenseTotal: costing.complimentaryExpenseTotal,
    costPerPayingPax: costing.costPerPayingPax.doubleTwin,
    netSellingPerPayingPax: costing.netSellingPerPayingPax.doubleTwin,
  }) : null;
  const coreHotelDiff = costing && coreHotels.length > 0 && !missingCoreDoubleTwin
    ? coreHotelDoubleTwinTotal - costing.hotelDoubleTwinPerPayingPax : null;

  return (
    <Document title={`Internal costing - ${quote.quoteReference || quote.quoteNumber}`} author="Epoch Journeys">
      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar}/>
        <View style={styles.headerRow} wrap={false}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>EPOCH JOURNEYS</Text>
            <Text style={styles.companySub}>Internal quotation costing | Supplier and group pricing audit</Text>
          </View>
          <View style={styles.quoteBlock}>
            <Text style={styles.quoteTitle}>INTERNAL COSTING</Text>
            <Text style={styles.quoteMeta}>Quotation: {quote.quoteReference || quote.quoteNumber}</Text>
            <Text style={styles.quoteMeta}>Date: {formatDate(quote.createdAt)} | Valid: {formatDate(quote.validUntil)}</Text>
            <Text style={styles.quoteMeta}>Status: {quote.status}</Text>
          </View>
        </View>
        <View style={detailStyles.section} wrap={false}>
          <Text style={detailStyles.heading}>Quotation details</Text>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.field}><Text style={styles.label}>Tour: </Text>{quote.tour?.title || quote.title || "Untitled Quote"}</Text>
              <Text style={styles.field}><Text style={styles.label}>Purpose: </Text>{quote.purpose.replaceAll("_", " ")}</Text>
              <Text style={styles.field}><Text style={styles.label}>Currency: </Text>{quote.currency}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.field}><Text style={styles.label}>Recipient: </Text>{quote.recipientName || "Not entered"}</Text>
              <Text style={styles.field}><Text style={styles.label}>Email: </Text>{quote.recipientEmail || "Not entered"}</Text>
              <Text style={styles.field}><Text style={styles.label}>Departure: </Text>{quote.departureDate ? formatDate(quote.departureDate.date) : "Not entered"}</Text>
            </View>
          </View>
        </View>
        <Text style={detailStyles.pill}>CONFIDENTIAL - EPOCH JOURNEYS INTERNAL USE ONLY - NOT FOR AGENCY DISTRIBUTION</Text>
        {costing ? (
          <>
            <Text style={detailStyles.micro}>
              Paying pilgrims: {costing.payingPassengers}    |    COMPs: {costing.freePassengers}    |    Total travelers: {costing.totalTravelers}
            </Text>
            {/* 01: HOTELS FIRST. Room figures represent complete stay cost per person. */}
            <View style={detailStyles.section}>
              <Text style={detailStyles.heading} minPresenceAhead={24}>01  Hotels & Accommodation - CORE TOUR</Text>
              <Text style={detailStyles.micro}>
                Hotel amounts are per person for the full stay, not group totals. Smaller text shows the nightly rate.
                Double/Twin, Single and Triple are alternative occupancy rates, never added together.
              </Text>
              {coreHotels.length ? <HotelTable rows={coreHotels} currency={quote.currency}/> : (
                <Text style={detailStyles.notice}>No hotel details found in the saved quotation snapshot. Verify the accommodation cost before approval.</Text>
              )}
              {identifiableCityTaxPerPayer > 0 && (
                <Text style={detailStyles.micro}>Of the hotel total below, identified mandatory city tax: {fmt(identifiableCityTaxPerPayer)} per paying pilgrim. This amount is already included in the saved effective hotel rates, and is NOT added again. Applicable COMP hotel costs also include their corresponding taxes.</Text>
              )}
              <View style={detailStyles.total}>
                <Text>Double/Twin accommodation - per paying pilgrim</Text>
                <Text>{fmt(costing.hotelDoubleTwinPerPayingPax)}</Text>
              </View>
              {missingCoreDoubleTwin && <Text style={detailStyles.notice}>CHECK: At least one CORE hotel has no Double/Twin rate. The displayed hotel subtotal may be incomplete.</Text>}
              {missingCoreSingle && <Text style={detailStyles.notice}>SINGLE NOT READY: At least one CORE hotel lacks a Single-room rate. Do not issue the saved Single NET price.</Text>}
              {missingCoreTriple && <Text style={detailStyles.notice}>TRIPLE NOT READY: At least one CORE hotel lacks a Triple-room rate. Do not issue the saved Triple NET price.</Text>}
              {incompleteSupplierRates && <Text style={detailStyles.notice}>Supplier hotel rate is expired or requires reconfirmation. Verify before confirming the quotation.</Text>}
              {coreHotelDiff !== null && Math.abs(coreHotelDiff) > 0.02 && (
                <Text style={detailStyles.notice}>
                  CHECK: Itemized hotel stay rates differ from the saved accommodation summary by {fmt(coreHotelDiff)}. Verify supplier extras, included services and saved snapshot.
                </Text>
              )}
              {extensions.length > 0 && (
                <View style={{marginTop:12}}>
                  <Text style={detailStyles.heading} minPresenceAhead={24}>Optional pre/post hotel stays (not in CORE NET)</Text>
                  <HotelTable rows={extensions} currency={quote.currency}/>
                </View>
              )}
            </View>

            {/* 02: PER PERSON */}
            <View style={detailStyles.section}>
              <Text style={detailStyles.heading} minPresenceAhead={24}>02  Other Per-Person Expenses</Text>
              <Text style={detailStyles.micro}>Items below are charged per applicable traveler, including COMPs, unless explicitly included by the supplier. COMP recovery appears in section 04.</Text>
              {audit.perPersonLines.length ? (
                <View style={detailStyles.table}>
                  <View style={detailStyles.tableHead} wrap={false}>
                    <Text style={{width:"43%", fontSize:8, fontWeight:700}}>Service</Text>
                    <Text style={{width:"12%", fontSize:8, textAlign:"right"}}>Qty</Text>
                    <Text style={{width:"22%", fontSize:8, textAlign:"right"}}>Unit cost</Text>
                    <Text style={{width:"23%", fontSize:8, textAlign:"right"}}>Per traveler</Text>
                  </View>
                  {audit.perPersonLines.map((line,i) => (
                    <View key={`service-${i}`} style={detailStyles.tableLine} wrap={false}>
                      <View style={{width:"43%", paddingRight:5}}>
                        <Text style={{fontSize:8.5, fontWeight:700}}>{line.label}</Text>
                        <Text style={detailStyles.smallLabel}>{line.category.replaceAll("_", " ")}</Text>
                      </View>
                      <Text style={{width:"12%",fontSize:8.5,textAlign:"right"}}>{line.quantity}</Text>
                      <Text style={{width:"22%",fontSize:8.5,textAlign:"right"}}>{fmt(line.unitCost)}</Text>
                      <Text style={{width:"23%",fontSize:8.5,textAlign:"right"}}>{fmt(line.perTraveler)}</Text>
                    </View>
                  ))}
                </View>
              ) : <Text style={detailStyles.micro}>No separate per-person service lines saved.</Text>}
              <View style={detailStyles.total}><Text>Other services - per paying pilgrim</Text><Text>{fmt(costing.otherPerPayingPax)}</Text></View>
              {audit.perPersonSnapshot !== null && Math.abs(audit.perPersonTotal - audit.perPersonSnapshot) > 0.02 && (
                <Text style={detailStyles.notice}>CHECK: Itemized per-person services total {fmt(audit.perPersonTotal)} versus saved amount {fmt(audit.perPersonSnapshot)}.</Text>
              )}
              {(audit.porterage.hotelIncluded.length > 0 || audit.porterage.hotelExtrasSelected.length > 0 || audit.porterage.perPersonEntries.length > 0) && (
                <View style={{marginTop:9}}>
                  <Text style={detailStyles.heading}>Porterage cross-check</Text>
                  {audit.porterage.hotelIncluded.length > 0 && <Text style={detailStyles.micro}>Included by hotel: {audit.porterage.hotelIncluded.join(", ")}</Text>}
                  {audit.porterage.hotelExtrasSelected.length > 0 && <Text style={detailStyles.micro}>Selected hotel porterage: {audit.porterage.hotelExtrasSelected.join(", ")}</Text>}
                  {audit.porterage.perPersonEntries.map((line,i) => <Text key={`porterage-${i}`} style={detailStyles.micro}>Separate porterage: {line.label} - {fmt(line.perTraveler)} / traveler</Text>)}
                  {audit.porterage.possibleOverlap && <Text style={detailStyles.notice}>POSSIBLE DOUBLE CHARGE: Check the relevant hotel stay before including separate porterage. No cost has been automatically removed.</Text>}
                </View>
              )}
            </View>

            {/* 03: FIXED GROUP OPERATIONS */}
            <View style={detailStyles.section}>
              <Text style={detailStyles.heading} minPresenceAhead={24}>03  Group Operations & Staff Expenses</Text>
              <Text style={detailStyles.micro}>GROUP TOTAL services are recovered once across {costing.payingPassengers} paying pilgrims (including coverage for COMPs). Any PER PERSON operational charge should be validated against its contracted traveler count.</Text>
              {audit.coreLines.length ? (
                <View style={detailStyles.table}>
                  <View style={detailStyles.tableHead} wrap={false}>
                    <Text style={{width:"45%",fontSize:8,fontWeight:700}}>Service / saved detail</Text>
                    <Text style={{width:"18%",fontSize:8,fontWeight:700}}>Basis</Text>
                    <Text style={{width:"20%",fontSize:8,textAlign:"right"}}>Group cost</Text>
                    <Text style={{width:"17%",fontSize:8,textAlign:"right"}}>Per payer</Text>
                  </View>
                  {audit.coreLines.map((line,i) => (
                    <View key={`oper-${i}`}>
                      <View style={detailStyles.tableLine} wrap={false}>
                        <View style={{width:"45%", paddingRight:5}}>
                          <Text style={{fontSize:8.5,fontWeight:700}}>{line.categoryDisplay}</Text>
                          {line.label && line.label !== line.categoryDisplay && <Text style={detailStyles.smallLabel}>Saved name: {line.label}</Text>}
                        </View>
                        <Text style={{width:"18%",fontSize:8.3}}>{line.basis}</Text>
                        <Text style={{width:"20%",fontSize:8.5,textAlign:"right"}}>{line.groupTotal === null ? "Not saved" : fmt(line.groupTotal)}</Text>
                        <Text style={{width:"17%",fontSize:8.5,textAlign:"right"}}>{line.perPayingPassenger === null ? "-" : fmt(line.perPayingPassenger)}</Text>
                      </View>
                      {line.groupTotal !== null && (
                        <Text style={{...detailStyles.smallLabel, paddingHorizontal:7, paddingBottom:5}}>
                          Service: {line.serviceSubtotal === null ? "n/a" : fmt(line.serviceSubtotal)}  |  Staff hotel: {line.staffAccommodation === null ? "n/a" : fmt(line.staffAccommodation)}  |  Meals: {line.staffMeals === null ? "n/a" : fmt(line.staffMeals)}  |  Transport: {line.staffTransportation === null ? "n/a" : fmt(line.staffTransportation)}  |  Other: {line.staffOther === null ? "n/a" : fmt(line.staffOther)}
                        </Text>
                      )}
                      {line.labelCategoryMismatch && <Text style={detailStyles.notice}>CHECK: Service category is {line.categoryDisplay}, but saved name is {line.label}.</Text>}
                      {line.breakdownDifference !== null && Math.abs(line.breakdownDifference) > 0.02 && <Text style={detailStyles.notice}>CHECK: Saved row total differs from its components by {fmt(line.breakdownDifference)}.</Text>}
                    </View>
                  ))}
                </View>
              ) : <Text style={detailStyles.notice}>No itemized group operational records saved. Check source rows before approval.</Text>}
              <View style={detailStyles.total}>
                <Text>Core group expenses - {costing.payingPassengers} paying pilgrims</Text>
                <Text>{fmt(audit.coreTotalFromSummary ?? costing.groupOperationalPerPayingPax * costing.payingPassengers)}</Text>
              </View>
              <View style={detailStyles.row}>
                <Text>Allocated cost per paying pilgrim</Text><Text>{fmt(costing.groupOperationalPerPayingPax)}</Text>
              </View>
              {audit.coreDifference !== null && Math.abs(audit.coreDifference) > 0.02 && <Text style={detailStyles.notice}>CHECK: Operational item sum differs from saved total by {fmt(audit.coreDifference)}.</Text>}
              {audit.missingOperationalTotals > 0 && <Text style={detailStyles.notice}>CHECK: {audit.missingOperationalTotals} operational rows have no stored total.</Text>}
              {audit.optionalLines.length > 0 && (
                <View style={{marginTop:10}}>
                  <Text style={detailStyles.heading}>Optional Pre/Post Operations - outside core tour</Text>
                  {audit.optionalLines.map((line,i) => <View key={`optional-${i}`} style={detailStyles.row}><Text>{line.scope}: {line.categoryDisplay}</Text><Text>{line.groupTotal === null ? "Not saved" : fmt(line.groupTotal)}</Text></View>)}
                </View>
              )}
            </View>

            {/* 04: COMPS */}
            <View style={detailStyles.section}>
              <Text style={detailStyles.heading} minPresenceAhead={24}>04  Complimentary Traveler Expenses</Text>
              <Text style={detailStyles.micro}>Hotel rooms and all applicable individually charged services for COMPs are recovered across paying pilgrims. Fixed group contracts are NOT charged again.</Text>
              {(costing.complimentaryExpenseLines || []).filter((line) => line.travelers > 0).map((line,i) => (
                <View key={`comp-${i}`} style={detailStyles.row} wrap={false}>
                  <Text style={{width:"72%"}}>{line.category.replaceAll("_", " ")} x {line.travelers} - {line.accommodation}</Text>
                  <Text style={{width:"28%",textAlign:"right"}}>{fmt(line.netTotal)}</Text>
                </View>
              ))}
              <View style={detailStyles.total}><Text>Total COMP cost - group</Text><Text>{fmt(costing.complimentaryExpenseTotal)}</Text></View>
              <View style={detailStyles.row}><Text>COMP recovery per paying pilgrim</Text><Text>{fmt(costing.complimentaryExpensePerPayingPax)}</Text></View>
              {(costing.unpricedCompAccommodations || []).length > 0 && <Text style={detailStyles.notice}>MISSING COMP ROOM RATE: Do not approve the quotation until all required accommodation rates are supplied.</Text>}
              <Text style={detailStyles.micro}>No extra share of Bus / Coach, Tour Manager or contracted guide group fees is added to COMPs.</Text>
            </View>

            {/* 05: SUMMARY & NET RATES LAST */}
            <View style={detailStyles.section}>
              <Text style={detailStyles.heading} minPresenceAhead={24}>05  NET Cost & Selling Price Summary</Text>
              {([
                ["Core hotels - Double/Twin", costing.hotelDoubleTwinPerPayingPax],
                ["Other per-person services", costing.otherPerPayingPax],
                ["Fixed group & staff cost share", costing.groupOperationalPerPayingPax],
                ["Group leader allowance / payer", costing.groupLeaderAllowancePerPayingPax],
                ["COMPs allocated / payer", costing.complimentaryExpensePerPayingPax],
              ] as Array<[string, number]>).map(([label,amount]) => (
                <View key={label} style={detailStyles.row}><Text>{label}</Text><Text>{fmt(amount)}</Text></View>
              ))}
              <View style={detailStyles.total}><Text>NET supplier cost - Double/Twin / paying pilgrim</Text><Text>{fmt(costing.costPerPayingPax.doubleTwin)}</Text></View>
              <Text style={{...detailStyles.heading, marginTop:12}}>B2B NET selling rates / paying pilgrim</Text>
              <View style={detailStyles.row}><Text>Double/Twin</Text><Text>{missingCoreDoubleTwin ? "NOT READY - rate required" : costing.netSellingPerPayingPax.doubleTwin > 0 ? fmt(costing.netSellingPerPayingPax.doubleTwin) : "Not offered"}</Text></View>
              <View style={detailStyles.row}><Text>Single</Text><Text>{missingCoreSingle ? "NOT READY - rate required" : costing.netSellingPerPayingPax.single > 0 ? fmt(costing.netSellingPerPayingPax.single) : "Not offered"}</Text></View>
              <View style={detailStyles.row}><Text>Triple</Text><Text>{missingCoreTriple ? "NOT READY - rate required" : costing.netSellingPerPayingPax.triple > 0 ? fmt(costing.netSellingPerPayingPax.triple) : "Not offered"}</Text></View>
              <Text style={{...detailStyles.micro, marginTop:9}}>Occupancy rates are separate alternatives, not additive costs. Values shown are saved quotation rates, not recalculated PDF prices.</Text>
            </View>
            {financial && (
              <View style={detailStyles.section} wrap={false}>
                <Text style={detailStyles.heading}>06  Group Financial Summary - Internal Only</Text>
                <Text style={detailStyles.micro}>Reference: Double/Twin for paying travelers | {financial.payingPassengers} paying + {financial.freePassengers} COMPs = {financial.totalTravelers} travelers</Text>
                <View style={detailStyles.table}>
                  <View style={detailStyles.tableHead}>
                    <Text style={{width:"56%",fontWeight:700}}>Expense category</Text>
                    <Text style={{width:"19%",fontWeight:700,textAlign:"right"}}>Per payer</Text>
                    <Text style={{width:"25%",fontWeight:700,textAlign:"right"}}>Group cost</Text>
                  </View>
                  {financial.lines.map((line) => (
                    <View key={line.key} style={detailStyles.tableLine}>
                      <Text style={{width:"56%",fontSize:8.1}}>{line.label}</Text>
                      <Text style={{width:"19%",fontSize:8.1,textAlign:"right"}}>{fmt(line.perPayingPax)}</Text>
                      <Text style={{width:"25%",fontSize:8.1,textAlign:"right"}}>{fmt(line.groupTotal)}</Text>
                    </View>
                  ))}
                  {Math.abs(financial.reconciliationDifference) >= 0.005 && (
                    <View style={detailStyles.tableLine}>
                      <Text style={{width:"56%",fontSize:8.1}}>{financial.reconciles ? "Per-payer rounding adjustment" : "COST MISMATCH - REVIEW"}</Text>
                      <Text style={{width:"19%",fontSize:8.1,textAlign:"right"}}> - </Text>
                      <Text style={{width:"25%",fontSize:8.1,textAlign:"right"}}>{fmt(financial.reconciliationDifference)}</Text>
                    </View>
                  )}
                </View>
                <View style={detailStyles.total}><Text>TOTAL GROUP COST</Text><Text>{fmt(financial.totalGroupCost)}</Text></View>
                <View style={detailStyles.row}><Text>NET selling rate / paying passenger</Text><Text>{fmt(financial.sellingPerPayingPax)}</Text></View>
                <View style={detailStyles.row}><Text>Expected revenue ({financial.payingPassengers} paying)</Text><Text>{fmt(financial.expectedRevenue)}</Text></View>
                <View style={detailStyles.total}><Text>Projected group profit / loss</Text><Text>{fmt(financial.projectedProfit)}</Text></View>
                <View style={detailStyles.row}><Text>Projected margin on revenue</Text><Text>{financial.marginPercent.toFixed(2)}%</Text></View>
                {!financial.reconciles && <Text style={detailStyles.notice}>WARNING: Itemized expenses do not reconcile with the stored quotation NET cost. Review before approval.</Text>}
                {(missingCoreDoubleTwin || (costing.unpricedCompAccommodations || []).length > 0) && <Text style={detailStyles.notice}>INCOMPLETE COSTS: Missing accommodation rates. Profit estimate is NOT ready for approval.</Text>}
                <Text style={{...detailStyles.micro,marginTop:7}}>COMPs are included once under COMP expenses; fixed group services are charged only once. Pre/post optional stays and costs not recorded in the quotation are excluded. This is a forecast, not actual realized profit.</Text>
              </View>
            )}
          </>
        ) : (
          <View style={detailStyles.section}>
            <Text style={detailStyles.heading}>Legacy quotation items - unverified costing</Text>
            <Text style={detailStyles.notice}>This quotation does not contain a valid saved Group NET costing snapshot. Raw item totals are NOT a B2B per-person quotation.</Text>
            <View style={detailStyles.table}>
              <View style={detailStyles.tableHead}>
                <Text style={{width:"55%",fontWeight:700}}>Item</Text><Text style={{width:"20%",fontWeight:700}}>Qty</Text><Text style={{width:"25%",fontWeight:700}}>Raw total</Text>
              </View>
              {quote.items.map((item) => (
                <View key={item.id} style={detailStyles.tableLine} wrap={false}>
                  <Text style={{width:"55%"}}>{item.title}</Text>
                  <Text style={{width:"20%"}}>{item.quantity}</Text>
                  <Text style={{width:"25%"}}>{fmt(item.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {(quote.internalNotes || quote.termsAndNotes) && (
          <View style={detailStyles.section}>
            <Text style={detailStyles.heading}>Internal Notes & Terms</Text>
            {!!quote.internalNotes && <Text style={{fontSize:9,marginBottom:6}}>{quote.internalNotes}</Text>}
            {!!quote.termsAndNotes && <Text style={{fontSize:9}}>{quote.termsAndNotes}</Text>}
          </View>
        )}
        <Text style={styles.footer} render={({pageNumber,totalPages}) =>
          `Epoch Journeys | CONFIDENTIAL - Internal costing | Page ${pageNumber} of ${totalPages}`
        } fixed/>
      </Page>
    </Document>
  );
}
