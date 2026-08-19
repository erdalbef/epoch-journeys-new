"use client";

import { calculateNetGroupPricing } from "@/lib/quotes/netGroupPricing";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import QuoteTemplatePicker, {
  type BuilderQuoteItem,
} from "./QuoteTemplatePicker";

import IncludesExcludesBuilder from "@/components/quotes/IncludesExcludesBuilder";
import PolicySelector from "@/components/quotes/PolicySelector";
import TermsSelector from "@/components/quotes/TermsSelector";
import QuoteValiditySection from "@/components/quotes/create/QuoteValiditySection";

import RecipientSection from "@/components/quotes/create/RecipientSection";
import GroupSetupSection from "@/components/quotes/create/GroupSetupSection";
import HotelsSection from "@/components/quotes/create/HotelsSection";

import OperationalCostsSection, {
  type OperationalCostCategory,
  type OperationalCostMode,
  type OperationalCostRow,
  type OperationalCostScope,
  type OperationalPricingBasis,
} from "@/components/quotes/create/OperationalCostsSection";

import PricingControlsSection, {
  type MarkupMode,
  type PricingControls,
} from "@/components/quotes/create/PricingControlsSection";

import PassengerPricingSection from "@/components/quotes/create/PassengerPricingSection";
import QuoteSummarySection from "@/components/quotes/create/QuoteSummarySection";
import ProfitViewSection from "@/components/quotes/create/ProfitViewSection";

import FixedCostsSection, {
  type FixedCostCategory,
  type FixedCostRow,
} from "@/components/quotes/create/FixedCostsSection";

import ComplimentaryTravelersSection, {
  type ComplimentarySetup,
} from "@/components/quotes/sections/ComplimentaryTravelersSection";

type TourOption = {
  id: string;
  title: string;
  category: string;
  startingPrice: number | null;
  currency: string;
  overviewItinerary: string | null;
  itinerary: string | null;
};

type SeasonalRateReference = {
  id: string;
  season: string;
  validFrom: string;
  validTo: string;
  price: number;
  singleSupplement: number | null;
  tripleReduction: number | null;
  currency: string;
  minPax: number | null;
  notes: string | null;
};

type AgentOption = {
  id: string;
  fullName: string | null;
  email: string;
  travelAgency: string | null;
  commissionRate: number | null;
};

type QuoteItemRecord = {
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

type PricingMode = "CALCULATED" | "MANUAL";

type QuotePurpose =
  | "CUSTOM_REQUEST"
  | "TOUR_SETUP";

type HotelRow = {
  hotelName: string;
  destination: string;
  nights: number;
  singlePerPerson: number;
  doubleTwinPerPerson: number;
  triplePerPerson: number;

  stayType:
    | "CORE"
    | "PRE"
    | "POST";
};

type GroupSetup = {
  totalPassengers: number;
  freePassengers: number;
  startDate: string;
  endDate: string;
};

type PaxPricingRow = {
  paxCount: number;

  calculatedSinglePrice: number;
  calculatedDoubleTwinPrice: number;
  calculatedTriplePrice: number;

  manualSinglePrice: number;
  manualDoubleTwinPrice: number;
  manualTriplePrice: number;
};

type LegacyEntranceRow = {
  siteName?: string;
  amountPerPerson?: number;
};

type LegacyTipRow = {
  tipType?: string;
  amountPerDayPerPerson?: number;
  totalDays?: number;
  assignedPax?: number;
};

type LegacyOtherFixedRow = {
  label?: string;
  amountPerUnit?: number;
  quantity?: number;
};

type LegacyVariableCostRow = {
  label?: string;
  totalCost?: number;
  costBasis?:
    | "GROUP"
    | "PER_PERSON";
};

type LegacyStaffCostRow = {
  label?: string;
  dailyRate?: number;
  days?: number;
  hotelSinglePerNight?: number;
  nights?: number;
  mealsPerDay?: number;
  mealDays?: number;
  extras?: number;
};

type LegacyDriverCostRow = {
  label?: string;
  hotelSinglePerNight?: number;
  nights?: number;
  mealsPerDay?: number;
  mealDays?: number;
  extras?: number;
};

type LegacyFixedCostRow = {
  label?: string;
  category?: string;
  quantity?: number;
  unitCost?: number;
};

type SavedOperationalCostRow = Partial<OperationalCostRow> & {
  totalCost?: number;
};

type QuoteBuilderSummary = {
  startDate?: string | null;
  endDate?: string | null;

  briefItinerary?: string | null;

  totalPassengers?: number;
  freePassengers?: number;
  payingPassengers?: number;

  complimentarySetup?: Partial<ComplimentarySetup>;

  groupLeaderAllowanceTotal?: number;

  agentCommissionPercent?: number;

  markupMode?: MarkupMode;
  epochMarkupPercent?: number;
  epochMarkupPerPerson?: number;

  pricingMode?: PricingMode;

  paxPricingRows?: PaxPricingRow[];

  hotels?: HotelRow[];

  fixedCostRows?: LegacyFixedCostRow[];

  operationalCostRows?: SavedOperationalCostRow[];

  entranceRows?: LegacyEntranceRow[];
  tipRows?: LegacyTipRow[];
  otherFixedRows?: LegacyOtherFixedRow[];

  variableCostRows?: LegacyVariableCostRow[];

  tourManagerRows?: LegacyStaffCostRow[];
  guideRows?: LegacyStaffCostRow[];
  driverRows?: LegacyDriverCostRow[];
};

type InitialQuoteData = {
  id: string;

  title: string | null;

  recipientName: string | null;
  recipientEmail: string | null;

  internalNotes: string | null;
  termsAndNotes: string | null;

  currency: string;

  purpose: string;

  tourId: string | null;
  departureDateId: string | null;

  templateId?: string | null;

  quoteBuilderSummary?: unknown;

  items: QuoteItemRecord[];

  clientDocumentTitle?: string | null;

  clientSinglePrice?: number | null;
  clientDoubleTwinPrice?: number | null;
  clientTriplePrice?: number | null;

  clientIncludes?: string | null;
  clientExcludes?: string | null;

  paymentPolicy?: string | null;
  cancellationPolicy?: string | null;

  clientOfferNotes?: string | null;

  validUntil?: string | Date | null;

  availabilityNotes?: string | null;
  nextStepNotes?: string | null;
};

type Props = {
  tours: TourOption[];
  agents: AgentOption[];

  initialData?: InitialQuoteData;

  mode?: "create" | "edit";
};

type GeneratedQuoteItemType =
  | "SERVICE"
  | "ACCOMMODATION"
  | "TRANSPORT"
  | "GUIDE"
  | "ACTIVITY"
  | "FLIGHT"
  | "FEE"
  | "DISCOUNT"
  | "CUSTOM";

const TEXTAREA_CLASS =
  "w-full min-h-[200px] resize-y rounded-md border p-4 text-sm leading-relaxed";

const VALID_FIXED_COST_CATEGORIES:
  FixedCostCategory[] = [
    "ENTRANCE",
    "LUNCH",
    "DINNER",
    "BOTTLED_WATER",
    "FLIGHT",
    "CRUISE",
    "TIPS",
    "PORTERAGE",
    "HEADSETS",
    "MASS_CHURCH",
    "LOCAL_TRANSPORT",
    "OTHER",
  ];

const DEFAULT_COMPLIMENTARY_SETUP:
  ComplimentarySetup = {
    useFreePlaceRule: true,
    freePlaceRatio: 10,

    priestComplimentary: false,
    priestCount: 1,
    priestComplimentaryBasis: "USES_FREE_PLACE",

    groupLeaderComplimentary: false,
    groupLeaderCount: 1,
    groupLeaderComplimentaryBasis: "USES_FREE_PLACE",

    additionalFreePassengers: 0,

    groupLeaderAllowanceEnabled: false,
    groupLeaderAllowancePerPayingPax: 0,
  };

const DEFAULT_PRICING:
  PricingControls = {
    markupMode: "PERCENTAGE",
    epochMarkupPercent: 0,
    epochMarkupPerPerson: 0,
  };

function toNumber(
  value: unknown
): number {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

function formatMoney(
  amount: number,
  currency = "EUR"
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(amount);
}

function normalizeFixedCostCategory(
  value: unknown
): FixedCostCategory {
  if (typeof value !== "string") {
    return "OTHER";
  }

  if (value === "HOTEL") {
    return "OTHER";
  }

  if (
    VALID_FIXED_COST_CATEGORIES.includes(
      value as FixedCostCategory
    )
  ) {
    return value as FixedCostCategory;
  }

  return "OTHER";
}

function isOperationalCategory(
  value: unknown
): value is OperationalCostCategory {
  return (
    value === "BUS" ||
    value === "TOUR_GUIDE" ||
    value === "TOUR_MANAGER" ||
    value === "ASSISTANT" ||
    value === "TRANSFERMAN" ||
    value === "DRIVER" ||
    value === "FERRY" ||
    value === "TRANSFER" ||
    value === "OTHER"
  );
}

function normalizeOperationalCategory(
  value: unknown
): OperationalCostCategory {
  return isOperationalCategory(value)
    ? value
    : "OTHER";
}

function normalizeOperationalScope(
  value: unknown
): OperationalCostScope {
  if (
    value === "PRE" ||
    value === "POST"
  ) {
    return value;
  }

  return "CORE";
}

function normalizeOperationalCostMode(
  value: unknown
): OperationalCostMode {
  return value === "TOTAL"
    ? "TOTAL"
    : "DAILY";
}

function normalizeOperationalPricingBasis(
  value: unknown,
  category: OperationalCostCategory
): OperationalPricingBasis {
  if (
    value === "GROUP_TOTAL" ||
    value === "PER_PERSON" ||
    value === "PER_SERVICE" ||
    value === "PER_VEHICLE"
  ) {
    return value;
  }

  if (category === "TRANSFER") {
    return "PER_VEHICLE";
  }

  if (category === "TRANSFERMAN") {
    return "PER_SERVICE";
  }

  if (category === "FERRY") {
    return "PER_PERSON";
  }

  return "GROUP_TOTAL";
}

function createEmptyHotelRow():
  HotelRow {
  return {
    hotelName: "",
    destination: "",
    nights: 1,
    singlePerPerson: 0,
    doubleTwinPerPerson: 0,
    triplePerPerson: 0,
    stayType: "CORE",
  };
}

function createEmptyFixedCostRow():
  FixedCostRow {
  return {
    label: "",
    category: "ENTRANCE",
    quantity: 1,
    unitCost: 0,
  };
}

function createEmptyOperationalCostRow():
  OperationalCostRow {
  return {
    label: "Bus / Coach",

    category: "BUS",

    scope: "CORE",

    costMode: "TOTAL",

    pricingBasis: "GROUP_TOTAL",

    totalContractCost: 0,

    dailyRate: 0,
    numberOfDays: 1,

    hotelPerNight: 0,
    hotelNights: 0,

    airfareTransport: 0,

    mealsPerDay: 0,
    mealDays: 0,

    otherExpenses: 0,
  };
}

function createEmptyPaxPricingRow(
  paxCount = 0
): PaxPricingRow {
  return {
    paxCount,

    calculatedSinglePrice: 0,
    calculatedDoubleTwinPrice: 0,
    calculatedTriplePrice: 0,

    manualSinglePrice: 0,
    manualDoubleTwinPrice: 0,
    manualTriplePrice: 0,
  };
}

function fixedCostRowTotal(
  row: FixedCostRow
) {
  return (
    toNumber(row.quantity) *
    toNumber(row.unitCost)
  );
}

function operationalServiceAmount(
  row: OperationalCostRow
) {
  if (
    row.costMode === "TOTAL"
  ) {
    return Math.max(
      toNumber(
        row.totalContractCost
      ),
      0
    );
  }

  return (
    Math.max(
      toNumber(
        row.dailyRate
      ),
      0
    ) *
    Math.max(
      toNumber(
        row.numberOfDays
      ),
      0
    )
  );
}

function operationalStaffExpenses(
  row: OperationalCostRow
) {
  const hotel =
    Math.max(
      toNumber(
        row.hotelPerNight
      ),
      0
    ) *
    Math.max(
      toNumber(
        row.hotelNights
      ),
      0
    );

  const airfareTransport =
    Math.max(
      toNumber(
        row.airfareTransport
      ),
      0
    );

  const meals =
    Math.max(
      toNumber(
        row.mealsPerDay
      ),
      0
    ) *
    Math.max(
      toNumber(
        row.mealDays
      ),
      0
    );

  const otherExpenses =
    Math.max(
      toNumber(
        row.otherExpenses
      ),
      0
    );

  return (
    hotel +
    airfareTransport +
    meals +
    otherExpenses
  );
}

function operationalQuotedAmount(
  row: OperationalCostRow
) {
  return (
    operationalServiceAmount(
      row
    ) +
    operationalStaffExpenses(
      row
    )
  );
}

function operationalCoreActualTotal(
  row: OperationalCostRow,
  payingPassengers: number,
  freePassengers: number
) {
  if (
    row.scope !== "CORE"
  ) {
    return 0;
  }

  const serviceAmount =
    operationalServiceAmount(
      row
    );

  const staffExpenses =
    operationalStaffExpenses(
      row
    );

  const totalTravelers =
    Math.max(
      payingPassengers,
      0
    ) +
    Math.max(
      freePassengers,
      0
    );

  /*
   * PER_PERSON means the supplier charges
   * each actual traveler.
   *
   * Example:
   * Ferry €45 × 33 travelers.
   *
   * Staff expenses are group expenses and
   * are therefore added once.
   */
  if (
    row.pricingBasis ===
    "PER_PERSON"
  ) {
    return (
      serviceAmount *
        totalTravelers +
      staffExpenses
    );
  }

  /*
   * GROUP_TOTAL / PER_SERVICE / PER_VEHICLE
   * are treated as the entered group/service amount.
   *
   * For CORE services the supplier's actual group cost
   * is recovered from paying pilgrims.
   */
  return (
    serviceAmount +
    staffExpenses
  );
}

function operationalDisplayTotal(
  row: OperationalCostRow,
  payingPassengers: number,
  freePassengers: number
) {
  if (
    row.scope === "CORE"
  ) {
    return operationalCoreActualTotal(
      row,
      payingPassengers,
      freePassengers
    );
  }

  /*
   * PRE / POST services are optional standalone rates.
   * Do not multiply them by the core group's passenger count.
   */
  return operationalQuotedAmount(
    row
  );
}

function calculateRatioFreePlaces(
  payingPassengers: number,
  setup: ComplimentarySetup
) {
  if (
    !setup.useFreePlaceRule ||
    setup.freePlaceRatio <= 0
  ) {
    return 0;
  }

  return Math.floor(
    Math.max(
      payingPassengers,
      0
    ) /
      Math.max(
        setup.freePlaceRatio,
        1
      )
  );
}

function calculateComplimentaryPassengers(
  payingPassengers: number,
  setup: ComplimentarySetup
) {
  const ratioFree =
    calculateRatioFreePlaces(
      payingPassengers,
      setup
    );

  const priestFree =
    setup.priestComplimentary
      ? Math.max(
          Math.floor(
            setup.priestCount
          ),
          0
        )
      : 0;

  const leaderFree =
    setup.groupLeaderComplimentary
      ? Math.max(
          Math.floor(
            setup.groupLeaderCount
          ),
          0
        )
      : 0;

  const priestUsingPool =
    setup.priestComplimentary &&
    setup.priestComplimentaryBasis ===
      "USES_FREE_PLACE"
      ? priestFree
      : 0;

  const leaderUsingPool =
    setup.groupLeaderComplimentary &&
    setup.groupLeaderComplimentaryBasis ===
      "USES_FREE_PLACE"
      ? leaderFree
      : 0;

  const namedUsingPool =
    priestUsingPool +
    leaderUsingPool;

  const priestAdditional =
    setup.priestComplimentary &&
    setup.priestComplimentaryBasis ===
      "ADDITIONAL"
      ? priestFree
      : 0;

  const leaderAdditional =
    setup.groupLeaderComplimentary &&
    setup.groupLeaderComplimentaryBasis ===
      "ADDITIONAL"
      ? leaderFree
      : 0;

  const namedAdditional =
    priestAdditional +
    leaderAdditional;

  const poolOverflow =
    Math.max(
      namedUsingPool -
        ratioFree,
      0
    );

  const additionalFree =
    Math.max(
      Math.floor(
        setup.additionalFreePassengers
      ),
      0
    );

  const totalComplimentary =
    ratioFree +
    poolOverflow +
    namedAdditional +
    additionalFree;

  return {
    ratioFree,

    priestFree,

    leaderFree,

    namedUsingPool,

    namedAdditional,

    poolOverflow,

    additionalFree,

    totalComplimentary,
  };
}

function calculateGroupLeaderAllowance(
  payingPassengers: number,
  setup: ComplimentarySetup
) {
  if (
    !setup.groupLeaderAllowanceEnabled
  ) {
    return 0;
  }

  return (
    Math.max(
      payingPassengers,
      0
    ) *
    Math.max(
      setup.groupLeaderAllowancePerPayingPax,
      0
    )
  );
}

function calculateSellingPricesForPax(
  args: {
    paxCount: number;

    hotels: HotelRow[];

    fixedCostRows: FixedCostRow[];

    operationalCostRows:
      OperationalCostRow[];

    pricing: PricingControls;

    complimentarySetup:
      ComplimentarySetup;
  }
) {
  const payingPassengers =
    Math.max(
      Math.floor(
        toNumber(
          args.paxCount
        )
      ),
      1
    );

  const complimentary =
    calculateComplimentaryPassengers(
      payingPassengers,
      args.complimentarySetup
    );

  const freePassengers =
    complimentary.totalComplimentary;

  const coreHotels =
    args.hotels.filter(
      (hotel) =>
        hotel.stayType === "CORE"
    );

  const hotelSinglePerPerson =
    coreHotels.reduce(
      (sum, row) =>
        sum +
        toNumber(
          row.singlePerPerson
        ) *
          toNumber(
            row.nights
          ),
      0
    );

  const hotelDoubleTwinPerPerson =
    coreHotels.reduce(
      (sum, row) =>
        sum +
        toNumber(
          row.doubleTwinPerPerson
        ) *
          toNumber(
            row.nights
          ),
      0
    );

  const hotelTriplePerPerson =
    coreHotels.reduce(
      (sum, row) =>
        sum +
        toNumber(
          row.triplePerPerson
        ) *
          toNumber(
            row.nights
          ),
      0
    );

  const fixedCostPerPerson =
    args.fixedCostRows.reduce(
      (sum, row) =>
        sum +
        fixedCostRowTotal(
          row
        ),
      0
    );

  const operationalTotal =
    args.operationalCostRows
      .filter(
        (row) =>
          row.scope === "CORE"
      )
      .reduce(
        (sum, row) =>
          sum +
          operationalCoreActualTotal(
            row,
            payingPassengers,
            freePassengers
          ),
        0
      );

  const groupLeaderAllowanceTotal =
    calculateGroupLeaderAllowance(
      payingPassengers,
      args.complimentarySetup
    );

  const result =
    calculateNetGroupPricing({
      payingPassengers,

      freePassengers,

      hotelSinglePerPayingPax:
        hotelSinglePerPerson,

      hotelDoubleTwinPerPayingPax:
        hotelDoubleTwinPerPerson,

      hotelTriplePerPayingPax:
        hotelTriplePerPerson,

      otherPerPersonCost:
        fixedCostPerPerson,

      groupOperationalCost:
        operationalTotal +
        groupLeaderAllowanceTotal,

      epochMarkupPercent:
        args.pricing.markupMode ===
        "PERCENTAGE"
          ? Math.max(
              args.pricing
                .epochMarkupPercent,
              0
            )
          : 0,
    });

  const fixedMarkupPerPerson =
    args.pricing.markupMode ===
    "FIXED_PER_PERSON"
      ? Math.max(
          args.pricing
            .epochMarkupPerPerson,
          0
        )
      : 0;

  return {
    singleSellingPrice:
      result.calculatedNetRate
        .single +
      fixedMarkupPerPerson,

    doubleTwinSellingPrice:
      result.calculatedNetRate
        .doubleTwin +
      fixedMarkupPerPerson,

    tripleSellingPrice:
      result.calculatedNetRate
        .triple +
      fixedMarkupPerPerson,

    freePassengers,

    groupLeaderAllowanceTotal,

    fixedMarkupPerPerson,
  };
}

function getActivePrice(
  pricingMode: PricingMode,
  calculatedPrice: number,
  manualPrice: number
) {
  if (
    pricingMode === "MANUAL" &&
    manualPrice > 0
  ) {
    return manualPrice;
  }

  return calculatedPrice;
}

function legacyStaffTotal(
  row: LegacyStaffCostRow
) {
  const service =
    toNumber(row.dailyRate) *
    toNumber(row.days);

  const hotel =
    toNumber(
      row.hotelSinglePerNight
    ) *
    toNumber(row.nights);

  const meals =
    toNumber(row.mealsPerDay) *
    toNumber(row.mealDays);

  const extras =
    toNumber(row.extras);

  return (
    service +
    hotel +
    meals +
    extras
  );
}

function legacyDriverTotal(
  row: LegacyDriverCostRow
) {
  const hotel =
    toNumber(
      row.hotelSinglePerNight
    ) *
    toNumber(row.nights);

  const meals =
    toNumber(row.mealsPerDay) *
    toNumber(row.mealDays);

  const extras =
    toNumber(row.extras);

  return (
    hotel +
    meals +
    extras
  );
}

function normalizeSavedOperationalRow(
  row: SavedOperationalCostRow
): OperationalCostRow {
  const category =
    normalizeOperationalCategory(
      row.category
    );

  const hasNewCostMode =
    row.costMode === "TOTAL" ||
    row.costMode === "DAILY";

  /*
   * Old quotations only had dailyRate / numberOfDays.
   * Preserve those calculations by treating them as DAILY.
   */
  const costMode =
    hasNewCostMode
      ? normalizeOperationalCostMode(
          row.costMode
        )
      : "DAILY";

  return {
    label:
      typeof row.label ===
      "string"
        ? row.label
        : "",

    category,

    scope:
      normalizeOperationalScope(
        row.scope
      ),

    costMode,

    pricingBasis:
      normalizeOperationalPricingBasis(
        row.pricingBasis,
        category
      ),

    totalContractCost:
      toNumber(
        row.totalContractCost
      ),

    dailyRate:
      toNumber(
        row.dailyRate
      ),

    numberOfDays:
      toNumber(
        row.numberOfDays
      ) || 1,

    hotelPerNight:
      toNumber(
        row.hotelPerNight
      ),

    hotelNights:
      toNumber(
        row.hotelNights
      ),

    airfareTransport:
      toNumber(
        row.airfareTransport
      ),

    mealsPerDay:
      toNumber(
        row.mealsPerDay
      ),

    mealDays:
      toNumber(
        row.mealDays
      ),

    otherExpenses:
      toNumber(
        row.otherExpenses
      ),
  };
}

export default function QuoteCreateForm({
  tours,
  agents,
  initialData,
  mode = "create",
}: Props) {
  const router =
    useRouter();

  const [
    purpose,
    setPurpose,
  ] =
    useState<QuotePurpose>(
      "CUSTOM_REQUEST"
    );

  const [
    tourId,
    setTourId,
  ] =
    useState("");

  const [
    departureDateId,
    setDepartureDateId,
  ] =
    useState("");

  const [
    agentId,
    setAgentId,
  ] =
    useState("");

  const [
    agentCompany,
    setAgentCompany,
  ] =
    useState("");

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    recipientName,
    setRecipientName,
  ] =
    useState("");

  const [
    recipientEmail,
    setRecipientEmail,
  ] =
    useState("");

  const [
    internalNotes,
    setInternalNotes,
  ] =
    useState("");

  const [
    termsAndNotes,
    setTermsAndNotes,
  ] =
    useState("");

  const [currency] =
    useState("EUR");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    templateId,
    setTemplateId,
  ] =
    useState<
      string | null
    >(null);

  const [
    seasonalRate,
    setSeasonalRate,
  ] =
    useState<
      SeasonalRateReference | null
    >(null);

  const [
    seasonalRateMessage,
    setSeasonalRateMessage,
  ] =
    useState(
      "Select a tour and requested dates to load the seasonal reference rate."
    );

  const [
    clientDocumentTitle,
    setClientDocumentTitle,
  ] =
    useState("");

  const [
    briefItinerary,
    setBriefItinerary,
  ] =
    useState("");

  const [
    briefItineraryTouched,
    setBriefItineraryTouched,
  ] =
    useState(false);

  const [
    clientIncludes,
    setClientIncludes,
  ] =
    useState("");

  const [
    clientExcludes,
    setClientExcludes,
  ] =
    useState("");

  const [
    paymentPolicy,
    setPaymentPolicy,
  ] =
    useState("");

  const [
    cancellationPolicy,
    setCancellationPolicy,
  ] =
    useState("");

  const [
    clientOfferNotes,
    setClientOfferNotes,
  ] =
    useState("");

  const [
    validUntil,
    setValidUntil,
  ] =
    useState("");

  const [
    availabilityNotes,
    setAvailabilityNotes,
  ] =
    useState("");

  const [
    nextStepNotes,
    setNextStepNotes,
  ] =
    useState("");

  const [
    pricingMode,
    setPricingMode,
  ] =
    useState<PricingMode>(
      "CALCULATED"
    );

  const [
    group,
    setGroup,
  ] =
    useState<GroupSetup>({
      totalPassengers: 20,

      freePassengers: 2,

      startDate: "",

      endDate: "",
    });

  const [
    complimentarySetup,
    setComplimentarySetup,
  ] =
    useState<ComplimentarySetup>(
      DEFAULT_COMPLIMENTARY_SETUP
    );

  const [
    pricing,
    setPricing,
  ] =
    useState<PricingControls>(
      DEFAULT_PRICING
    );

  const [
    paxPricingRows,
    setPaxPricingRows,
  ] =
    useState<PaxPricingRow[]>([
      createEmptyPaxPricingRow(
        20
      ),
      createEmptyPaxPricingRow(
        25
      ),
      createEmptyPaxPricingRow(
        30
      ),
      createEmptyPaxPricingRow(
        35
      ),
      createEmptyPaxPricingRow(
        40
      ),
    ]);

  const [
    hotels,
    setHotels,
  ] =
    useState<HotelRow[]>([
      createEmptyHotelRow(),
    ]);

  const [
    fixedCostRows,
    setFixedCostRows,
  ] =
    useState<FixedCostRow[]>([
      createEmptyFixedCostRow(),
    ]);

  const [
    operationalCostRows,
    setOperationalCostRows,
  ] =
    useState<
      OperationalCostRow[]
    >([
      createEmptyOperationalCostRow(),
    ]);

  const payingPassengers =
    Math.max(
      Math.floor(
        toNumber(
          group.totalPassengers
        )
      ),
      1
    );

  const complimentarySummary =
    useMemo(
      () =>
        calculateComplimentaryPassengers(
          payingPassengers,
          complimentarySetup
        ),
      [
        payingPassengers,
        complimentarySetup,
      ]
    );

  const totalComplimentaryPassengers =
    complimentarySummary
      .totalComplimentary;

  useEffect(() => {
    setGroup(
      (prev) => {
        if (
          prev.freePassengers ===
          totalComplimentaryPassengers
        ) {
          return prev;
        }

        return {
          ...prev,

          freePassengers:
            totalComplimentaryPassengers,
        };
      }
    );
  }, [
    totalComplimentaryPassengers,
  ]);

  useEffect(() => {
    setDepartureDateId("");

    if (
      !tourId ||
      !group.startDate
    ) {
      setSeasonalRate(null);

      setSeasonalRateMessage(
        "Select a tour and requested dates to load the seasonal reference rate."
      );

      return;
    }

    const run =
      async () => {
        try {
          const params =
            new URLSearchParams({
              startDate:
                group.startDate,
            });

          if (
            group.endDate
          ) {
            params.set(
              "endDate",
              group.endDate
            );
          }

          const res =
            await fetch(
              `/api/admin/tours/${tourId}/seasonal-rate?${params.toString()}`
            );

          const data =
            (await res.json()) as {
              ok?: boolean;
              error?: string;

              rate?:
                | SeasonalRateReference
                | null;
            };

          if (
            !res.ok ||
            !data.ok
          ) {
            throw new Error(
              data.error ||
                "Failed to load seasonal rate."
            );
          }

          if (!data.rate) {
            setSeasonalRate(
              null
            );

            setSeasonalRateMessage(
              "No seasonal rate covers the full requested date range. Enter or update the tour seasonal rate before finalizing the quote."
            );

            return;
          }

          setSeasonalRate(
            data.rate
          );

          setSeasonalRateMessage(
            "Seasonal reference rate loaded from the selected tour."
          );
        } catch (
          error
        ) {
          console.error(
            "Failed to load seasonal reference rate",
            error
          );

          setSeasonalRate(
            null
          );

          setSeasonalRateMessage(
            "Unable to load the seasonal reference rate."
          );
        }
      };

    void run();
  }, [
    tourId,
    group.startDate,
    group.endDate,
  ]);

  useEffect(() => {
    if (!agentId) {
      setAgentCompany("");

      return;
    }

    const agent =
      agents.find(
        (item) =>
          item.id === agentId
      );

    if (!agent) {
      return;
    }

    setRecipientName(
      agent.fullName || ""
    );

    setRecipientEmail(
      agent.email || ""
    );

    setAgentCompany(
      agent.travelAgency ||
        ""
    );
  }, [
    agentId,
    agents,
  ]);

  useEffect(() => {
    if (!tourId) {
      if (!briefItineraryTouched) {
        setBriefItinerary("");
      }
      return;
    }

    if (briefItineraryTouched) {
      return;
    }

    const selectedTour =
      tours.find(
        (tour) =>
          tour.id === tourId
      );

    if (!selectedTour) {
      return;
    }

    setBriefItinerary(
      selectedTour.overviewItinerary?.trim() ||
      selectedTour.itinerary?.trim() ||
      ""
    );
  }, [
    tourId,
    tours,
    briefItineraryTouched,
  ]);

  useEffect(() => {
    if (!initialData) {
      return;
    }

    setTitle(
      initialData.title || ""
    );

    setRecipientName(
      initialData.recipientName ||
        ""
    );

    setRecipientEmail(
      initialData.recipientEmail ||
        ""
    );

    setInternalNotes(
      initialData.internalNotes ||
        ""
    );

    setTermsAndNotes(
      initialData.termsAndNotes ||
        ""
    );

    setTourId(
      initialData.tourId ||
        ""
    );

    setDepartureDateId(
      initialData.departureDateId ||
        ""
    );

    setTemplateId(
      initialData.templateId ||
        null
    );

    if (
      initialData.purpose ===
        "CUSTOM_REQUEST" ||
      initialData.purpose ===
        "TOUR_SETUP"
    ) {
      setPurpose(
        initialData.purpose
      );
    }

    setClientDocumentTitle(
      initialData.clientDocumentTitle ||
        ""
    );

    setClientIncludes(
      initialData.clientIncludes ||
        ""
    );

    setClientExcludes(
      initialData.clientExcludes ||
        ""
    );

    setPaymentPolicy(
      initialData.paymentPolicy ||
        ""
    );

    setCancellationPolicy(
      initialData.cancellationPolicy ||
        ""
    );

    setClientOfferNotes(
      initialData.clientOfferNotes ||
        ""
    );

    setValidUntil(
      initialData.validUntil
        ? new Date(
            initialData.validUntil
          )
            .toISOString()
            .split("T")[0]
        : ""
    );

    setAvailabilityNotes(
      initialData.availabilityNotes ||
        ""
    );

    setNextStepNotes(
      initialData.nextStepNotes ||
        ""
    );

    const matchedAgent =
      agents.find(
        (agent) =>
          agent.email ===
            (initialData.recipientEmail ||
              "") ||
          agent.fullName ===
            (initialData.recipientName ||
              "")
      );

    if (matchedAgent) {
      setAgentId(
        matchedAgent.id
      );

      setAgentCompany(
        matchedAgent.travelAgency ||
          ""
      );
    }

    const summary =
      initialData.quoteBuilderSummary &&
      typeof initialData.quoteBuilderSummary ===
        "object"
        ? (initialData.quoteBuilderSummary as QuoteBuilderSummary)
        : null;

    const savedBriefItinerary =
      typeof summary?.briefItinerary === "string"
        ? summary.briefItinerary
        : "";

    setBriefItinerary(
      savedBriefItinerary
    );

    setBriefItineraryTouched(
      Boolean(
        savedBriefItinerary.trim()
      )
    );

    const savedFreePassengers =
      typeof summary?.freePassengers ===
      "number"
        ? Math.max(
            Math.floor(
              summary.freePassengers
            ),
            0
          )
        : 0;

    const savedPayingPassengers =
      typeof summary?.payingPassengers ===
      "number"
        ? Math.max(
            Math.floor(
              summary.payingPassengers
            ),
            1
          )
        : typeof summary?.totalPassengers ===
            "number"
          ? Math.max(
              Math.floor(
                summary.totalPassengers
              ) -
                savedFreePassengers,
              1
            )
          : 20;

    setGroup(
      (prev) => ({
        ...prev,

        startDate:
          summary?.startDate ||
          "",

        endDate:
          summary?.endDate ||
          "",

        totalPassengers:
          savedPayingPassengers,

        freePassengers:
          savedFreePassengers,
      })
    );

    if (
      summary?.complimentarySetup
    ) {
      setComplimentarySetup({
        ...DEFAULT_COMPLIMENTARY_SETUP,
        ...summary.complimentarySetup,

        freePlaceRatio:
          Math.max(
            toNumber(
              summary.complimentarySetup
                .freePlaceRatio
            ) || 10,
            1
          ),

        priestCount:
          Math.max(
            toNumber(
              summary.complimentarySetup
                .priestCount
            ) || 1,
            1
          ),

        priestComplimentaryBasis:
          summary.complimentarySetup
            .priestComplimentaryBasis ===
          "ADDITIONAL"
            ? "ADDITIONAL"
            : "USES_FREE_PLACE",

        groupLeaderCount:
          Math.max(
            toNumber(
              summary.complimentarySetup
                .groupLeaderCount
            ) || 1,
            1
          ),

        groupLeaderComplimentaryBasis:
          summary.complimentarySetup
            .groupLeaderComplimentaryBasis ===
          "ADDITIONAL"
            ? "ADDITIONAL"
            : "USES_FREE_PLACE",

        additionalFreePassengers:
          Math.max(
            toNumber(
              summary.complimentarySetup
                .additionalFreePassengers
            ),
            0
          ),

        groupLeaderAllowancePerPayingPax:
          Math.max(
            toNumber(
              summary.complimentarySetup
                .groupLeaderAllowancePerPayingPax
            ),
            0
          ),
      });
    } else if (
      savedFreePassengers > 0
    ) {
      setComplimentarySetup({
        ...DEFAULT_COMPLIMENTARY_SETUP,

        useFreePlaceRule: false,

        priestComplimentary: false,

        groupLeaderComplimentary: false,

        additionalFreePassengers:
          savedFreePassengers,
      });
    }

    setPricing({
      markupMode:
        summary?.markupMode ===
        "FIXED_PER_PERSON"
          ? "FIXED_PER_PERSON"
          : "PERCENTAGE",

      epochMarkupPercent:
        typeof summary?.epochMarkupPercent ===
        "number"
          ? Math.max(
              summary.epochMarkupPercent,
              0
            )
          : 0,

      epochMarkupPerPerson:
        typeof summary?.epochMarkupPerPerson ===
        "number"
          ? Math.max(
              summary.epochMarkupPerPerson,
              0
            )
          : 0,
    });

    if (
      summary?.pricingMode ===
        "CALCULATED" ||
      summary?.pricingMode ===
        "MANUAL"
    ) {
      setPricingMode(
        summary.pricingMode
      );
    }

    if (
      Array.isArray(
        summary?.paxPricingRows
      ) &&
      summary.paxPricingRows
        .length
    ) {
      setPaxPricingRows(
        summary.paxPricingRows.map(
          (row) => ({
            paxCount:
              toNumber(
                row.paxCount
              ),

            calculatedSinglePrice:
              toNumber(
                row.calculatedSinglePrice
              ),

            calculatedDoubleTwinPrice:
              toNumber(
                row.calculatedDoubleTwinPrice
              ),

            calculatedTriplePrice:
              toNumber(
                row.calculatedTriplePrice
              ),

            manualSinglePrice:
              toNumber(
                row.manualSinglePrice
              ),

            manualDoubleTwinPrice:
              toNumber(
                row.manualDoubleTwinPrice
              ),

            manualTriplePrice:
              toNumber(
                row.manualTriplePrice
              ),
          })
        )
      );
    }

    if (
      Array.isArray(
        summary?.hotels
      ) &&
      summary.hotels.length
    ) {
      setHotels(
        summary.hotels.map(
          (row) => ({
            hotelName:
              row.hotelName ||
              "",

            destination:
              row.destination ||
              "",

            nights:
              toNumber(
                row.nights
              ),

            singlePerPerson:
              toNumber(
                row.singlePerPerson
              ),

            doubleTwinPerPerson:
              toNumber(
                row.doubleTwinPerPerson
              ),

            triplePerPerson:
              toNumber(
                row.triplePerPerson
              ),

            stayType:
              row.stayType ||
              "CORE",
          })
        )
      );
    }

    if (
      Array.isArray(
        summary?.fixedCostRows
      ) &&
      summary.fixedCostRows
        .length
    ) {
      setFixedCostRows(
        summary.fixedCostRows.map(
          (row): FixedCostRow => ({
            label:
              row.label || "",

            category:
              normalizeFixedCostCategory(
                row.category
              ),

            quantity:
              toNumber(
                row.quantity
              ),

            unitCost:
              toNumber(
                row.unitCost
              ),
          })
        )
      );
    } else {
      const migratedFixedRows:
        FixedCostRow[] = [];

      if (
        Array.isArray(
          summary?.entranceRows
        )
      ) {
        migratedFixedRows.push(
          ...summary.entranceRows
            .filter(
              (row) =>
                row.siteName
            )
            .map(
              (
                row
              ): FixedCostRow => ({
                label:
                  row.siteName ||
                  "",

                category:
                  "ENTRANCE",

                quantity: 1,

                unitCost:
                  toNumber(
                    row.amountPerPerson
                  ),
              })
            )
        );
      }

      if (
        Array.isArray(
          summary?.tipRows
        )
      ) {
        migratedFixedRows.push(
          ...summary.tipRows
            .filter(
              (row) =>
                row.tipType
            )
            .map(
              (
                row
              ): FixedCostRow => ({
                label:
                  row.tipType ||
                  "",

                category:
                  "TIPS",

                quantity: 1,

                unitCost:
                  toNumber(
                    row.amountPerDayPerPerson
                  ) *
                  toNumber(
                    row.totalDays
                  ),
              })
            )
        );
      }

      if (
        Array.isArray(
          summary?.otherFixedRows
        )
      ) {
        migratedFixedRows.push(
          ...summary.otherFixedRows
            .filter(
              (row) =>
                row.label
            )
            .map(
              (
                row
              ): FixedCostRow => ({
                label:
                  row.label ||
                  "",

                category:
                  "OTHER",

                quantity:
                  toNumber(
                    row.quantity
                  ),

                unitCost:
                  toNumber(
                    row.amountPerUnit
                  ),
              })
            )
        );
      }

      if (
        migratedFixedRows.length
      ) {
        setFixedCostRows(
          migratedFixedRows
        );
      }
    }

    if (
      Array.isArray(
        summary?.operationalCostRows
      ) &&
      summary
        .operationalCostRows
        .length
    ) {
      setOperationalCostRows(
        summary.operationalCostRows.map(
          normalizeSavedOperationalRow
        )
      );
    } else {
      const migratedOperationalRows:
        OperationalCostRow[] =
        [];

      if (
        Array.isArray(
          summary?.variableCostRows
        )
      ) {
        migratedOperationalRows.push(
          ...summary.variableCostRows
            .filter(
              (row) =>
                row.label
            )
            .map(
              (row): OperationalCostRow => ({
                ...createEmptyOperationalCostRow(),

                label:
                  row.label ||
                  "",

                category:
                  "OTHER",

                scope:
                  "CORE",

                costMode:
                  "TOTAL",

                pricingBasis:
                  row.costBasis ===
                  "PER_PERSON"
                    ? "PER_PERSON"
                    : "GROUP_TOTAL",

                totalContractCost:
                  toNumber(
                    row.totalCost
                  ),
              })
            )
        );
      }

      if (
        Array.isArray(
          summary?.tourManagerRows
        )
      ) {
        migratedOperationalRows.push(
          ...summary.tourManagerRows
            .filter(
              (row) =>
                row.label ||
                legacyStaffTotal(
                  row
                ) > 0
            )
            .map(
              (row): OperationalCostRow => ({
                ...createEmptyOperationalCostRow(),

                label:
                  row.label ||
                  "Tour Manager",

                category:
                  "TOUR_MANAGER",

                scope:
                  "CORE",

                costMode:
                  "DAILY",

                pricingBasis:
                  "GROUP_TOTAL",

                dailyRate:
                  toNumber(
                    row.dailyRate
                  ),

                numberOfDays:
                  toNumber(
                    row.days
                  ) || 1,

                hotelPerNight:
                  toNumber(
                    row.hotelSinglePerNight
                  ),

                hotelNights:
                  toNumber(
                    row.nights
                  ),

                mealsPerDay:
                  toNumber(
                    row.mealsPerDay
                  ),

                mealDays:
                  toNumber(
                    row.mealDays
                  ),

                otherExpenses:
                  toNumber(
                    row.extras
                  ),
              })
            )
        );
      }

      if (
        Array.isArray(
          summary?.guideRows
        )
      ) {
        migratedOperationalRows.push(
          ...summary.guideRows
            .filter(
              (row) =>
                row.label ||
                legacyStaffTotal(
                  row
                ) > 0
            )
            .map(
              (row): OperationalCostRow => ({
                ...createEmptyOperationalCostRow(),

                label:
                  row.label ||
                  "Guide",

                category:
                  "TOUR_GUIDE",

                scope:
                  "CORE",

                costMode:
                  "DAILY",

                pricingBasis:
                  "GROUP_TOTAL",

                dailyRate:
                  toNumber(
                    row.dailyRate
                  ),

                numberOfDays:
                  toNumber(
                    row.days
                  ) || 1,

                hotelPerNight:
                  toNumber(
                    row.hotelSinglePerNight
                  ),

                hotelNights:
                  toNumber(
                    row.nights
                  ),

                mealsPerDay:
                  toNumber(
                    row.mealsPerDay
                  ),

                mealDays:
                  toNumber(
                    row.mealDays
                  ),

                otherExpenses:
                  toNumber(
                    row.extras
                  ),
              })
            )
        );
      }

      if (
        Array.isArray(
          summary?.driverRows
        )
      ) {
        migratedOperationalRows.push(
          ...summary.driverRows
            .filter(
              (row) =>
                row.label ||
                legacyDriverTotal(
                  row
                ) > 0
            )
            .map(
              (row): OperationalCostRow => ({
                ...createEmptyOperationalCostRow(),

                label:
                  row.label ||
                  "Driver",

                category:
                  "DRIVER",

                scope:
                  "CORE",

                costMode:
                  "TOTAL",

                pricingBasis:
                  "GROUP_TOTAL",

                totalContractCost:
                  0,

                hotelPerNight:
                  toNumber(
                    row.hotelSinglePerNight
                  ),

                hotelNights:
                  toNumber(
                    row.nights
                  ),

                mealsPerDay:
                  toNumber(
                    row.mealsPerDay
                  ),

                mealDays:
                  toNumber(
                    row.mealDays
                  ),

                otherExpenses:
                  toNumber(
                    row.extras
                  ),
              })
            )
        );
      }

      if (
        migratedOperationalRows.length
      ) {
        setOperationalCostRows(
          migratedOperationalRows
        );
      }
    }
  }, [
    initialData,
    agents,
  ]);

  const calculations =
    useMemo(() => {
      const currentPayingPassengers =
        Math.max(
          Math.floor(
            toNumber(
              group.totalPassengers
            )
          ),
          1
        );

      const complimentary =
        calculateComplimentaryPassengers(
          currentPayingPassengers,
          complimentarySetup
        );

      const freePassengers =
        complimentary
          .totalComplimentary;

      const currentTotalTravelers =
        currentPayingPassengers +
        freePassengers;

      const coreHotels =
        hotels.filter(
          (hotel) =>
            hotel.stayType ===
            "CORE"
        );

      const preHotels =
        hotels.filter(
          (hotel) =>
            hotel.stayType ===
            "PRE"
        );

      const postHotels =
        hotels.filter(
          (hotel) =>
            hotel.stayType ===
            "POST"
        );

      const fixedSinglePerPerson =
        coreHotels.reduce(
          (sum, hotel) =>
            sum +
            toNumber(
              hotel.singlePerPerson
            ) *
              toNumber(
                hotel.nights
              ),
          0
        );

      const fixedDoubleTwinPerPerson =
        coreHotels.reduce(
          (sum, hotel) =>
            sum +
            toNumber(
              hotel.doubleTwinPerPerson
            ) *
              toNumber(
                hotel.nights
              ),
          0
        );

      const fixedTriplePerPerson =
        coreHotels.reduce(
          (sum, hotel) =>
            sum +
            toNumber(
              hotel.triplePerPerson
            ) *
              toNumber(
                hotel.nights
              ),
          0
        );

      /*
       * PRE / POST hotel rates remain standalone optional
       * per-person add-ons and do not enter the core rate.
       */
      const preStaySinglePerPerson =
        preHotels.reduce(
          (sum, hotel) =>
            sum +
            toNumber(
              hotel.singlePerPerson
            ) *
              toNumber(
                hotel.nights
              ),
          0
        );

      const preStayDoubleTwinPerPerson =
        preHotels.reduce(
          (sum, hotel) =>
            sum +
            toNumber(
              hotel.doubleTwinPerPerson
            ) *
              toNumber(
                hotel.nights
              ),
          0
        );

      const preStayTriplePerPerson =
        preHotels.reduce(
          (sum, hotel) =>
            sum +
            toNumber(
              hotel.triplePerPerson
            ) *
              toNumber(
                hotel.nights
              ),
          0
        );

      const postStaySinglePerPerson =
        postHotels.reduce(
          (sum, hotel) =>
            sum +
            toNumber(
              hotel.singlePerPerson
            ) *
              toNumber(
                hotel.nights
              ),
          0
        );

      const postStayDoubleTwinPerPerson =
        postHotels.reduce(
          (sum, hotel) =>
            sum +
            toNumber(
              hotel.doubleTwinPerPerson
            ) *
              toNumber(
                hotel.nights
              ),
          0
        );

      const postStayTriplePerPerson =
        postHotels.reduce(
          (sum, hotel) =>
            sum +
            toNumber(
              hotel.triplePerPerson
            ) *
              toNumber(
                hotel.nights
              ),
          0
        );

      const fixedCostsSectionTotal =
        fixedCostRows.reduce(
          (sum, row) =>
            sum +
            fixedCostRowTotal(
              row
            ),
          0
        );

      const fixedCostPerPerson =
        fixedCostsSectionTotal;

      /*
       * CORE OPERATIONAL COSTS ONLY.
       *
       * PRE / POST operational services are not part
       * of the main tour rate.
       */
      const baseOperationalTotal =
        operationalCostRows
          .filter(
            (row) =>
              row.scope ===
              "CORE"
          )
          .reduce(
            (sum, row) =>
              sum +
              operationalCoreActualTotal(
                row,
                currentPayingPassengers,
                freePassengers
              ),
            0
          );

      const operationalCostsSectionTotal =
        baseOperationalTotal;

      const operationalPerPerson =
        currentPayingPassengers >
        0
          ? baseOperationalTotal /
            currentPayingPassengers
          : 0;

      const leaderAllowanceTotal =
        calculateGroupLeaderAllowance(
          currentPayingPassengers,
          complimentarySetup
        );

      const leaderAllowancePerPayingPassenger =
        currentPayingPassengers >
        0
          ? leaderAllowanceTotal /
            currentPayingPassengers
          : 0;

      /*
       * PRE / POST optional operational services.
       * These stay separate from core pricing.
       */
      const preOperationalRows =
        operationalCostRows.filter(
          (row) =>
            row.scope === "PRE"
        );

      const postOperationalRows =
        operationalCostRows.filter(
          (row) =>
            row.scope === "POST"
        );

      const preOperationalOptionalTotal =
        preOperationalRows.reduce(
          (sum, row) =>
            sum +
            operationalQuotedAmount(
              row
            ),
          0
        );

      const postOperationalOptionalTotal =
        postOperationalRows.reduce(
          (sum, row) =>
            sum +
            operationalQuotedAmount(
              row
            ),
          0
        );

      const doubleTwinNetCostBeforeFree =
        fixedDoubleTwinPerPerson +
        fixedCostPerPerson +
        operationalPerPerson +
        leaderAllowancePerPayingPassenger;

      /*
       * Complimentary traveler hotel + per-person services
       * are recovered from paying pilgrims.
       *
       * Current complimentary hotel basis remains
       * Double/Twin.
       */
      const freeCostTotal =
        freePassengers *
        (
          fixedDoubleTwinPerPerson +
          fixedCostPerPerson
        );

      const freeCostPerPayingPassenger =
        currentPayingPassengers >
        0
          ? freeCostTotal /
            currentPayingPassengers
          : 0;

      const singleNetCost =
        fixedSinglePerPerson +
        fixedCostPerPerson +
        operationalPerPerson +
        leaderAllowancePerPayingPassenger +
        freeCostPerPayingPassenger;

      const doubleTwinNetCost =
        fixedDoubleTwinPerPerson +
        fixedCostPerPerson +
        operationalPerPerson +
        leaderAllowancePerPayingPassenger +
        freeCostPerPayingPassenger;

      const tripleNetCost =
        fixedTriplePerPerson +
        fixedCostPerPerson +
        operationalPerPerson +
        leaderAllowancePerPayingPassenger +
        freeCostPerPayingPassenger;

      return {
        totalPassengers:
          currentTotalTravelers,

        totalTravelers:
          currentTotalTravelers,

        freePassengers,

        payingPassengers:
          currentPayingPassengers,

        calculatedRatioFreePlaces:
          complimentary.ratioFree,

        priestFreePlaces:
          complimentary.priestFree,

        groupLeaderFreePlaces:
          complimentary.leaderFree,

        additionalFreePlaces:
          complimentary.additionalFree,

        fixedSinglePerPerson,

        fixedDoubleTwinPerPerson,

        fixedTriplePerPerson,

        preStaySinglePerPerson,

        preStayDoubleTwinPerPerson,

        preStayTriplePerPerson,

        postStaySinglePerPerson,

        postStayDoubleTwinPerPerson,

        postStayTriplePerPerson,

        fixedCostsSectionTotal,

        fixedCostPerPerson,

        baseOperationalTotal,

        operationalCostsSectionTotal,

        operationalPerPerson,

        groupLeaderAllowanceTotal:
          leaderAllowanceTotal,

        leaderAllowancePerPayingPassenger,

        preOperationalOptionalTotal,

        postOperationalOptionalTotal,

        doubleTwinNetCostBeforeFree,

        freeCostTotal,

        freeCostPerPayingPassenger,

        singleNetCost,

        doubleTwinNetCost,

        tripleNetCost,
      };
    }, [
      group.totalPassengers,
      hotels,
      fixedCostRows,
      operationalCostRows,
      complimentarySetup,
    ]);

  useEffect(() => {
    const newRows =
      paxPricingRows.map(
        (row) => {
          if (
            !row.paxCount
          ) {
            return row;
          }

          const rowCalc =
            calculateSellingPricesForPax({
              paxCount:
                row.paxCount,

              hotels,

              fixedCostRows,

              operationalCostRows,

              pricing,

              complimentarySetup,
            });

          return {
            ...row,

            calculatedSinglePrice:
              Math.round(
                rowCalc.singleSellingPrice
              ),

            calculatedDoubleTwinPrice:
              Math.round(
                rowCalc.doubleTwinSellingPrice
              ),

            calculatedTriplePrice:
              Math.round(
                rowCalc.tripleSellingPrice
              ),
          };
        }
      );

    const hasChanged =
      newRows.some(
        (
          row,
          index
        ) => {
          const current =
            paxPricingRows[
              index
            ];

          return (
            current?.calculatedSinglePrice !==
              row.calculatedSinglePrice ||
            current?.calculatedDoubleTwinPrice !==
              row.calculatedDoubleTwinPrice ||
            current?.calculatedTriplePrice !==
              row.calculatedTriplePrice
          );
        }
      );

    if (hasChanged) {
      setPaxPricingRows(
        newRows
      );
    }
  }, [
    paxPricingRows,
    hotels,
    fixedCostRows,
    operationalCostRows,
    pricing,
    complimentarySetup,
  ]);

  const firstPaxRow =
    useMemo(
      () =>
        paxPricingRows.find(
          (row) =>
            row.paxCount ===
            calculations.payingPassengers
        ) ??
        paxPricingRows.find(
          (row) =>
            row.paxCount > 0
        ) ??
        null,
      [
        paxPricingRows,
        calculations.payingPassengers,
      ]
    );

  const activeSinglePrice =
    firstPaxRow
      ? getActivePrice(
          pricingMode,

          firstPaxRow.calculatedSinglePrice,

          firstPaxRow.manualSinglePrice
        )
      : 0;

  const activeDoubleTwinPrice =
    firstPaxRow
      ? getActivePrice(
          pricingMode,

          firstPaxRow.calculatedDoubleTwinPrice,

          firstPaxRow.manualDoubleTwinPrice
        )
      : 0;

  const activeTriplePrice =
    firstPaxRow
      ? getActivePrice(
          pricingMode,

          firstPaxRow.calculatedTriplePrice,

          firstPaxRow.manualTriplePrice
        )
      : 0;

  const grossSellingPerPerson =
    activeDoubleTwinPrice;

  const retainedRevenuePerPerson =
    grossSellingPerPerson;

  const profitPerPerson =
    retainedRevenuePerPerson -
    calculations.doubleTwinNetCost;

  const totalRevenue =
    grossSellingPerPerson *
    calculations.payingPassengers;

  const retainedRevenue =
    totalRevenue;

  const totalCost =
    calculations.doubleTwinNetCost *
    calculations.payingPassengers;

  const totalProfit =
    retainedRevenue -
    totalCost;

  const marginPercent =
    retainedRevenue > 0
      ? (
          totalProfit /
          retainedRevenue
        ) * 100
      : 0;

  function handleApplyTemplate({
    templateId,
    templateTitle,
    items,
  }: {
    templateId: string;
    templateTitle: string;
    currency: string;
    items: BuilderQuoteItem[];
  }) {
    setTemplateId(
      templateId
    );

    setTitle(
      (prev) =>
        prev.trim()
          ? prev
          : templateTitle
    );

    const hydrated:
      OperationalCostRow[] =
      items.map(
        (item) => {
          const quantity =
            typeof item.quantity ===
            "number"
              ? item.quantity
              : 1;

          const unitPrice =
            typeof item.unitPrice ===
            "number"
              ? item.unitPrice
              : 0;

          const discountAmount =
            typeof item.discountAmount ===
            "number"
              ? item.discountAmount
              : 0;

          const totalCost =
            quantity *
              unitPrice -
            discountAmount;

          return {
            ...createEmptyOperationalCostRow(),

            label:
              item.title ||
              "Template Cost",

            category:
              "OTHER",

            scope:
              "CORE",

            costMode:
              "TOTAL",

            pricingBasis:
              "GROUP_TOTAL",

            totalContractCost:
              Math.max(
                totalCost,
                0
              ),
          };
        }
      );

    setOperationalCostRows(
      (prev) => [
        ...hydrated,
        ...prev,
      ]
    );

    toast.success(
      "Template applied to operational costs"
    );
  }

  function updateHotel(
    index: number,
    patch: Partial<HotelRow>
  ) {
    setHotels(
      (prev) =>
        prev.map(
          (
            row,
            i
          ) =>
            i === index
              ? {
                  ...row,
                  ...patch,
                }
              : row
        )
    );
  }

  function addHotel() {
    setHotels(
      (prev) => [
        ...prev,
        createEmptyHotelRow(),
      ]
    );
  }

  function removeHotel(
    index: number
  ) {
    setHotels(
      (prev) =>
        prev.filter(
          (
            _,
            i
          ) =>
            i !== index
        )
    );
  }

  function updateFixedCostRow(
    index: number,
    patch: Partial<FixedCostRow>
  ) {
    setFixedCostRows(
      (prev) =>
        prev.map(
          (
            row,
            i
          ) =>
            i === index
              ? {
                  ...row,
                  ...patch,
                }
              : row
        )
    );
  }

  function addFixedCostRow(
    row?: FixedCostRow
  ) {
      setFixedCostRows((prev) => [
      ...prev,
      row ?? {
      label: "",
      category: "OTHER",
      quantity: 1,
      unitCost: 0,
    },
  ]);
}

  function removeFixedCostRow(
    index: number
  ) {
    setFixedCostRows(
      (prev) =>
        prev.filter(
          (
            _,
            i
          ) =>
            i !== index
        )
    );
  }

  function updateOperationalCostRow(
    index: number,
    patch:
      Partial<OperationalCostRow>
  ) {
    setOperationalCostRows(
      (prev) =>
        prev.map(
          (
            row,
            i
          ) =>
            i === index
              ? {
                  ...row,
                  ...patch,
                }
              : row
        )
    );
  }

  function addOperationalCostRow() {
    setOperationalCostRows(
      (prev) => [
        ...prev,

        createEmptyOperationalCostRow(),
      ]
    );
  }

  function removeOperationalCostRow(
    index: number
  ) {
    setOperationalCostRows(
      (prev) =>
        prev.filter(
          (
            _,
            i
          ) =>
            i !== index
        )
    );
  }

  function updatePaxPricingRow(
    index: number,
    patch: Partial<PaxPricingRow>
  ) {
    setPaxPricingRows(
      (prev) =>
        prev.map(
          (
            row,
            i
          ) =>
            i === index
              ? {
                  ...row,
                  ...patch,
                }
              : row
        )
    );
  }

  function addPaxPricingRow() {
    setPaxPricingRows(
      (prev) => [
        ...prev,

        createEmptyPaxPricingRow(
          0
        ),
      ]
    );
  }

  function removePaxPricingRow(
    index: number
  ) {
    setPaxPricingRows(
      (prev) =>
        prev.filter(
          (
            _,
            i
          ) =>
            i !== index
        )
    );
  }

  async function onSubmit() {
    setLoading(true);

    try {
      const generatedItems: Array<{
        title: string;
        description: string;
        itemType:
          GeneratedQuoteItemType;
        optional: boolean;
        quantity: number;
        unitPrice: number;
        discountAmount: number;
        taxAmount: number;
        total: number;
        sortOrder: number;
      }> = [
        ...hotels
          .filter(
            (row) =>
              row.hotelName.trim() ||
              row.destination.trim()
          )
          .flatMap(
            (
              row,
              index
            ) => {
              const items: Array<{
                title: string;
                description: string;
                itemType:
                  GeneratedQuoteItemType;
                optional: boolean;
                quantity: number;
                unitPrice: number;
                discountAmount: number;
                taxAmount: number;
                total: number;
                sortOrder: number;
              }> = [];

              const stayLabel =
                row.stayType ===
                "CORE"
                  ? "Core"
                  : row.stayType ===
                      "PRE"
                    ? "Pre"
                    : "Post";

              if (
                toNumber(
                  row.singlePerPerson
                ) > 0
              ) {
                const total =
                  toNumber(
                    row.singlePerPerson
                  ) *
                  toNumber(
                    row.nights
                  );

                items.push({
                  title:
                    `${stayLabel} Hotel - ${
                      row.hotelName ||
                      "Unnamed"
                    } - Single`,

                  description:
                    `${
                      row.destination ||
                      "Unknown destination"
                    } / ${
                      row.nights
                    } nights / per person basis`,

                  itemType:
                    "ACCOMMODATION",

                  optional:
                    row.stayType !==
                    "CORE",

                  quantity: 1,

                  unitPrice:
                    total,

                  discountAmount: 0,

                  taxAmount: 0,

                  total,

                  sortOrder:
                    index * 3,
                });
              }

              if (
                toNumber(
                  row.doubleTwinPerPerson
                ) > 0
              ) {
                const total =
                  toNumber(
                    row.doubleTwinPerPerson
                  ) *
                  toNumber(
                    row.nights
                  );

                items.push({
                  title:
                    `${stayLabel} Hotel - ${
                      row.hotelName ||
                      "Unnamed"
                    } - Double/Twin`,

                  description:
                    `${
                      row.destination ||
                      "Unknown destination"
                    } / ${
                      row.nights
                    } nights / per person basis`,

                  itemType:
                    "ACCOMMODATION",

                  optional:
                    row.stayType !==
                    "CORE",

                  quantity: 1,

                  unitPrice:
                    total,

                  discountAmount: 0,

                  taxAmount: 0,

                  total,

                  sortOrder:
                    1 +
                    index * 3,
                });
              }

              if (
                toNumber(
                  row.triplePerPerson
                ) > 0
              ) {
                const total =
                  toNumber(
                    row.triplePerPerson
                  ) *
                  toNumber(
                    row.nights
                  );

                items.push({
                  title:
                    `${stayLabel} Hotel - ${
                      row.hotelName ||
                      "Unnamed"
                    } - Triple`,

                  description:
                    `${
                      row.destination ||
                      "Unknown destination"
                    } / ${
                      row.nights
                    } nights / per person basis`,

                  itemType:
                    "ACCOMMODATION",

                  optional:
                    row.stayType !==
                    "CORE",

                  quantity: 1,

                  unitPrice:
                    total,

                  discountAmount: 0,

                  taxAmount: 0,

                  total,

                  sortOrder:
                    2 +
                    index * 3,
                });
              }

              return items;
            }
          ),

        ...fixedCostRows
          .filter(
            (row) =>
              row.label.trim() ||
              fixedCostRowTotal(
                row
              ) > 0
          )
          .map(
            (
              row,
              index
            ) => ({
              title:
                row.label.trim() ||
                row.category,

              description:
                `Per-traveler cost / ${row.category} / qty ${row.quantity}`,

              itemType:
                row.category ===
                "FLIGHT"
                  ? ("FLIGHT" as const)
                  : ("FEE" as const),

              optional:
                false,

              quantity:
                calculations.totalTravelers,

              unitPrice:
                fixedCostRowTotal(
                  row
                ),

              discountAmount:
                0,

              taxAmount:
                0,

              total:
                fixedCostRowTotal(
                  row
                ) *
                calculations.totalTravelers,

              sortOrder:
                100 +
                index,
            })
          ),

        ...operationalCostRows
          .filter(
            (row) =>
              row.label.trim() ||
              operationalDisplayTotal(
                row,
                calculations.payingPassengers,
                calculations.freePassengers
              ) > 0
          )
          .map(
            (
              row,
              index
            ) => {
              const displayedAmount =
                operationalDisplayTotal(
                  row,
                  calculations.payingPassengers,
                  calculations.freePassengers
                );

              const scopeLabel =
                row.scope === "CORE"
                  ? "Core"
                  : row.scope ===
                      "PRE"
                    ? "Pre-Stay"
                    : "Post-Stay";

              return {
                title:
                  row.label.trim() ||
                  row.category,

                description:
                  `${scopeLabel} operational cost / ${row.category} / ${row.pricingBasis}`,

                itemType:
                  row.category ===
                    "BUS" ||
                  row.category ===
                    "FERRY" ||
                  row.category ===
                    "TRANSFER"
                    ? ("TRANSPORT" as const)
                    : row.category ===
                          "TOUR_GUIDE" ||
                        row.category ===
                          "TOUR_MANAGER" ||
                        row.category ===
                          "ASSISTANT"
                      ? ("GUIDE" as const)
                      : ("CUSTOM" as const),

                optional:
                  row.scope !==
                  "CORE",

                quantity: 1,

                unitPrice:
                  displayedAmount,

                discountAmount:
                  0,

                taxAmount:
                  0,

                total:
                  displayedAmount,

                sortOrder:
                  300 +
                  index,
              };
            }
          ),

        ...(complimentarySetup
          .groupLeaderAllowanceEnabled &&
        calculations
          .groupLeaderAllowanceTotal >
          0
          ? [
              {
                title:
                  "Group Leader Allowance",

                description:
                  `${formatMoney(
                    complimentarySetup
                      .groupLeaderAllowancePerPayingPax,
                    currency
                  )} per paying pilgrim × ${calculations.payingPassengers} paying pilgrims`,

                itemType:
                  "CUSTOM" as const,

                optional:
                  false,

                quantity: 1,

                unitPrice:
                  calculations
                    .groupLeaderAllowanceTotal,

                discountAmount:
                  0,

                taxAmount:
                  0,

                total:
                  calculations
                    .groupLeaderAllowanceTotal,

                sortOrder:
                  400,
              },
            ]
          : []),
      ];

      const payload = {
        templateId,

        purpose,

        tourId:
          tourId ||
          null,

        departureDateId:
          departureDateId ||
          null,

        title,

        recipientName,

        recipientEmail,

        internalNotes,

        termsAndNotes,

        currency,

        agentId:
          agentId ||
          null,

        agentCompany:
          agentCompany ||
          null,

        pricingPolicy:
          "B2B_NET_AGENT_MARKUP",

        startDate:
          group.startDate ||
          null,

        endDate:
          group.endDate ||
          null,

        briefItinerary:
          briefItinerary.trim() ||
          null,

        totalPassengers:
          calculations.totalTravelers,

        freePassengers:
          calculations.freePassengers,

        payingPassengers:
          calculations.payingPassengers,

        complimentarySetup,

        groupLeaderAllowanceTotal:
          calculations
            .groupLeaderAllowanceTotal,

        markupMode:
          pricing.markupMode,

        epochMarkupPercent:
          pricing.markupMode ===
          "PERCENTAGE"
            ? pricing
                .epochMarkupPercent
            : 0,

        epochMarkupPerPerson:
          pricing.markupMode ===
          "FIXED_PER_PERSON"
            ? pricing
                .epochMarkupPerPerson
            : 0,

        agentCommissionPercent:
          0,

        pricingMode,

        paxPricingRows:
          paxPricingRows
            .filter(
              (row) =>
                row.paxCount >
                0
            )
            .map(
              (row) => ({
                paxCount:
                  row.paxCount,

                calculatedSinglePrice:
                  row.calculatedSinglePrice,

                calculatedDoubleTwinPrice:
                  row.calculatedDoubleTwinPrice,

                calculatedTriplePrice:
                  row.calculatedTriplePrice,

                manualSinglePrice:
                  row.manualSinglePrice,

                manualDoubleTwinPrice:
                  row.manualDoubleTwinPrice,

                manualTriplePrice:
                  row.manualTriplePrice,
              })
            ),

        hotels:
          hotels.map(
            (row) => ({
              hotelName:
                row.hotelName,

              destination:
                row.destination,

              nights:
                row.nights,

              singlePerPerson:
                row.singlePerPerson,

              doubleTwinPerPerson:
                row.doubleTwinPerPerson,

              triplePerPerson:
                row.triplePerPerson,

              stayType:
                row.stayType,
            })
          ),

        fixedCostRows:
          fixedCostRows.map(
            (row) => ({
              label:
                row.label,

              category:
                row.category,

              quantity:
                row.quantity,

              unitCost:
                row.unitCost,
            })
          ),

        operationalCostRows:
          operationalCostRows.map(
            (row) => ({
              label:
                row.label,

              category:
                row.category,

              scope:
                row.scope,

              costMode:
                row.costMode,

              pricingBasis:
                row.pricingBasis,

              totalContractCost:
                row.totalContractCost,

              dailyRate:
                row.dailyRate,

              numberOfDays:
                row.numberOfDays,

              hotelPerNight:
                row.hotelPerNight,

              hotelNights:
                row.hotelNights,

              airfareTransport:
                row.airfareTransport,

              mealsPerDay:
                row.mealsPerDay,

              mealDays:
                row.mealDays,

              otherExpenses:
                row.otherExpenses,

              totalCost:
                operationalDisplayTotal(
                  row,
                  calculations.payingPassengers,
                  calculations.freePassengers
                ),
            })
          ),

        clientDocumentTitle,

        clientSinglePrice:
          activeSinglePrice,

        clientDoubleTwinPrice:
          activeDoubleTwinPrice,

        clientTriplePrice:
          activeTriplePrice,

        clientIncludes,

        clientExcludes,

        paymentPolicy,

        cancellationPolicy,

        clientOfferNotes,

        validUntil:
          validUntil ||
          null,

        availabilityNotes:
          availabilityNotes ||
          null,

        nextStepNotes:
          nextStepNotes ||
          null,

        items:
          generatedItems,
      };

      const endpoint =
        mode === "edit" &&
        initialData?.id
          ? `/api/quotes/${initialData.id}`
          : "/api/quotes";

      const method =
        mode === "edit"
          ? "PATCH"
          : "POST";

      const res =
        await fetch(
          endpoint,
          {
            method,

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const text =
        await res.text();

      let data: {
        ok?: boolean;

        error?: string;

        quote?: {
          id: string;
        };
      } = {};

      try {
        data =
          text
            ? JSON.parse(
                text
              )
            : {};
      } catch {
        console.error(
          "QUOTE_SAVE_NON_JSON_RESPONSE",
          {
            status:
              res.status,

            text,
          }
        );

        throw new Error(
          `Quote save failed. Server returned non-JSON response. Status: ${res.status}`
        );
      }

      if (
        !res.ok ||
        !data.ok ||
        !data.quote?.id
      ) {
        console.error(
          "QUOTE_SAVE_RESPONSE",
          {
            status:
              res.status,

            data,
          }
        );

        throw new Error(
          data.error ||
            `Failed to save quote. Status: ${res.status}`
        );
      }

      toast.success(
        mode === "edit"
          ? "Quote updated successfully"
          : "Quote created successfully"
      );

      router.push(
        `/admin/quotes/${data.quote.id}`
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save quote."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="bg-[#001F3F] px-5 py-3 text-white">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-200">
            Step 2
          </div>

          <h2 className="text-lg font-semibold">
            Pilgrimage & Requested Dates
          </h2>
        </div>

        <div className="p-5">
          <p className="mb-5 text-sm text-slate-600">
            Select the pilgrimage template. Requested travel dates determine the
            seasonal reference rate; they are not fixed departures.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Purpose
              </span>

              <select
                className="w-full rounded-md border p-2"
                value={purpose}
                onChange={(e) =>
                  setPurpose(
                    e.target
                      .value as QuotePurpose
                  )
                }
              >
                <option value="CUSTOM_REQUEST">
                  Custom Request
                </option>

                <option value="TOUR_SETUP">
                  Tour Setup
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Title
              </span>

              <input
                className="w-full rounded-md border p-2"
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                placeholder="e.g. Greece Pilgrimage Offer"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Tour
              </span>

              <select
                className="w-full rounded-md border p-2"
                value={tourId}
                onChange={(e) => {
                  setBriefItineraryTouched(
                    false
                  );

                  setTourId(
                    e.target.value
                  );
                }}
              >
                <option value="">
                  Select tour
                </option>

                {tours.map(
                  (tour) => (
                    <option
                      key={
                        tour.id
                      }
                      value={
                        tour.id
                      }
                    >
                      {
                        tour.title
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="rounded-md border bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-700">
                Pricing Policy
              </div>

              <div className="mt-1 text-slate-600">
                Requested dates determine the seasonal reference rate. There are
                no fixed departures.
              </div>
            </div>
          </div>
        </div>
      </section>

      <details className="rounded-xl border bg-slate-50 p-5">
        <summary className="cursor-pointer font-semibold text-slate-800">
          Optional: Apply a saved quote template
        </summary>

        <div className="mt-4">
          <QuoteTemplatePicker
            onApplyTemplate={
              handleApplyTemplate
            }
          />
        </div>
      </details>

      <RecipientSection
        agents={agents}
        agentId={agentId}
        recipientName={recipientName}
        recipientEmail={recipientEmail}
        agentCompany={agentCompany}
        onAgentChange={setAgentId}
        onContactNameChange={setRecipientName}
        onContactEmailChange={setRecipientEmail}
        onCompanyChange={setAgentCompany}
      />

      <GroupSetupSection
        group={group}
        payingPassengers={
          calculations
            .payingPassengers
        }
        onUpdateGroup={(
          patch
        ) =>
          setGroup(
            (prev) => ({
              ...prev,
              ...patch,

              freePassengers:
                prev.freePassengers,
            })
          )
        }
        toNumber={toNumber}
      />

      <ComplimentaryTravelersSection
        setup={complimentarySetup}
        payingPassengers={
          calculations
            .payingPassengers
        }
        calculatedRatioFreePlaces={
          calculations
            .calculatedRatioFreePlaces
        }
        totalComplimentaryPassengers={
          calculations
            .freePassengers
        }
        totalTravelers={
          calculations
            .totalTravelers
        }
        groupLeaderAllowanceTotal={
          calculations
            .groupLeaderAllowanceTotal
        }
        currency={currency}
        onUpdate={(
          patch
        ) =>
          setComplimentarySetup(
            (prev) => ({
              ...prev,
              ...patch,
            })
          )
        }
        toNumber={toNumber}
        formatMoney={formatMoney}
      />

      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Paying Pilgrims
            </div>

            <div className="mt-1 text-2xl font-bold text-[#001F3F]">
              {
                calculations
                  .payingPassengers
              }
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Complimentary
            </div>

            <div className="mt-1 text-2xl font-bold text-[#001F3F]">
              {
                calculations
                  .freePassengers
              }
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Total Travelers
            </div>

            <div className="mt-1 text-2xl font-bold text-[#001F3F]">
              {
                calculations
                  .totalTravelers
              }
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Step 4
            </div>

            <h2 className="text-lg font-semibold text-[#001F3F]">
              Seasonal Reference Rate
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              {
                seasonalRateMessage
              }
            </p>
          </div>

          {seasonalRate && (
            <div className="rounded-lg border bg-white px-4 py-3 text-sm">
              <div className="font-semibold">
                {seasonalRate.season.replaceAll(
                  "_",
                  " "
                )}
              </div>

              <div className="mt-1">
                Double/Twin:{" "}
                {formatMoney(
                  seasonalRate.price,
                  seasonalRate.currency
                )}
              </div>

              <div>
                Single supplement:{" "}
                {formatMoney(
                  toNumber(
                    seasonalRate.singleSupplement
                  ),
                  seasonalRate.currency
                )}
              </div>

              <div>
                Triple reduction:{" "}
                {formatMoney(
                  toNumber(
                    seasonalRate.tripleReduction
                  ),
                  seasonalRate.currency
                )}
              </div>

              <div>
                Minimum pax basis:{" "}
                {seasonalRate.minPax ??
                  "Not specified"}
              </div>
            </div>
          )}
        </div>

        {seasonalRate?.minPax &&
          calculations.payingPassengers <
            seasonalRate.minPax && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Review required: this seasonal reference is based on at least{" "}
              {seasonalRate.minPax} paying passengers, but this quote currently
              has {calculations.payingPassengers}. Review supplier costs and the
              final NET rate before sending.
            </div>
          )}

        {seasonalRate?.notes && (
          <div className="mt-3 text-sm text-slate-600">
            Internal note:{" "}
            {seasonalRate.notes}
          </div>
        )}
      </section>

      <HotelsSection
        hotels={hotels}
        currency={currency}
        onAddHotel={addHotel}
        onRemoveHotel={removeHotel}
        onUpdateHotel={updateHotel}
        hotelCostPerPerson={(
          hotel,
          occupancy
        ) => {
          const nights =
            toNumber(
              hotel.nights
            );

          if (
            occupancy === "single"
          ) {
            return (
              toNumber(
                hotel.singlePerPerson
              ) *
              nights
            );
          }

          if (
            occupancy === "triple"
          ) {
            return (
              toNumber(
                hotel.triplePerPerson
              ) *
              nights
            );
          }

          return (
            toNumber(
              hotel.doubleTwinPerPerson
            ) *
            nights
          );
        }}
        formatMoney={formatMoney}
        toNumber={toNumber}
      />

      <FixedCostsSection
        rows={fixedCostRows}
        currency={currency}
        onAddRow={addFixedCostRow}
        onRemoveRow={removeFixedCostRow}
        onUpdateRow={updateFixedCostRow}
        rowTotal={fixedCostRowTotal}
        sectionTotal={
          calculations
            .fixedCostsSectionTotal
        }
        formatMoney={formatMoney}
        toNumber={toNumber}
      />

      <OperationalCostsSection
        rows={operationalCostRows}
        currency={currency}
        payingPassengers={
          calculations
            .payingPassengers
        }
        onAddRow={
          addOperationalCostRow
        }
        onRemoveRow={
          removeOperationalCostRow
        }
        onUpdateRow={
          updateOperationalCostRow
        }
        rowTotal={(row) =>
          operationalDisplayTotal(
            row,
            calculations.payingPassengers,
            calculations.freePassengers
          )
        }
        rowPerPerson={(row) =>
          calculations.payingPassengers >
          0
            ? operationalCoreActualTotal(
                row,
                calculations.payingPassengers,
                calculations.freePassengers
              ) /
              calculations.payingPassengers
            : 0
        }
        sectionTotal={
          calculations
            .baseOperationalTotal
        }
        formatMoney={formatMoney}
        toNumber={toNumber}
      />

      <section className="rounded-xl border p-5">
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Internal Costing
          </div>

          <h2 className="text-lg font-semibold">
            Complimentary & Group Benefit Cost
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Complimentary traveler costs and any Group Leader allowance are
            recovered across paying pilgrims.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Paying / Free
            </p>

            <p className="text-base font-semibold">
              {
                calculations
                  .payingPassengers
              }{" "}
              +{" "}
              {
                calculations
                  .freePassengers
              }{" "}
              free
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Net Before Free
            </p>

            <p className="text-base font-semibold">
              {formatMoney(
                calculations
                  .doubleTwinNetCostBeforeFree,
                currency
              )}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Free Cost Total
            </p>

            <p className="text-base font-semibold">
              {formatMoney(
                calculations
                  .freeCostTotal,
                currency
              )}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Free Cost / Paying Pax
            </p>

            <p className="text-base font-semibold">
              {formatMoney(
                calculations
                  .freeCostPerPayingPassenger,
                currency
              )}
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-medium text-amber-900">
              Leader Allowance
            </p>

            <p className="text-base font-semibold text-[#001F3F]">
              {formatMoney(
                calculations
                  .groupLeaderAllowanceTotal,
                currency
              )}
            </p>

            {calculations.groupLeaderAllowanceTotal > 0 && (
              <p className="mt-1 text-xs text-amber-800">
                {formatMoney(
                  calculations
                    .leaderAllowancePerPayingPassenger,
                  currency
                )}{" "}
                per paying pilgrim
              </p>
            )}
          </div>
        </div>
      </section>

      <PricingControlsSection
        pricing={pricing}
        onUpdatePricing={(
          patch
        ) =>
          setPricing(
            (prev) => ({
              ...prev,
              ...patch,
            })
          )
        }
        toNumber={toNumber}
      />

      <section className="space-y-6 rounded-xl border p-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Step 6
          </div>

          <h2 className="text-lg font-semibold">
            Agency NET Offer
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            This is the commercial offer the travel agency will see. Internal
            supplier costs and Epoch profit remain private.
          </p>
        </div>

        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <strong>
            NET to Travel Agency:
          </strong>{" "}
          the agency determines its own resale price and markup. Epoch does not
          calculate agent commission.
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Client Document Title
            </span>

            <input
              className="w-full rounded-md border p-2"
              value={
                clientDocumentTitle
              }
              onChange={(e) =>
                setClientDocumentTitle(
                  e.target.value
                )
              }
              placeholder="e.g. Holy Land Pilgrimage Offer"
            />
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-medium text-[#001F3F]">
            Brief Itinerary / Journey Overview
          </h3>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="mt-1 text-sm text-slate-600">
              Automatically loaded from the selected Tour. You may edit it for
              this quotation. Enter one day per line; the PDF calculates the
              actual date and weekday from the tour start date.
            </p>

            <button
              type="button"
              onClick={() => {
                const selectedTour =
                  tours.find(
                    (tour) =>
                      tour.id === tourId
                  );

                setBriefItinerary(
                  selectedTour?.overviewItinerary?.trim() ||
                  selectedTour?.itinerary?.trim() ||
                  ""
                );

                setBriefItineraryTouched(
                  false
                );
              }}
              disabled={!tourId}
              className="shrink-0 rounded-md border bg-white px-3 py-2 text-xs font-medium text-[#001F3F] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reload from Tour
            </button>
          </div>

          <textarea
            className="mt-3 min-h-[220px] w-full resize-y rounded-md border bg-white p-4 text-sm leading-relaxed"
            placeholder={`Athens - Acropolis, Areopagus, Plaka
Corinth - Ancient Corinth, Bema of St. Paul
Delphi - Sanctuary of Apollo, Archaeological Museum`}
            value={briefItinerary}
            onChange={(e) => {
              setBriefItineraryTouched(
                true
              );

              setBriefItinerary(
                e.target.value
              );
            }}
          />
        </div>

        <PassengerPricingSection
          pricingMode={
            pricingMode
          }
          onPricingModeChange={
            setPricingMode
          }
          paxPricingRows={
            paxPricingRows
          }
          onAddRow={
            addPaxPricingRow
          }
          onRemoveRow={
            removePaxPricingRow
          }
          onUpdateRow={
            updatePaxPricingRow
          }
          toNumber={
            toNumber
          }
          formatMoney={
            formatMoney
          }
          currency={
            currency
          }
          seasonalReference={
            seasonalRate
              ? {
                  doubleTwin:
                    seasonalRate.price,

                  single:
                    seasonalRate.price +
                    toNumber(
                      seasonalRate.singleSupplement
                    ),

                  triple:
                    Math.max(
                      seasonalRate.price -
                        toNumber(
                          seasonalRate.tripleReduction
                        ),
                      0
                    ),

                  season:
                    seasonalRate.season.replaceAll(
                      "_",
                      " "
                    ),

                  minPax:
                    seasonalRate.minPax,
                }
              : null
          }
        />

        <div>
          <h3 className="mb-2 font-medium">
            Included Services
          </h3>

          <IncludesExcludesBuilder
            label=""
            value={clientIncludes}
            onChange={setClientIncludes}
            type="includes"
          />
        </div>

        <div>
          <h3 className="mb-2 font-medium">
            Not Included
          </h3>

          <IncludesExcludesBuilder
            label=""
            value={clientExcludes}
            onChange={setClientExcludes}
            type="excludes"
          />
        </div>

        <div>
          <h3 className="mb-2 font-medium">
            Payment Policy
          </h3>

          <PolicySelector
            startDate={group.startDate}
            paymentValue={paymentPolicy}
            cancellationValue={cancellationPolicy}
            onSelect={(
              payment,
              cancellation
            ) => {
              setPaymentPolicy(
                payment
              );

              setCancellationPolicy(
                cancellation
              );
            }}
          />

          <textarea
            className={
              TEXTAREA_CLASS
            }
            placeholder="Payment policy"
            value={paymentPolicy}
            onChange={(e) =>
              setPaymentPolicy(
                e.target.value
              )
            }
          />
        </div>

        <div>
          <h3 className="mb-2 font-medium">
            Cancellation Policy
          </h3>

          <textarea
            className={
              TEXTAREA_CLASS
            }
            placeholder="Cancellation policy"
            value={
              cancellationPolicy
            }
            onChange={(e) =>
              setCancellationPolicy(
                e.target.value
              )
            }
          />
        </div>

        <div>
          <h3 className="mb-2 font-medium">
            Additional Notes
          </h3>

          <textarea
            className={
              TEXTAREA_CLASS
            }
            placeholder="Additional client-facing notes"
            value={
              clientOfferNotes
            }
            onChange={(e) =>
              setClientOfferNotes(
                e.target.value
              )
            }
          />
        </div>

        <QuoteValiditySection
          validUntil={validUntil}
          availabilityNotes={availabilityNotes}
          nextStepNotes={nextStepNotes}
          onValidUntilChange={setValidUntil}
          onAvailabilityNotesChange={setAvailabilityNotes}
          onNextStepNotesChange={setNextStepNotes}
        />
      </section>

      <section className="rounded-xl border p-5">
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Step 8
          </div>

          <h2 className="text-lg font-semibold">
            Terms, Validity & Send
          </h2>
        </div>

        <TermsSelector
          onSelect={
            setTermsAndNotes
          }
        />

        <textarea
          className="mt-4 min-h-65 w-full resize-y rounded-md border p-4 text-sm leading-relaxed"
          placeholder="Terms and conditions"
          value={
            termsAndNotes
          }
          onChange={(e) =>
            setTermsAndNotes(
              e.target.value
            )
          }
        />
      </section>

      <div className="space-y-4 border-t pt-6">
        <QuoteSummarySection
          currency={
            currency
          }
          formatMoney={
            formatMoney
          }
          pricingMode={
            pricingMode
          }
          activeSellingPrice={
            activeDoubleTwinPrice
          }
          calculations={{
            hotelDoubleTwinPerPerson:
              calculations
                .fixedDoubleTwinPerPerson,

            fixedCostPerPerson:
              calculations
                .fixedCostPerPerson,

            operationalCostPerPerson:
              calculations
                .operationalPerPerson,

            doubleTwinNetCost:
              calculations
                .doubleTwinNetCost,

            freeCostPerPayingPassenger:
              calculations
                .freeCostPerPayingPassenger,
          }}
        />

        <ProfitViewSection
          currency={
            currency
          }
          pricingMode={
            pricingMode
          }
          costPerPerson={
            calculations
              .doubleTwinNetCost
          }
          sellingPerPerson={
            activeDoubleTwinPrice
          }
          profitPerPerson={
            profitPerPerson
          }
          totalCost={
            totalCost
          }
          totalRevenue={
            totalRevenue
          }
          totalProfit={
            totalProfit
          }
          marginPercent={
            marginPercent
          }
          formatMoney={
            formatMoney
          }
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="rounded-md bg-[#8B0000] px-6 py-2.5 font-medium text-white transition hover:bg-[#700000] disabled:opacity-50"
          >
            {loading
              ? mode === "edit"
                ? "Updating..."
                : "Creating..."
              : mode === "edit"
                ? "Update Draft"
                : "Save Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}