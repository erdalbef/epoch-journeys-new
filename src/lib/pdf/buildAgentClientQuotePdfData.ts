type PaxPricingRow = {
  paxCount: number;
  calculatedSinglePrice?: number;
  calculatedDoubleTwinPrice?: number;
  calculatedTriplePrice?: number;
  manualSinglePrice?: number;
  manualDoubleTwinPrice?: number;
  manualTriplePrice?: number;
};

type ComplimentarySetup = {
  useFreePlaceRule?: boolean;
  freePlaceRatio?: number;
  priestComplimentary?: boolean;
  priestCount?: number;
  priestComplimentaryBasis?: "USES_FREE_PLACE" | "ADDITIONAL";
  groupLeaderComplimentary?: boolean;
  groupLeaderCount?: number;
  groupLeaderComplimentaryBasis?: "USES_FREE_PLACE" | "ADDITIONAL";
  additionalFreePassengers?: number;
};

type HotelRow = {
  hotelName?: string;
  destination?: string;
  nights?: number;
  singlePerPerson?: number;
  doubleTwinPerPerson?: number;
  triplePerPerson?: number;
  stayType?: "CORE" | "PRE" | "POST";
};

type OperationalCostRow = {
  label?: string;
  category?: string;
  scope?: "CORE" | "PRE" | "POST";
  pricingBasis?: "GROUP_TOTAL" | "PER_PERSON" | "PER_SERVICE" | "PER_VEHICLE";
  totalCost?: number;
};

type QuoteBuilderSummary = {
  agentId?: string | null;
  agentCompany?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  briefItinerary?: string | null;
  totalPassengers?: number;
  freePassengers?: number;
  payingPassengers?: number;
  pricingMode?: "CALCULATED" | "MANUAL";
  paxPricingRows?: PaxPricingRow[];
  complimentarySetup?: ComplimentarySetup;
  hotels?: HotelRow[];
  operationalCostRows?: OperationalCostRow[];
  availabilityNotes?: string | null;
  nextStepNotes?: string | null;
};

type QuoteTour = {
  id?: string;
  title?: string | null;
  overviewItinerary?: string | null;
  itinerary?: string | null;
  mainImageUrl?: string | null;
};

type QuoteWithRelations = {
  quoteNumber: number;
  quoteReference: string | null;
  title: string | null;
  clientDocumentTitle: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  currency: string;
  validUntil: Date | null;
  createdAt?: Date | null;
  clientSinglePrice: number | null;
  clientDoubleTwinPrice: number | null;
  clientTriplePrice: number | null;
  clientIncludes: string | null;
  clientExcludes: string | null;
  paymentPolicy: string | null;
  cancellationPolicy: string | null;
  clientOfferNotes: string | null;
  termsAndNotes: string | null;
  quoteBuilderSummary: unknown;
  tour?: QuoteTour | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuoteBuilderSummary(
  value: unknown
): value is QuoteBuilderSummary {
  return isObject(value);
}

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

function resolvePrice(
  pricingMode: QuoteBuilderSummary["pricingMode"],
  manualPrice: unknown,
  calculatedPrice: unknown
) {
  const manual = toNumber(manualPrice);
  const calculated = toNumber(calculatedPrice);

  if (pricingMode === "MANUAL" && manual > 0) {
    return manual;
  }

  return calculated > 0 ? calculated : manual;
}

function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);

    return new Date(year, month - 1, day, 12, 0, 0);
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days
  );

  return result;
}

function formatItineraryDate(date: Date): string {
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(date);

  return `${datePart} - ${weekday}`;
}

function stripExistingDayAndDate(value: string): string {
  let text = value
    .replace(/\r/g, "")
    .trim();

  text = text.replace(
    /^Day\s*\d+\s*[-–—,:.]?\s*/i,
    ""
  );

  const months =
    "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

  const weekdays =
    "(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)";

  text = text.replace(
    new RegExp(
      `^${months}\\s+\\d{1,2}(?:,\\s*\\d{4})?(?:,\\s*${weekdays})?\\s*[-–—,:.]*\\s*`,
      "i"
    ),
    ""
  );

  text = text.replace(
    new RegExp(
      `^\\d{1,2}\\s+${months}(?:\\s+\\d{4})?(?:,\\s*${weekdays})?\\s*[-–—,:.]*\\s*`,
      "i"
    ),
    ""
  );

  text = text.replace(
    /^[\-–—,:.\s]+/,
    ""
  );

  return text.trim();
}

function compactItineraryText(value: string): string {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();

  if (cleaned.length <= 320) {
    return cleaned;
  }

  const shortened =
    cleaned.slice(0, 317);

  const lastBoundary = Math.max(
    shortened.lastIndexOf(". "),
    shortened.lastIndexOf("; "),
    shortened.lastIndexOf(", ")
  );

  return `${
    lastBoundary > 180
      ? shortened.slice(0, lastBoundary + 1)
      : shortened
  }...`;
}

function buildBriefItinerary(
  quoteBriefItinerary: string | null | undefined,
  overviewItinerary: string | null | undefined,
  detailedItinerary: string | null | undefined,
  startDate: string | null | undefined
) {
  const source =
    quoteBriefItinerary?.trim() ||
    overviewItinerary?.trim() ||
    detailedItinerary?.trim() ||
    "";

  if (!source) {
    return [];
  }

  const start =
    parseLocalDate(startDate);

  const normalized =
    source
      .replace(/\r/g, "")
      .trim();

  const dayHeaderRegex =
    /(?:^|\n)\s*Day\s*(\d+)\s*[-–—,:.]?\s*([^\n]*)/gi;

  const matches =
    Array.from(
      normalized.matchAll(dayHeaderRegex)
    );

  if (matches.length > 0) {
    return matches.map(
      (match, index) => {
        const dayNumber =
          Math.max(
            Number(match[1]) || index + 1,
            1
          );

        const blockStart =
          (match.index ?? 0) +
          match[0].length;

        const blockEnd =
          index + 1 < matches.length
            ? matches[index + 1].index ?? normalized.length
            : normalized.length;

        const heading =
          stripExistingDayAndDate(
            match[2] || ""
          );

        const body =
          normalized
            .slice(
              blockStart,
              blockEnd
            )
            .trim();

        const details =
          compactItineraryText(
            [heading, body]
              .filter(Boolean)
              .join(
                body && heading
                  ? ". "
                  : ""
              )
          );

        const date =
          start
            ? addCalendarDays(
                start,
                dayNumber - 1
              )
            : null;

        return {
          dayNumber,
          dateLabel:
            date
              ? formatItineraryDate(date)
              : `Day ${dayNumber}`,
          details:
            details ||
            `Day ${dayNumber}`,
        };
      }
    );
  }

  const lines =
    normalized
      .split("\n")
      .map((line) =>
        stripExistingDayAndDate(
          line
        )
      )
      .filter(Boolean);

  return lines.map(
    (line, index) => {
      const date =
        start
          ? addCalendarDays(
              start,
              index
            )
          : null;

      return {
        dayNumber:
          index + 1,
        dateLabel:
          date
            ? formatItineraryDate(date)
            : `Day ${index + 1}`,
        details:
          compactItineraryText(
            line
          ),
      };
    }
  );
}

function buildComplimentaryPolicy(
  setup: ComplimentarySetup | undefined,
  payingPassengers: number,
  freePassengers: number
) {
  if (!setup) {
    return freePassengers > 0
      ? `${freePassengers} complimentary place${freePassengers === 1 ? "" : "s"} included for this group.`
      : null;
  }

  const lines: string[] = [];

  if (setup.useFreePlaceRule) {
    const ratio = Math.max(Math.floor(toNumber(setup.freePlaceRatio)) || 10, 1);
    lines.push(
      `1 complimentary place is provided for every ${ratio} full-paying pilgrims.`
    );
  }

  if (setup.priestComplimentary) {
    const count = Math.max(Math.floor(toNumber(setup.priestCount)) || 1, 1);
    const basis =
      setup.priestComplimentaryBasis === "ADDITIONAL"
        ? "in addition to the standard complimentary allocation"
        : "using the complimentary allocation generated by the free-place rule";

    lines.push(
      `${count} priest${count === 1 ? "" : "s"} travel${count === 1 ? "s" : ""} on a complimentary basis, ${basis}.`
    );
  }

  if (setup.groupLeaderComplimentary) {
    const count = Math.max(Math.floor(toNumber(setup.groupLeaderCount)) || 1, 1);
    const basis =
      setup.groupLeaderComplimentaryBasis === "ADDITIONAL"
        ? "in addition to the standard complimentary allocation"
        : "using the complimentary allocation generated by the free-place rule";

    lines.push(
      `${count} group leader${count === 1 ? "" : "s"} travel${count === 1 ? "s" : ""} on a complimentary basis, ${basis}.`
    );
  }

  const additional = Math.max(
    Math.floor(toNumber(setup.additionalFreePassengers)),
    0
  );

  if (additional > 0) {
    lines.push(
      `${additional} additional complimentary traveler${additional === 1 ? " is" : "s are"} included.`
    );
  }

  if (freePassengers > 0) {
    lines.push(
      `Current quotation basis: ${payingPassengers} paying + ${freePassengers} complimentary = ${payingPassengers + freePassengers} travelers.`
    );
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

export function buildAgentClientQuotePdfData(quote: QuoteWithRelations) {
  const summary: QuoteBuilderSummary | null = isQuoteBuilderSummary(
    quote.quoteBuilderSummary
  )
    ? quote.quoteBuilderSummary
    : null;

  const paxPricingRows = Array.isArray(summary?.paxPricingRows)
    ? summary.paxPricingRows
    : [];

  const payingPassengers = toNumber(summary?.payingPassengers);
  const freePassengers = toNumber(summary?.freePassengers);

  const hotels = Array.isArray(summary?.hotels) ? summary.hotels : [];
  const operationalRows = Array.isArray(summary?.operationalCostRows)
    ? summary.operationalCostRows
    : [];

  const optionalHotels = hotels
    .filter((row) => row.stayType === "PRE" || row.stayType === "POST")
    .map((row) => ({
      scope: row.stayType === "PRE" ? "Pre-Stay" : "Post-Stay",
      hotelName: row.hotelName?.trim() || "Hotel",
      destination: row.destination?.trim() || "",
      nights: toNumber(row.nights),
      singlePrice: toNumber(row.singlePerPerson) * toNumber(row.nights),
      doubleTwinPrice:
        toNumber(row.doubleTwinPerPerson) * toNumber(row.nights),
      triplePrice: toNumber(row.triplePerPerson) * toNumber(row.nights),
    }));

  const optionalServices = operationalRows
    .filter((row) => row.scope === "PRE" || row.scope === "POST")
    .map((row) => ({
      scope: row.scope === "PRE" ? "Pre-Stay" : "Post-Stay",
      label: row.label?.trim() || row.category || "Optional Service",
      pricingBasis: row.pricingBasis || "PER_SERVICE",
      amount: toNumber(row.totalCost),
    }))
    .filter((row) => row.amount > 0 || row.label.trim().length > 0);

  return {
    quoteNumber: quote.quoteNumber,
    quoteReference: quote.quoteReference,
    issueDate: quote.createdAt || null,
    title: quote.title,
    clientDocumentTitle: quote.clientDocumentTitle,
    recipientName: quote.recipientName,
    recipientEmail: quote.recipientEmail,
    currency: quote.currency,
    validUntil: quote.validUntil,

    clientSinglePrice: quote.clientSinglePrice,
    clientDoubleTwinPrice: quote.clientDoubleTwinPrice,
    clientTriplePrice: quote.clientTriplePrice,

    clientIncludes: quote.clientIncludes,
    clientExcludes: quote.clientExcludes,
    paymentPolicy: quote.paymentPolicy,
    cancellationPolicy: quote.cancellationPolicy,
    clientOfferNotes: quote.clientOfferNotes,
    termsAndNotes: quote.termsAndNotes,

    agencyName: summary?.agentCompany?.trim() || "Travel Agency",
    contactName: quote.recipientName?.trim() || null,
    contactEmail: quote.recipientEmail?.trim() || null,
    contactPhone: null,
    contactWebsite: null,
    agencyAddress: null,

    companyName: "Epoch Journeys OOD",
    companyAddress:
      "107 Tsar Boris III Blvd., Floor 7, Sofia 1612, Bulgaria",
    companyVat: "BG208727060",
    companyEmail: "erdal@epochjourneys.com",
    companyWebsite: "www.epochjourneys.com",
    companyPhone: "+90 555 985 4924",

    /*
     * Put the transparent logo file at:
     * public/images/epoch-journeys-logo.png
     *
     * Because this PDF is rendered in the browser,
     * the public-relative path can be used directly.
     */
    logoUrl: "/images/epoch-compass-logo.png",

    heroImageUrl:
      quote.tour?.mainImageUrl?.trim() ||
      null,

    startDate: summary?.startDate || null,
    endDate: summary?.endDate || null,
    totalPassengers: toNumber(summary?.totalPassengers),
    freePassengers,
    payingPassengers,

    complimentaryPolicy: buildComplimentaryPolicy(
      summary?.complimentarySetup,
      payingPassengers,
      freePassengers
    ),

    briefItinerary: buildBriefItinerary(
      summary?.briefItinerary,
      quote.tour?.overviewItinerary,
      quote.tour?.itinerary,
      summary?.startDate
    ),

    availabilityNotes: summary?.availabilityNotes?.trim() || null,
    nextStepNotes: summary?.nextStepNotes?.trim() || null,

    optionalHotels,
    optionalServices,

    paxPricingRows: paxPricingRows.map((row) => ({
      paxCount: toNumber(row.paxCount),
      singlePrice: resolvePrice(
        summary?.pricingMode,
        row.manualSinglePrice,
        row.calculatedSinglePrice
      ),
      doubleTwinPrice: resolvePrice(
        summary?.pricingMode,
        row.manualDoubleTwinPrice,
        row.calculatedDoubleTwinPrice
      ),
      triplePrice: resolvePrice(
        summary?.pricingMode,
        row.manualTriplePrice,
        row.calculatedTriplePrice
      ),
    })),
  };
}
