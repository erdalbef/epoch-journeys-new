"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import QuoteTemplatePicker, {
  type BuilderQuoteItem,
} from "./QuoteTemplatePicker";

import IncludesExcludesBuilder from "@/components/quotes/IncludesExcludesBuilder";
import PolicySelector from "@/components/quotes/PolicySelector";
import TermsSelector from "@/components/quotes/TermsSelector";

import RecipientSection from "@/components/quotes/create/RecipientSection";
import GroupSetupSection from "@/components/quotes/create/GroupSetupSection";
import HotelsSection from "@/components/quotes/create/HotelsSection";
import FixedCostsSection from "@/components/quotes/create/FixedCostsSection";
import OperationalCostsSection from "@/components/quotes/create/OperationalCostsSection";
import PricingControlsSection from "@/components/quotes/create/PricingControlsSection";
import PassengerPricingSection from "@/components/quotes/create/PassengerPricingSection";
import QuoteSummarySection from "@/components/quotes/create/QuoteSummarySection";
import ProfitViewSection from "@/components/quotes/create/ProfitViewSection";

type TourOption = {
  id: string;
  title: string;
  category: string;
};

type AgentOption = {
  id: string;
  fullName: string | null;
  email: string;
  travelAgency: string | null;
  commissionRate: number | null;
};

type DepartureOption = {
  id: string;
  date: string;
  price: number;
  status: string;
  season: string;
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
type QuotePurpose = "CUSTOM_REQUEST" | "TOUR_SETUP";

type HotelRow = {
  hotelName: string;
  destination: string;
  nights: number;
  singlePerPerson: number;
  doubleTwinPerPerson: number;
  triplePerPerson: number;
  stayType: "CORE" | "PRE" | "POST";
};

type FixedCostRow = {
  label: string;
  category:
    | "HOTEL"
    | "ENTRANCE"
    | "LUNCH"
    | "DINNER"
    | "FLIGHT"
    | "CRUISE"
    | "TIPS"
    | "OTHER";
  quantity: number;
  unitCost: number;
};

type OperationalCostRow = {
  label: string;
  category:
    | "BUS"
    | "TOUR_GUIDE"
    | "TOUR_MANAGER"
    | "DRIVER"
    | "FERRY"
    | "TRANSFER"
    | "OTHER";
  totalCost: number;
};

type GroupSetup = {
  totalPassengers: number;
  freePassengers: number;
  startDate: string;
  endDate: string;
};

type PricingControls = {
  agentCommissionPercent: number;
  epochMarkupPercent: number;
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
  costBasis?: "GROUP" | "PER_PERSON";
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

type QuoteBuilderSummary = {
  startDate?: string | null;
  endDate?: string | null;
  totalPassengers?: number;
  freePassengers?: number;
  payingPassengers?: number;
  agentCommissionPercent?: number;
  epochMarkupPercent?: number;
  pricingMode?: PricingMode;
  paxPricingRows?: PaxPricingRow[];
  hotels?: HotelRow[];
  fixedCostRows?: FixedCostRow[];
  operationalCostRows?: OperationalCostRow[];

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

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function createEmptyHotelRow(): HotelRow {
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

function createEmptyFixedCostRow(): FixedCostRow {
  return {
    label: "",
    category: "ENTRANCE",
    quantity: 1,
    unitCost: 0,
  };
}

function createEmptyOperationalCostRow(): OperationalCostRow {
  return {
    label: "Bus",
    category: "BUS",
    totalCost: 0,
  };
}

function createEmptyPaxPricingRow(paxCount = 0): PaxPricingRow {
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

function fixedCostRowTotal(row: FixedCostRow) {
  return toNumber(row.quantity) * toNumber(row.unitCost);
}

function operationalCostRowTotal(row: OperationalCostRow) {
  return toNumber(row.totalCost);
}

function calculateFreePassengersForPax(
  paxCount: number,
  basePassengers: number,
  baseFreePassengers: number
) {
  const pax = Math.max(toNumber(paxCount), 1);
  const basePax = Math.max(toNumber(basePassengers), 1);
  const baseFree = Math.max(toNumber(baseFreePassengers), 0);

  if (baseFree === 0) return 0;

  const ratio = basePax / baseFree;
  const calculated = Math.floor(pax / ratio);

  return Math.min(calculated, Math.max(pax - 1, 0));
}

function calculateSellingPricesForPax(args: {
  paxCount: number;
  freePassengers: number;
  hotels: HotelRow[];
  fixedCostRows: FixedCostRow[];
  operationalCostRows: OperationalCostRow[];
  pricing: PricingControls;
}) {
  const totalPassengers = Math.max(toNumber(args.paxCount), 1);

  const freePassengers = Math.min(
    Math.max(toNumber(args.freePassengers), 0),
    totalPassengers - 1
  );

  const payingPassengers = Math.max(totalPassengers - freePassengers, 1);

  const coreHotels = args.hotels.filter((h) => h.stayType === "CORE");

  const hotelSinglePerPerson = coreHotels.reduce(
    (sum, row) => sum + toNumber(row.singlePerPerson) * toNumber(row.nights),
    0
  );

  const hotelDoubleTwinPerPerson = coreHotels.reduce(
    (sum, row) =>
      sum + toNumber(row.doubleTwinPerPerson) * toNumber(row.nights),
    0
  );

  const hotelTriplePerPerson = coreHotels.reduce(
    (sum, row) => sum + toNumber(row.triplePerPerson) * toNumber(row.nights),
    0
  );

  const fixedCostPerPerson = args.fixedCostRows.reduce(
    (sum, row) => sum + fixedCostRowTotal(row),
    0
  );

  const operationalTotal = args.operationalCostRows.reduce(
    (sum, row) => sum + operationalCostRowTotal(row),
    0
  );

  const operationalPerPerson =
    totalPassengers > 0 ? operationalTotal / totalPassengers : 0;

  const singleNetBeforeFree =
    hotelSinglePerPerson + fixedCostPerPerson + operationalPerPerson;

  const doubleTwinNetBeforeFree =
    hotelDoubleTwinPerPerson + fixedCostPerPerson + operationalPerPerson;

  const tripleNetBeforeFree =
    hotelTriplePerPerson + fixedCostPerPerson + operationalPerPerson;

  const freeCostTotal = freePassengers * doubleTwinNetBeforeFree;
  const freeCostPerPayingPassenger = freeCostTotal / payingPassengers;

  const singleNetCost = singleNetBeforeFree + freeCostPerPayingPassenger;
  const doubleTwinNetCost =
    doubleTwinNetBeforeFree + freeCostPerPayingPassenger;
  const tripleNetCost = tripleNetBeforeFree + freeCostPerPayingPassenger;

  const commissionMultiplier =
    1 + toNumber(args.pricing.agentCommissionPercent) / 100;

  const markupMultiplier =
    1 + toNumber(args.pricing.epochMarkupPercent) / 100;

  const sellingMultiplier = commissionMultiplier * markupMultiplier;

  return {
    singleSellingPrice: singleNetCost * sellingMultiplier,
    doubleTwinSellingPrice: doubleTwinNetCost * sellingMultiplier,
    tripleSellingPrice: tripleNetCost * sellingMultiplier,
    freePassengers,
  };
}

function getActivePrice(
  pricingMode: PricingMode,
  calculatedPrice: number,
  manualPrice: number
) {
  if (pricingMode === "MANUAL" && manualPrice > 0) {
    return manualPrice;
  }

  return calculatedPrice;
}

function legacyStaffTotal(row: LegacyStaffCostRow) {
  const service = toNumber(row.dailyRate) * toNumber(row.days);
  const hotel = toNumber(row.hotelSinglePerNight) * toNumber(row.nights);
  const meals = toNumber(row.mealsPerDay) * toNumber(row.mealDays);
  const extras = toNumber(row.extras);
  return service + hotel + meals + extras;
}

function legacyDriverTotal(row: LegacyDriverCostRow) {
  const hotel = toNumber(row.hotelSinglePerNight) * toNumber(row.nights);
  const meals = toNumber(row.mealsPerDay) * toNumber(row.mealDays);
  const extras = toNumber(row.extras);
  return hotel + meals + extras;
}

export default function QuoteCreateForm({
  tours,
  agents,
  initialData,
  mode = "create",
}: Props) {
  const router = useRouter();

  const [purpose, setPurpose] = useState<QuotePurpose>("CUSTOM_REQUEST");
  const [tourId, setTourId] = useState("");
  const [departureDateId, setDepartureDateId] = useState("");
  const [departures, setDepartures] = useState<DepartureOption[]>([]);

  const [agentId, setAgentId] = useState("");
  const [agentCompany, setAgentCompany] = useState("");
  const [commissionSource, setCommissionSource] = useState("");

  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [termsAndNotes, setTermsAndNotes] = useState("");
  const [currency] = useState("EUR");
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [clientDocumentTitle, setClientDocumentTitle] = useState("");
  const [clientIncludes, setClientIncludes] = useState("");
  const [clientExcludes, setClientExcludes] = useState("");
  const [paymentPolicy, setPaymentPolicy] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [clientOfferNotes, setClientOfferNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const [pricingMode, setPricingMode] = useState<PricingMode>("CALCULATED");

  const [group, setGroup] = useState<GroupSetup>({
    totalPassengers: 20,
    freePassengers: 0,
    startDate: "",
    endDate: "",
  });

  const [pricing, setPricing] = useState<PricingControls>({
    agentCommissionPercent: 0,
    epochMarkupPercent: 0,
  });

  const [paxPricingRows, setPaxPricingRows] = useState<PaxPricingRow[]>([
    createEmptyPaxPricingRow(20),
    createEmptyPaxPricingRow(25),
    createEmptyPaxPricingRow(30),
    createEmptyPaxPricingRow(35),
    createEmptyPaxPricingRow(40),
  ]);

  const [hotels, setHotels] = useState<HotelRow[]>([createEmptyHotelRow()]);

  const [fixedCostRows, setFixedCostRows] = useState<FixedCostRow[]>([
    createEmptyFixedCostRow(),
  ]);

  const [operationalCostRows, setOperationalCostRows] = useState<
    OperationalCostRow[]
  >([createEmptyOperationalCostRow()]);

  useEffect(() => {
    if (!tourId) {
      setDepartures([]);
      setDepartureDateId("");
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(`/api/tours/${tourId}/departures`);
        const data = (await res.json()) as {
          ok?: boolean;
          departures?: DepartureOption[];
        };

        if (data.ok && Array.isArray(data.departures)) {
          setDepartures(data.departures);
        } else {
          setDepartures([]);
        }
      } catch (error) {
        console.error("Failed to load departures", error);
        setDepartures([]);
      }
    };

    void run();
  }, [tourId]);

  useEffect(() => {
    if (!agentId) {
      setAgentCompany("");
      setCommissionSource("");
      setPricing((prev) => ({
        ...prev,
        agentCommissionPercent: 0,
      }));
      return;
    }

    const loadCommission = async () => {
      try {
        const query = tourId ? `?tourId=${tourId}` : "";
        const res = await fetch(`/api/admin/agents/${agentId}/commission${query}`);
        const data = (await res.json()) as {
          ok?: boolean;
          agent?: {
            id: string;
            fullName: string | null;
            email: string;
            travelAgency: string | null;
          };
          commissionRate?: number | null;
          source?: string;
          error?: string;
        };

        if (!data.ok || !data.agent) {
          throw new Error(data.error || "Failed to load agent commission.");
        }

        setRecipientName(data.agent.fullName || "");
        setRecipientEmail(data.agent.email || "");
        setAgentCompany(data.agent.travelAgency || "");

        setPricing((prev) => ({
          ...prev,
          agentCommissionPercent:
            toNumber(data.commissionRate) <= 1
              ? toNumber(data.commissionRate) * 100
              : toNumber(data.commissionRate),
        }));

        if (data.source === "tour_override") {
          setCommissionSource("Tour-specific commission applied");
        } else if (data.source === "default") {
          setCommissionSource("Default agent commission applied");
        } else {
          setCommissionSource("No commission override found");
        }
      } catch (error) {
        console.error("Failed to load commission", error);
        setCommissionSource("Failed to load commission");
      }
    };

    void loadCommission();
  }, [agentId, tourId]);

  useEffect(() => {
    if (!initialData) return;

    setTitle(initialData.title || "");
    setRecipientName(initialData.recipientName || "");
    setRecipientEmail(initialData.recipientEmail || "");
    setInternalNotes(initialData.internalNotes || "");
    setTermsAndNotes(initialData.termsAndNotes || "");
    setTourId(initialData.tourId || "");
    setDepartureDateId(initialData.departureDateId || "");
    setTemplateId(initialData.templateId || null);

    if (
      initialData.purpose === "CUSTOM_REQUEST" ||
      initialData.purpose === "TOUR_SETUP"
    ) {
      setPurpose(initialData.purpose);
    }

    setClientDocumentTitle(initialData.clientDocumentTitle || "");
    setClientIncludes(initialData.clientIncludes || "");
    setClientExcludes(initialData.clientExcludes || "");
    setPaymentPolicy(initialData.paymentPolicy || "");
    setCancellationPolicy(initialData.cancellationPolicy || "");
    setClientOfferNotes(initialData.clientOfferNotes || "");
    setValidUntil(
      initialData.validUntil
        ? new Date(initialData.validUntil).toISOString().split("T")[0]
        : ""
    );

    const matchedAgent = agents.find(
      (agent) =>
        agent.email === (initialData.recipientEmail || "") ||
        agent.fullName === (initialData.recipientName || "")
    );

    if (matchedAgent) {
      setAgentId(matchedAgent.id);
      setAgentCompany(matchedAgent.travelAgency || "");
    }

    const summary =
      initialData.quoteBuilderSummary &&
      typeof initialData.quoteBuilderSummary === "object"
        ? (initialData.quoteBuilderSummary as QuoteBuilderSummary)
        : null;

    setGroup((prev) => ({
      ...prev,
      startDate: summary?.startDate || "",
      endDate: summary?.endDate || "",
      totalPassengers:
        typeof summary?.totalPassengers === "number"
          ? summary.totalPassengers
          : prev.totalPassengers,
      freePassengers:
        typeof summary?.freePassengers === "number"
          ? summary.freePassengers
          : prev.freePassengers,
    }));

    setPricing((prev) => ({
      ...prev,
      agentCommissionPercent:
        typeof summary?.agentCommissionPercent === "number"
          ? summary.agentCommissionPercent
          : prev.agentCommissionPercent,
      epochMarkupPercent:
        typeof summary?.epochMarkupPercent === "number"
          ? summary.epochMarkupPercent
          : prev.epochMarkupPercent,
    }));

    if (
      summary?.pricingMode === "CALCULATED" ||
      summary?.pricingMode === "MANUAL"
    ) {
      setPricingMode(summary.pricingMode);
    }

    if (Array.isArray(summary?.paxPricingRows) && summary.paxPricingRows.length) {
      setPaxPricingRows(
        summary.paxPricingRows.map((row) => ({
          paxCount: toNumber(row.paxCount),
          calculatedSinglePrice: toNumber(row.calculatedSinglePrice),
          calculatedDoubleTwinPrice: toNumber(row.calculatedDoubleTwinPrice),
          calculatedTriplePrice: toNumber(row.calculatedTriplePrice),
          manualSinglePrice: toNumber(row.manualSinglePrice),
          manualDoubleTwinPrice: toNumber(row.manualDoubleTwinPrice),
          manualTriplePrice: toNumber(row.manualTriplePrice),
        }))
      );
    }

    if (Array.isArray(summary?.hotels) && summary.hotels.length) {
      setHotels(
        summary.hotels.map((row) => ({
          hotelName: row.hotelName || "",
          destination: row.destination || "",
          nights: toNumber(row.nights),
          singlePerPerson: toNumber(row.singlePerPerson),
          doubleTwinPerPerson: toNumber(row.doubleTwinPerPerson),
          triplePerPerson: toNumber(row.triplePerPerson),
          stayType: row.stayType || "CORE",
        }))
      );
    }

    if (Array.isArray(summary?.fixedCostRows) && summary.fixedCostRows.length) {
      setFixedCostRows(
        summary.fixedCostRows.map((row) => ({
          label: row.label || "",
          category: row.category || "OTHER",
          quantity: toNumber(row.quantity),
          unitCost: toNumber(row.unitCost),
        }))
      );
    } else {
      const migratedFixedRows: FixedCostRow[] = [];

      if (Array.isArray(summary?.entranceRows)) {
        migratedFixedRows.push(
          ...summary.entranceRows
            .filter((row) => row.siteName)
            .map((row) => ({
              label: row.siteName || "",
              category: "ENTRANCE" as const,
              quantity: 1,
              unitCost: toNumber(row.amountPerPerson),
            }))
        );
      }

      if (Array.isArray(summary?.tipRows)) {
        migratedFixedRows.push(
          ...summary.tipRows
            .filter((row) => row.tipType)
            .map((row) => ({
              label: row.tipType || "",
              category: "TIPS" as const,
              quantity: 1,
              unitCost:
                toNumber(row.amountPerDayPerPerson) *
                toNumber(row.totalDays),
            }))
        );
      }

      if (Array.isArray(summary?.otherFixedRows)) {
        migratedFixedRows.push(
          ...summary.otherFixedRows
            .filter((row) => row.label)
            .map((row) => ({
              label: row.label || "",
              category: "OTHER" as const,
              quantity: toNumber(row.quantity),
              unitCost: toNumber(row.amountPerUnit),
            }))
        );
      }

      if (migratedFixedRows.length) {
        setFixedCostRows(migratedFixedRows);
      }
    }

    if (
      Array.isArray(summary?.operationalCostRows) &&
      summary.operationalCostRows.length
    ) {
      setOperationalCostRows(
        summary.operationalCostRows.map((row) => ({
          label: row.label || "",
          category: row.category || "OTHER",
          totalCost: toNumber(row.totalCost),
        }))
      );
    } else {
      const migratedOperationalRows: OperationalCostRow[] = [];

      if (Array.isArray(summary?.variableCostRows)) {
        migratedOperationalRows.push(
          ...summary.variableCostRows
            .filter((row) => row.label)
            .map((row) => ({
              label: row.label || "",
              category: "OTHER" as const,
              totalCost: toNumber(row.totalCost),
            }))
        );
      }

      if (Array.isArray(summary?.tourManagerRows)) {
        migratedOperationalRows.push(
          ...summary.tourManagerRows
            .filter((row) => row.label || legacyStaffTotal(row) > 0)
            .map((row) => ({
              label: row.label || "Tour Manager",
              category: "TOUR_MANAGER" as const,
              totalCost: legacyStaffTotal(row),
            }))
        );
      }

      if (Array.isArray(summary?.guideRows)) {
        migratedOperationalRows.push(
          ...summary.guideRows
            .filter((row) => row.label || legacyStaffTotal(row) > 0)
            .map((row) => ({
              label: row.label || "Guide",
              category: "TOUR_GUIDE" as const,
              totalCost: legacyStaffTotal(row),
            }))
        );
      }

      if (Array.isArray(summary?.driverRows)) {
        migratedOperationalRows.push(
          ...summary.driverRows
            .filter((row) => row.label || legacyDriverTotal(row) > 0)
            .map((row) => ({
              label: row.label || "Driver",
              category: "DRIVER" as const,
              totalCost: legacyDriverTotal(row),
            }))
        );
      }

      if (migratedOperationalRows.length) {
        setOperationalCostRows(migratedOperationalRows);
      }
    }
  }, [initialData, agents]);

  const calculations = useMemo(() => {
    const totalPassengers = Math.max(toNumber(group.totalPassengers), 1);

    const freePassengers = Math.min(
      Math.max(toNumber(group.freePassengers), 0),
      totalPassengers - 1
    );

    const payingPassengers = Math.max(totalPassengers - freePassengers, 1);

    const coreHotels = hotels.filter((h) => h.stayType === "CORE");
    const preHotels = hotels.filter((h) => h.stayType === "PRE");
    const postHotels = hotels.filter((h) => h.stayType === "POST");

    const fixedSinglePerPerson = coreHotels.reduce(
      (sum, h) => sum + toNumber(h.singlePerPerson) * toNumber(h.nights),
      0
    );

    const fixedDoubleTwinPerPerson = coreHotels.reduce(
      (sum, h) =>
        sum + toNumber(h.doubleTwinPerPerson) * toNumber(h.nights),
      0
    );

    const fixedTriplePerPerson = coreHotels.reduce(
      (sum, h) => sum + toNumber(h.triplePerPerson) * toNumber(h.nights),
      0
    );

    const fixedCostsSectionTotal = fixedCostRows.reduce(
      (sum, row) => sum + fixedCostRowTotal(row),
      0
    );

    const operationalCostsSectionTotal = operationalCostRows.reduce(
      (sum, row) => sum + operationalCostRowTotal(row),
      0
    );

    const fixedCostPerPerson = fixedCostsSectionTotal;

    const operationalPerPerson =
      totalPassengers > 0
        ? operationalCostsSectionTotal / totalPassengers
        : 0;

    const preHotelTotal = preHotels.reduce((sum, h) => {
      return (
        sum +
        toNumber(h.doubleTwinPerPerson) *
          toNumber(h.nights) *
          totalPassengers
      );
    }, 0);

    const postHotelTotal = postHotels.reduce((sum, h) => {
      return (
        sum +
        toNumber(h.doubleTwinPerPerson) *
          toNumber(h.nights) *
          totalPassengers
      );
    }, 0);

    const doubleTwinNetCostBeforeFree =
      fixedDoubleTwinPerPerson + fixedCostPerPerson + operationalPerPerson;

    const freeCostTotal = freePassengers * doubleTwinNetCostBeforeFree;
    const freeCostPerPayingPassenger = freeCostTotal / payingPassengers;

    const singleNetCost =
      fixedSinglePerPerson +
      fixedCostPerPerson +
      operationalPerPerson +
      freeCostPerPayingPassenger;

    const doubleTwinNetCost =
      fixedDoubleTwinPerPerson +
      fixedCostPerPerson +
      operationalPerPerson +
      freeCostPerPayingPassenger;

    const tripleNetCost =
      fixedTriplePerPerson +
      fixedCostPerPerson +
      operationalPerPerson +
      freeCostPerPayingPassenger;

    return {
      totalPassengers,
      freePassengers,
      payingPassengers,

      fixedSinglePerPerson,
      fixedDoubleTwinPerPerson,
      fixedTriplePerPerson,

      fixedCostsSectionTotal,
      fixedCostPerPerson,

      operationalCostsSectionTotal,
      operationalPerPerson,

      preHotelTotal,
      postHotelTotal,

      doubleTwinNetCostBeforeFree,
      freeCostTotal,
      freeCostPerPayingPassenger,

      singleNetCost,
      doubleTwinNetCost,
      tripleNetCost,
    };
  }, [group, hotels, fixedCostRows, operationalCostRows]);

  useEffect(() => {
    const newRows = paxPricingRows.map((row) => {
      if (!row.paxCount) return row;

      const rowFreePassengers = calculateFreePassengersForPax(
        row.paxCount,
        group.totalPassengers,
        group.freePassengers
      );

      const rowCalc = calculateSellingPricesForPax({
        paxCount: row.paxCount,
        freePassengers: rowFreePassengers,
        hotels,
        fixedCostRows,
        operationalCostRows,
        pricing,
      });

      return {
        ...row,
        calculatedSinglePrice: Math.round(rowCalc.singleSellingPrice),
        calculatedDoubleTwinPrice: Math.round(rowCalc.doubleTwinSellingPrice),
        calculatedTriplePrice: Math.round(rowCalc.tripleSellingPrice),
      };
    });

    const hasChanged = newRows.some((row, index) => {
      const current = paxPricingRows[index];

      return (
        current?.calculatedSinglePrice !== row.calculatedSinglePrice ||
        current?.calculatedDoubleTwinPrice !== row.calculatedDoubleTwinPrice ||
        current?.calculatedTriplePrice !== row.calculatedTriplePrice
      );
    });

    if (hasChanged) {
      setPaxPricingRows(newRows);
    }
  }, [
    paxPricingRows,
    group.totalPassengers,
    group.freePassengers,
    hotels,
    fixedCostRows,
    operationalCostRows,
    pricing,
  ]);

  const firstPaxRow = useMemo(
    () => paxPricingRows.find((row) => row.paxCount > 0) ?? null,
    [paxPricingRows]
  );

  const activeSinglePrice = firstPaxRow
    ? getActivePrice(
        pricingMode,
        firstPaxRow.calculatedSinglePrice,
        firstPaxRow.manualSinglePrice
      )
    : 0;

  const activeDoubleTwinPrice = firstPaxRow
    ? getActivePrice(
        pricingMode,
        firstPaxRow.calculatedDoubleTwinPrice,
        firstPaxRow.manualDoubleTwinPrice
      )
    : 0;

  const activeTriplePrice = firstPaxRow
    ? getActivePrice(
        pricingMode,
        firstPaxRow.calculatedTriplePrice,
        firstPaxRow.manualTriplePrice
      )
    : 0;

  const profitPerPerson =
    activeDoubleTwinPrice - calculations.doubleTwinNetCost;

  const totalRevenue =
    activeDoubleTwinPrice * calculations.payingPassengers;

  const totalCost =
    calculations.doubleTwinNetCost * calculations.payingPassengers;

  const totalProfit = totalRevenue - totalCost;

  const marginPercent =
    totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

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
    setTemplateId(templateId);
    setTitle((prev) => (prev.trim() ? prev : templateTitle));

    const hydrated: OperationalCostRow[] = items.map((item) => {
      const quantity = typeof item.quantity === "number" ? item.quantity : 1;
      const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : 0;
      const discountAmount =
        typeof item.discountAmount === "number" ? item.discountAmount : 0;

      return {
        label: item.title || "Template Cost",
        category: "OTHER",
        totalCost: quantity * unitPrice - discountAmount,
      };
    });

    setOperationalCostRows((prev) => [...hydrated, ...prev]);
    toast.success("Template applied to operational costs");
  }

  function updateHotel(index: number, patch: Partial<HotelRow>) {
    setHotels((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addHotel() {
    setHotels((prev) => [...prev, createEmptyHotelRow()]);
  }

  function removeHotel(index: number) {
    setHotels((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFixedCostRow(index: number, patch: Partial<FixedCostRow>) {
    setFixedCostRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addFixedCostRow() {
    setFixedCostRows((prev) => [
      ...prev,
      {
        label: "",
        category: "OTHER",
        quantity: 1,
        unitCost: 0,
      },
    ]);
  }

  function removeFixedCostRow(index: number) {
    setFixedCostRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOperationalCostRow(
    index: number,
    patch: Partial<OperationalCostRow>
  ) {
    setOperationalCostRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addOperationalCostRow() {
    setOperationalCostRows((prev) => [
      ...prev,
      {
        label: "",
        category: "OTHER",
        totalCost: 0,
      },
    ]);
  }

  function removeOperationalCostRow(index: number) {
    setOperationalCostRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePaxPricingRow(index: number, patch: Partial<PaxPricingRow>) {
    setPaxPricingRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addPaxPricingRow() {
    setPaxPricingRows((prev) => [...prev, createEmptyPaxPricingRow(0)]);
  }

  function removePaxPricingRow(index: number) {
    setPaxPricingRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit() {
    setLoading(true);

    try {
      const generatedItems: Array<{
        title: string;
        description: string;
        itemType: GeneratedQuoteItemType;
        optional: boolean;
        quantity: number;
        unitPrice: number;
        discountAmount: number;
        taxAmount: number;
        total: number;
        sortOrder: number;
      }> = [
        ...hotels
          .filter((row) => row.hotelName.trim() || row.destination.trim())
          .flatMap((row, index) => {
            const items: Array<{
              title: string;
              description: string;
              itemType: GeneratedQuoteItemType;
              optional: boolean;
              quantity: number;
              unitPrice: number;
              discountAmount: number;
              taxAmount: number;
              total: number;
              sortOrder: number;
            }> = [];

            const stayLabel =
              row.stayType === "CORE"
                ? "Core"
                : row.stayType === "PRE"
                  ? "Pre"
                  : "Post";

            if (toNumber(row.singlePerPerson) > 0) {
              items.push({
                title: `${stayLabel} Hotel - ${
                  row.hotelName || "Unnamed"
                } - Single`,
                description: `${
                  row.destination || "Unknown destination"
                } / ${row.nights} nights / per person basis`,
                itemType: "ACCOMMODATION",
                optional: row.stayType !== "CORE",
                quantity: 1,
                unitPrice: toNumber(row.singlePerPerson) * toNumber(row.nights),
                discountAmount: 0,
                taxAmount: 0,
                total: toNumber(row.singlePerPerson) * toNumber(row.nights),
                sortOrder: index * 3,
              });
            }

            if (toNumber(row.doubleTwinPerPerson) > 0) {
              items.push({
                title: `${stayLabel} Hotel - ${
                  row.hotelName || "Unnamed"
                } - Double/Twin`,
                description: `${
                  row.destination || "Unknown destination"
                } / ${row.nights} nights / per person basis`,
                itemType: "ACCOMMODATION",
                optional: row.stayType !== "CORE",
                quantity: 1,
                unitPrice:
                  toNumber(row.doubleTwinPerPerson) * toNumber(row.nights),
                discountAmount: 0,
                taxAmount: 0,
                total:
                  toNumber(row.doubleTwinPerPerson) * toNumber(row.nights),
                sortOrder: 1 + index * 3,
              });
            }

            if (toNumber(row.triplePerPerson) > 0) {
              items.push({
                title: `${stayLabel} Hotel - ${
                  row.hotelName || "Unnamed"
                } - Triple`,
                description: `${
                  row.destination || "Unknown destination"
                } / ${row.nights} nights / per person basis`,
                itemType: "ACCOMMODATION",
                optional: row.stayType !== "CORE",
                quantity: 1,
                unitPrice: toNumber(row.triplePerPerson) * toNumber(row.nights),
                discountAmount: 0,
                taxAmount: 0,
                total: toNumber(row.triplePerPerson) * toNumber(row.nights),
                sortOrder: 2 + index * 3,
              });
            }

            return items;
          }),

        ...fixedCostRows
          .filter((row) => row.label.trim() || fixedCostRowTotal(row) > 0)
          .map((row, index) => ({
            title: row.label.trim() || row.category,
            description: `Fixed cost / ${row.category} / qty ${row.quantity}`,
            itemType:
              row.category === "FLIGHT"
                ? ("FLIGHT" as const)
                : ("FEE" as const),
            optional: false,
            quantity: calculations.totalPassengers,
            unitPrice: fixedCostRowTotal(row),
            discountAmount: 0,
            taxAmount: 0,
            total: fixedCostRowTotal(row) * calculations.totalPassengers,
            sortOrder: 100 + index,
          })),

        ...operationalCostRows
          .filter((row) => row.label.trim() || operationalCostRowTotal(row) > 0)
          .map((row, index) => ({
            title: row.label.trim() || row.category,
            description: `Operational group cost / ${row.category}`,
            itemType:
              row.category === "BUS" ||
              row.category === "FERRY" ||
              row.category === "TRANSFER"
                ? ("TRANSPORT" as const)
                : row.category === "TOUR_GUIDE" ||
                    row.category === "TOUR_MANAGER"
                  ? ("GUIDE" as const)
                  : ("CUSTOM" as const),
            optional: false,
            quantity: 1,
            unitPrice: operationalCostRowTotal(row),
            discountAmount: 0,
            taxAmount: 0,
            total: operationalCostRowTotal(row),
            sortOrder: 300 + index,
          })),
      ];

      const payload = {
        templateId,
        purpose,
        tourId: tourId || null,
        departureDateId: departureDateId || null,
        title,
        recipientName,
        recipientEmail,
        internalNotes,
        termsAndNotes,
        currency,
        agentId: agentId || null,
        agentCompany: agentCompany || null,
        commissionSource: commissionSource || null,

        startDate: group.startDate || null,
        endDate: group.endDate || null,
        totalPassengers: calculations.totalPassengers,
        freePassengers: calculations.freePassengers,
        payingPassengers: calculations.payingPassengers,

        agentCommissionPercent: pricing.agentCommissionPercent,
        epochMarkupPercent: pricing.epochMarkupPercent,
        pricingMode,

        paxPricingRows: paxPricingRows
          .filter((row) => row.paxCount > 0)
          .map((row) => ({
            paxCount: row.paxCount,
            calculatedSinglePrice: row.calculatedSinglePrice,
            calculatedDoubleTwinPrice: row.calculatedDoubleTwinPrice,
            calculatedTriplePrice: row.calculatedTriplePrice,
            manualSinglePrice: row.manualSinglePrice,
            manualDoubleTwinPrice: row.manualDoubleTwinPrice,
            manualTriplePrice: row.manualTriplePrice,
          })),

        hotels: hotels.map((row) => ({
          hotelName: row.hotelName,
          destination: row.destination,
          nights: row.nights,
          singlePerPerson: row.singlePerPerson,
          doubleTwinPerPerson: row.doubleTwinPerPerson,
          triplePerPerson: row.triplePerPerson,
          stayType: row.stayType,
        })),

        fixedCostRows: fixedCostRows.map((row) => ({
          label: row.label,
          category: row.category,
          quantity: row.quantity,
          unitCost: row.unitCost,
        })),

        operationalCostRows: operationalCostRows.map((row) => ({
          label: row.label,
          category: row.category,
          totalCost: row.totalCost,
        })),

        clientDocumentTitle,
        clientSinglePrice: activeSinglePrice,
        clientDoubleTwinPrice: activeDoubleTwinPrice,
        clientTriplePrice: activeTriplePrice,
        clientIncludes,
        clientExcludes,
        paymentPolicy,
        cancellationPolicy,
        clientOfferNotes,
        validUntil: validUntil || null,

        items: generatedItems,
      };

      const endpoint =
        mode === "edit" && initialData?.id
          ? `/api/quotes/${initialData.id}`
          : "/api/quotes";

      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      let data: {
        ok?: boolean;
        error?: string;
        quote?: { id: string };
      } = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("QUOTE_SAVE_NON_JSON_RESPONSE", {
          status: res.status,
          text,
        });

        throw new Error(
          `Quote save failed. Server returned non-JSON response. Status: ${res.status}`
        );
      }

      if (!res.ok || !data.ok || !data.quote?.id) {
        console.error("QUOTE_SAVE_RESPONSE", { status: res.status, data });
        throw new Error(
          data.error || `Failed to save quote. Status: ${res.status}`
        );
      }

      toast.success(
        mode === "edit"
          ? "Quote updated successfully"
          : "Quote created successfully"
      );

      router.push(`/admin/quotes/${data.quote.id}`);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save quote."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Quote Context</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Purpose</span>
            <select
              className="w-full rounded-md border p-2"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as QuotePurpose)}
            >
              <option value="CUSTOM_REQUEST">Custom Request</option>
              <option value="TOUR_SETUP">Tour Setup</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Title</span>
            <input
              className="w-full rounded-md border p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Greece Pilgrimage Offer"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Tour</span>
            <select
              className="w-full rounded-md border p-2"
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
            >
              <option value="">Select tour</option>
              {tours.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Departure</span>
            <select
              className="w-full rounded-md border p-2"
              value={departureDateId}
              onChange={(e) => setDepartureDateId(e.target.value)}
            >
              <option value="">Select departure</option>
              {departures.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {new Date(dep.date).toLocaleDateString()} — {dep.price} EUR
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <QuoteTemplatePicker onApplyTemplate={handleApplyTemplate} />

      <RecipientSection
        agents={agents}
        agentId={agentId}
        recipientName={recipientName}
        recipientEmail={recipientEmail}
        agentCompany={agentCompany}
        commissionPercent={pricing.agentCommissionPercent}
        commissionSource={commissionSource}
        onAgentChange={setAgentId}
        onRecipientNameChange={setRecipientName}
        onRecipientEmailChange={setRecipientEmail}
        onCompanyChange={setAgentCompany}
      />

      <GroupSetupSection
        group={group}
        payingPassengers={calculations.payingPassengers}
        onUpdateGroup={(patch) =>
          setGroup((prev) => ({
            ...prev,
            ...patch,
          }))
        }
        toNumber={toNumber}
      />

      <HotelsSection
        hotels={hotels}
        onAddHotel={addHotel}
        onRemoveHotel={removeHotel}
        onUpdateHotel={updateHotel}
        toNumber={toNumber}
      />

      <FixedCostsSection
        rows={fixedCostRows}
        currency={currency}
        onAddRow={addFixedCostRow}
        onRemoveRow={removeFixedCostRow}
        onUpdateRow={updateFixedCostRow}
        rowTotal={fixedCostRowTotal}
        sectionTotal={calculations.fixedCostsSectionTotal}
        formatMoney={formatMoney}
        toNumber={toNumber}
      />

      <OperationalCostsSection
        rows={operationalCostRows}
        currency={currency}
        onAddRow={addOperationalCostRow}
        onRemoveRow={removeOperationalCostRow}
        onUpdateRow={updateOperationalCostRow}
        rowTotal={operationalCostRowTotal}
        sectionTotal={calculations.operationalCostsSectionTotal}
        formatMoney={formatMoney}
        toNumber={toNumber}
      />

      <section className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Free of Charge Calculation</h2>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Based On</p>
            <p className="text-base font-semibold">Double / Twin Net Cost</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Double/Twin Net Before Free
            </p>
            <p className="text-base font-semibold">
              {formatMoney(calculations.doubleTwinNetCostBeforeFree, currency)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Free Cost Total
            </p>
            <p className="text-base font-semibold">
              {formatMoney(calculations.freeCostTotal, currency)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Free Cost / Paying Passenger
            </p>
            <p className="text-base font-semibold">
              {formatMoney(calculations.freeCostPerPayingPassenger, currency)}
            </p>
          </div>
        </div>
      </section>

      <PricingControlsSection
        pricing={pricing}
        commissionSource={commissionSource}
        onUpdatePricing={(patch) =>
          setPricing((prev) => ({
            ...prev,
            ...patch,
          }))
        }
        toNumber={toNumber}
      />

      <section className="rounded-xl border p-6 space-y-6">
        <h2 className="text-lg font-semibold">Client Offer Content</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block xl:col-span-1">
            <span className="mb-1 block text-sm font-medium">
              Client Document Title
            </span>
            <input
              className="w-full rounded-md border p-2"
              value={clientDocumentTitle}
              onChange={(e) => setClientDocumentTitle(e.target.value)}
              placeholder="e.g. Holy Land Pilgrimage Offer"
            />
          </label>

          <label className="block xl:col-span-1">
            <span className="mb-1 block text-sm font-medium">Valid Until</span>
            <input
              type="date"
              className="w-full rounded-md border p-2"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </label>
        </div>

        <PassengerPricingSection
          pricingMode={pricingMode}
          onPricingModeChange={setPricingMode}
          paxPricingRows={paxPricingRows}
          onAddRow={addPaxPricingRow}
          onRemoveRow={removePaxPricingRow}
          onUpdateRow={updatePaxPricingRow}
          toNumber={toNumber}
          formatMoney={formatMoney}
          currency={currency}
        />

        <div>
          <h3 className="mb-2 font-medium">Included Services</h3>
          <IncludesExcludesBuilder
            label=""
            value={clientIncludes}
            onChange={setClientIncludes}
            type="includes"
          />
        </div>

        <div>
          <h3 className="mb-2 font-medium">Not Included</h3>
          <IncludesExcludesBuilder
            label=""
            value={clientExcludes}
            onChange={setClientExcludes}
            type="excludes"
          />
        </div>

        <div>
          <h3 className="mb-2 font-medium">Payment Policy</h3>
          <PolicySelector
            onSelect={(payment, cancellation) => {
              setPaymentPolicy(payment);
              setCancellationPolicy(cancellation);
            }}
          />
          <textarea
            className={TEXTAREA_CLASS}
            placeholder="Payment policy"
            value={paymentPolicy}
            onChange={(e) => setPaymentPolicy(e.target.value)}
          />
        </div>

        <div>
          <h3 className="mb-2 font-medium">Cancellation Policy</h3>
          <textarea
            className={TEXTAREA_CLASS}
            placeholder="Cancellation policy"
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
          />
        </div>

        <div>
          <h3 className="mb-2 font-medium">Additional Notes</h3>
          <textarea
            className={TEXTAREA_CLASS}
            placeholder="Additional client-facing notes"
            value={clientOfferNotes}
            onChange={(e) => setClientOfferNotes(e.target.value)}
          />
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Terms & Conditions</h2>

        <TermsSelector onSelect={setTermsAndNotes} />

        <textarea
          className="mt-4 min-h-65 w-full resize-y rounded-md border p-4 text-sm leading-relaxed"
          placeholder="Terms and conditions"
          value={termsAndNotes}
          onChange={(e) => setTermsAndNotes(e.target.value)}
        />
      </section>

      <div className="border-t pt-6 space-y-4">
        <QuoteSummarySection
          currency={currency}
          formatMoney={formatMoney}
          pricingMode={pricingMode}
          activeSellingPrice={activeDoubleTwinPrice}
          calculations={{
            hotelDoubleTwinPerPerson: calculations.fixedDoubleTwinPerPerson,
            fixedCostPerPerson: calculations.fixedCostPerPerson,
            operationalCostPerPerson: calculations.operationalPerPerson,
            doubleTwinNetCost: calculations.doubleTwinNetCost,
            freeCostPerPayingPassenger: calculations.freeCostPerPayingPassenger,
            preHotelTotal: calculations.preHotelTotal,
            postHotelTotal: calculations.postHotelTotal,
          }}
        />

        <ProfitViewSection
          currency={currency}
          pricingMode={pricingMode}
          costPerPerson={calculations.doubleTwinNetCost}
          sellingPerPerson={activeDoubleTwinPrice}
          profitPerPerson={profitPerPerson}
          totalCost={totalCost}
          totalRevenue={totalRevenue}
          totalProfit={totalProfit}
          marginPercent={marginPercent}
          formatMoney={formatMoney}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="rounded-md bg-black px-5 py-2.5 text-white disabled:opacity-50"
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
  