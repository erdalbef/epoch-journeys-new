/**
 * Epoch Journeys: consistency checks for Tour Master, the saved quotation offer,
 * the brief itinerary and priced/core supplier entries.
 *
 * IMPORTANT: A missing stand-alone cost does NOT prove a service is unpriced:
 * suppliers may bundle it (e.g. BB/HB, taxes, Mass arrangements). Accordingly,
 * absence of pricing evidence is a review WARNING, never a fabricated cost.
 * This module changes no rates or service terms.
 */
import { serviceTermsLines } from "@/lib/quotes/serviceTermsReview";

export type ConsistencySourceRow = Record<string, unknown>;
export type ServiceConsistencyInput = {
  tourId?: string | null;
  tourInclusions?: string | null;
  tourExclusions?: string | null;
  briefItinerary?: string | null;
  includes?: string | null;
  excludes?: string | null;
  hotels?: unknown;
  fixedCostRows?: unknown;
  operationalCostRows?: unknown;
  payingPassengers?: unknown;
  freePassengers?: unknown;
};
export type ConsistencyIssue = {
  code: string;
  label: string;
  message: string;
  source: "QUOTE" | "TOUR_MASTER" | "ITINERARY" | "COSTING";
};
export type ExclusionComparison = {
  tourMasterTerm: string;
  status: "MATCHED" | "MISSING" | "INCLUDED_IN_QUOTE";
  quoteTerm?: string;
};
export type ServiceConsistencyResult = {
  exclusionComparisons: ExclusionComparison[];
  blockers: ConsistencyIssue[];
  warnings: ConsistencyIssue[];
  matched: string[];
  fingerprint: string;
};

type ServiceKind =
  | "accommodation" | "breakfast" | "dinner" | "lunch"
  | "coach" | "transfer" | "guide" | "tourManager"
  | "entrance" | "headsets" | "water" | "porterage"
  | "gratuities" | "mass" | "flight" | "cruise" | "taxes";

const categories: { kind: ServiceKind; label: string; regex: RegExp }[] = [
  { kind: "accommodation", label: "Hotel accommodation", regex: /\b(hotel\s+accommodations?|accommodation|overnight\s+stays?|lodging)\b/i },
  { kind: "breakfast", label: "Breakfast", regex: /\bbreakfasts?\b/i },
  { kind: "dinner", label: "Dinners", regex: /\bdinners?\b/i },
  { kind: "lunch", label: "Lunches", regex: /\blunch(?:es)?\b/i },
  { kind: "coach", label: "Private motorcoach", regex: /\b(motorcoach|motor\s*coach|tourist\s+coach|coach\s+transport|private\s+coach|air.conditioned\s+(?:bus|coach)|transportation\s+by\s+.*\b(?:coach|bus))\b/i },
  { kind: "transfer", label: "Transfers", regex: /\b(transfers?|airport\s+(?:pickup|pick.up|drop.off))\b/i },
  { kind: "guide", label: "Local guides", regex: /\b(local\s+guides?|tour\s+guides?|english.speaking\s+guides?)\b/i },
  { kind: "tourManager", label: "Tour Manager", regex: /\b(tour\s+managers?|tour\s+escorts?)\b/i },
  { kind: "entrance", label: "Entrance fees", regex: /\b(entrance\s+fees?|admission\s+fees?|entry\s+fees?|admission\s+tickets?)\b/i },
  { kind: "headsets", label: "Headsets", regex: /\b(headsets?|whisper\s+(?:system|headsets?)|audio\s+(?:system|guides?))\b/i },
  { kind: "water", label: "Bottled water", regex: /\bbottled\s+water\b/i },
  { kind: "porterage", label: "Porterage", regex: /\b(porterage|luggage\s+handling)\b/i },
  { kind: "gratuities", label: "Gratuities", regex: /\b(gratuities|gratuity|tips|tipping)\b/i },
  { kind: "mass", label: "Mass arrangements", regex: /\b(mass\s+arrangements?|daily\s+mass|holy\s+mass|church\s+donations?)\b/i },
  { kind: "flight", label: "Flights", regex: /\b(flights?|airfare|air\s+travel)\b/i },
  { kind: "cruise", label: "Cruise", regex: /\b(cruises?|cruise\s+ship|ship\s+cabins?)\b/i },
  { kind: "taxes", label: "Taxes", regex: /\b(taxes|tax|vat|climate\s+tax|city\s+tax)\b/i },
];
const serviceLabel = (kind: ServiceKind) => categories.find((item) => item.kind === kind)?.label || kind;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const number = (value: unknown) => {
  const x = typeof value === "number" ? value : Number(value);
  return Number.isFinite(x) && x > 0 ? x : 0;
};
const rows = (value: unknown): ConsistencySourceRow[] => Array.isArray(value)
  ? value.filter((item): item is ConsistencySourceRow => !!item && typeof item === "object" && !Array.isArray(item)) : [];
const kindMatches = (line: string) => categories.filter(({ regex }) => regex.test(line)).map(({ kind }) => kind);
const conditional = (line: string) => /\b(unless|except|if included|where available|not specifically|as specifically stated|as mentioned|not mentioned|if specified)\b/i.test(line);
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

/**
 * Conservatively compare the wording of exclusions. Broad service categories
 * alone are not equivalent: "international airfare" must not silently match
 * "domestic airfare" or "cruise gratuities". Uncertain matches are sent for
 * Admin review rather than marked green.
 */
function exclusionTokens(value: string): string[] {
  const aliases: Record<string, string> = {
    airfare: "flight", airfares: "flight", flights: "flight", flying: "flight",
    lunches: "lunch", dinners: "dinner", breakfasts: "breakfast",
    gratuity: "tip", gratuities: "tip", tips: "tip", tipping: "tip",
    visas: "visa", passports: "passport", expenses: "expense",
    activities: "activity", excursions: "excursion", beverages: "beverage",
    taxes: "tax", fees: "fee", charges: "charge", services: "service",
  };
  const stop = new Set([
    "and", "or", "the", "a", "an", "of", "in", "on", "to", "for", "by", "at",
    "any", "all", "as", "are", "is", "with", "without", "unless", "except",
    "not", "included", "include", "includes", "excluding", "specifically",
    "specified", "stated", "mentioned", "where", "when", "if", "applicable",
    "otherwise", "quotation", "quoted", "proposal", "itinerary", "package",
  ]);
  return [...new Set(normalize(value).split(" ").map(x => aliases[x] || x).filter(x => x && !stop.has(x)))].sort();
}
function comparableExclusions(a: string, b: string): boolean {
  if (normalize(a) === normalize(b)) return true;
  const x = exclusionTokens(a), y = exclusionTokens(b);
  if (!x.length || !y.length) return false;
  // Single-topic exclusions such as "lunches" are safe only if both reduce
  // to the same one topic; otherwise preserve a warning for Admin.
  if (x.length === 1 || y.length === 1) return x.length === 1 && y.length === 1 && x[0] === y[0];
  const shared = x.filter(token => y.includes(token)).length;
  // 75% overlap of BOTH lists avoids matching international vs domestic fares.
  return shared >= 2 && shared / x.length >= 0.75 && shared / y.length >= 0.75;
}
function broadQuoteInclusion(masterTerm: string, quoteTerm: string): boolean {
  if (comparableExclusions(masterTerm, quoteTerm)) return true;
  // More general explicit promises (e.g., "all airfare") can conflict with a
  // narrower Tour Master exclusion, but restricted domestic/overseas categories
  // should not be treated as equivalent.
  const master = exclusionTokens(masterTerm);
  const quoted = exclusionTokens(quoteTerm);
  const masterCategory = kindMatches(masterTerm);
  return /\b(all|every)\b/i.test(quoteTerm) &&
    masterCategory.some(k => kindMatches(quoteTerm).includes(k)) &&
    quoted.length > 0 && quoted.every(t => master.includes(t));
}

function classify(lines: string[]): Map<ServiceKind, string[]> {
  const result = new Map<ServiceKind, string[]>();
  for (const line of lines) {
    // A gratuity for a guide, Tour Manager or cruise is not a promise to
    // include the guide service, Tour Manager service, or cruise itself.
    const kinds = /\b(gratuities|gratuity|tips|tipping)\b/i.test(line)
      ? (["gratuities"] as ServiceKind[]) : kindMatches(line);
    for (const kind of kinds) result.set(kind, [...(result.get(kind) || []), line]);
  }
  return result;
}
function activeCategory(rowsValue: unknown, category: string): boolean {
  return rows(rowsValue).some((r) => text(r.category) === category && number(r.quantity) > 0 && number(r.unitCost) > 0);
}
function activeOperational(rowsValue: unknown, ...names: string[]): boolean {
  return rows(rowsValue).some((r) => names.includes(text(r.category)) && text(r.scope || "CORE") === "CORE" &&
    (number(r.totalContractCost) > 0 || number(r.dailyRate) > 0));
}

function coreHotels(input: ServiceConsistencyInput): ConsistencySourceRow[] {
  return rows(input.hotels).filter((h) => text(h.stayType || "CORE") === "CORE" && number(h.nights) > 0);
}
function evidence(input: ServiceConsistencyInput, kind: ServiceKind): { present: boolean; note: string } {
  const hotels = coreHotels(input);
  const hotelCost = hotels.some((h) => number(h.doubleTwinPerPerson) > 0 || number(h.singlePerPerson) > 0);
  const hbNights = hotels.reduce((s,h) => {
    const selected = text(h.supplierSelectedMealBasis);
    const effectiveBasis = selected || text(h.supplierMealBasis);
    return s + (/\bHB\b|HALF.?BOARD/i.test(effectiveBasis) ? number(h.nights) : 0);
  }, 0);
  const dinners = rows(input.fixedCostRows).filter(r => text(r.category) === "DINNER" && number(r.unitCost) > 0).reduce((s,r) => s + number(r.quantity), 0)
    + hotels.filter(h => h.supplierDinnerSelected === true).reduce((s,h) => s + number(h.supplierDinnerMeals), 0);
  switch (kind) {
    case "accommodation": return { present: hotelCost, note: "No costed CORE hotel stay found" };
    case "breakfast": return { present: hotels.some(h => /\b(BB|HB)\b|BREAKFAST|HALF.?BOARD/i.test(text(h.supplierSelectedMealBasis || h.supplierMealBasis))), note: "Hotel breakfast basis is not confirmed in supplier rate snapshots" };
    case "dinner": {
      const offeredDaily = serviceTermsLines(input.includes).some(l => kindMatches(l).includes("dinner") && /\bdaily\b|\ball\b/i.test(l));
      const nights = hotels.reduce((s,h) => s+number(h.nights),0);
      const count = dinners+hbNights;
      return { present: count > 0 && (!offeredDaily || nights === 0 || count >= nights), note: offeredDaily ? `Daily dinners need reconfirmation: ${count} priced/HB meal(s) against ${nights} CORE hotel night(s). Hotel HB and separately booked dinners must not be double-charged.` : "No priced dinner row or included hotel HB dinner found" };
    }
    case "lunch": return { present: activeCategory(input.fixedCostRows,"LUNCH"), note: "No priced lunch row found. Lunches in the itinerary may be on pilgrims' own." };
    case "coach": return { present: activeOperational(input.operationalCostRows,"BUS"), note: "No priced CORE bus / coach entry found" };
    case "transfer": return { present: activeOperational(input.operationalCostRows,"TRANSFER","BUS","TRANSFERMAN"), note: "No priced CORE transfer or coach entry found" };
    case "guide": return { present: activeOperational(input.operationalCostRows,"TOUR_GUIDE"), note: "No priced CORE local guide row found" };
    case "tourManager": return { present: activeOperational(input.operationalCostRows,"TOUR_MANAGER"), note: "No priced CORE Tour Manager row found" };
    case "entrance": return { present: activeCategory(input.fixedCostRows,"ENTRANCE"), note: "No entrance-fee row found; verify whether visits are free or covered by a bundled supplier price" };
    case "headsets": return { present: activeCategory(input.fixedCostRows,"HEADSETS"), note: "No priced headset row found; verify if bundled" };
    case "water": return { present: activeCategory(input.fixedCostRows,"BOTTLED_WATER"), note: "No priced bottled-water row found; verify if bundled" };
    case "porterage": return { present: activeCategory(input.fixedCostRows,"PORTERAGE") || hotels.some(h => h.supplierPorterageIncluded === true || (h.supplierPorterageSelected === true && number(h.supplierPorterageAmount)>0)), note: "Porterage is not confirmed in costed hotel services or separate rows" };
    case "gratuities": return { present: activeCategory(input.fixedCostRows,"TIPS"), note: "No priced gratuity row found; confirm what is included and for which days" };
    case "mass": return { present: activeCategory(input.fixedCostRows,"MASS_CHURCH"), note: "No priced church / Mass expense found; arrangements may be free but must be confirmed" };
    case "flight": return { present: activeCategory(input.fixedCostRows,"FLIGHT"), note: "No priced flight item found" };
    case "cruise": return { present: activeCategory(input.fixedCostRows,"CRUISE") || activeOperational(input.operationalCostRows,"FERRY"), note: "No priced cruise or ferry item found" };
    case "taxes": return { present: hotels.some(h => h.supplierCityTaxIncluded === true), note: "Tax inclusion cannot be verified from supplier cost details; check VAT and city/climate tax treatment" };
  }
}

export function reviewQuoteServiceConsistency(input: ServiceConsistencyInput): ServiceConsistencyResult {
  const includes = serviceTermsLines(input.includes);
  const excludes = serviceTermsLines(input.excludes);
  const masterIncludes = serviceTermsLines(input.tourInclusions);
  const masterExcludes = serviceTermsLines(input.tourExclusions);
  const inKinds = classify(includes);
  const exKinds = classify(excludes);
  const tourInKinds = classify(masterIncludes);
  const blockers: ConsistencyIssue[] = [];
  const warnings: ConsistencyIssue[] = [];
  const matched: string[] = [];
  const exclusionComparisons: ExclusionComparison[] = [];
  const add = (target: ConsistencyIssue[], code: string, kind: ServiceKind | string, message: string, source: ConsistencyIssue["source"]) => {
    if (!target.some(x => x.code === code)) target.push({code, label: serviceLabel(kind as ServiceKind), message, source});
  };
  // The actual quote cannot claim the same service as both included and excluded.
  // Qualified exceptions (e.g. lunches 'unless specified') are warnings for human review.
  for (const [kind, lines] of inKinds) {
    const opposite = exKinds.get(kind) || [];
    if (opposite.length) {
      const qualified = lines.every(conditional) || opposite.every(conditional);
      add(qualified ? warnings : blockers, `QUOTE_${kind}`, kind,
        `Rates Include: "${lines[0]}"; Rates Exclude: "${opposite[0]}". ${qualified ? "Confirm that the stated exception is clear." : "Remove the contradiction before confirming."}`, "QUOTE");
    }
    const check = evidence(input, kind);
    if (check.present) matched.push(serviceLabel(kind));
    else add(warnings, `COST_${kind}`, kind, `${check.note}. Confirm inclusion and price basis before issuing the Agent PDF.`, "COSTING");
  }
  const includedMass = inKinds.has("mass");
  const itineraryHasMass = /\b(celebrate|celebration\s+of|daily|holy)\s+mass\b|\bmass\s+(?:at|in|will\s+be\s+celebrated)\b/i.test(text(input.briefItinerary));
  if (itineraryHasMass && !includedMass && !exKinds.has("mass")) {
    add(warnings, "ITINERARY_MASS", "mass", "Mass is scheduled in the brief itinerary, but the Agent Proposal does not state how Mass arrangements are handled. Check any church donations separately.", "ITINERARY");
  }
  const hbCoreNights = coreHotels(input).reduce((sum, h) => {
    const basis = text(h.supplierSelectedMealBasis || h.supplierMealBasis);
    return sum + (/\bHB\b|HALF.?BOARD/i.test(basis) ? number(h.nights) : 0);
  }, 0);
  if (hbCoreNights > 0 && activeCategory(input.fixedCostRows, "DINNER")) {
    add(warnings, "MEAL_HB_DUPLICATE", "dinner", "Hotel HB dinners and separately priced dinner rows both exist. Check their dates so no dinner is double charged; the same day may require only one dinner.", "COSTING");
  }
  if (input.tourId && !masterIncludes.length && !masterExcludes.length) {
    add(warnings,"MASTER_MISSING","Tour Master", "Selected Tour Master has no saved inclusions/exclusions for comparison. Review the itinerary manually.","TOUR_MASTER");
  }
  // Tour Master expresses the reference/from-price package; custom quotes may differ.
  // Signal differences for explicit Admin acknowledgement rather than silently copying.
  for (const [kind, lines] of tourInKinds) {
    if (exKinds.has(kind) && !lines.every(conditional)) add(warnings, `MASTER_INCLUDE_${kind}`, kind,
      `Tour Master includes "${lines[0]}", but this quotation lists ${serviceLabel(kind)} as excluded. Confirm that the custom quotation deliberately differs from the reference package.`, "TOUR_MASTER");
    else if (!inKinds.has(kind) && !exKinds.has(kind)) add(warnings, `MASTER_OMITTED_${kind}`, kind,
      `Tour Master lists "${lines[0]}" but the agency quotation does not clearly state its treatment.`, "TOUR_MASTER");
  }
  // Audit EVERY Tour Master exclusion, not only those that conflict with an
  // inclusion. The prior validator silently skipped omissions from Rates Exclude.
  // Tour Master is reference/from-price content, so these remain review warnings
  // (custom quotations may genuinely differ), never automatic copy/overwrites.
  for (const [index, masterTerm] of masterExcludes.entries()) {
    const matchingExclude = excludes.find(quoteTerm => comparableExclusions(masterTerm, quoteTerm));
    const matchingInclude = includes.find(quoteTerm => broadQuoteInclusion(masterTerm, quoteTerm));
    const status: ExclusionComparison["status"] = matchingInclude ? "INCLUDED_IN_QUOTE" :
      matchingExclude ? "MATCHED" : "MISSING";
    exclusionComparisons.push({
      tourMasterTerm: masterTerm,
      status,
      quoteTerm: matchingInclude || matchingExclude,
    });
    if (status === "INCLUDED_IN_QUOTE") {
      add(warnings, `MASTER_EXCLUSION_INCLUDED_${index}`, "Tour Master exclusion",
        `Tour Master excludes "${masterTerm}" but the quotation includes "${matchingInclude}". Verify the deliberate change and its cost before approving.`, "TOUR_MASTER");
    } else if (status === "MISSING") {
      add(warnings, `MASTER_EXCLUSION_MISSING_${index}`, "Tour Master exclusion",
        `Tour Master excludes "${masterTerm}", but no equivalent is listed in Rates Exclude. Add it or confirm that this custom quotation intentionally differs.`, "TOUR_MASTER");
    }
  }
  // Dedicated, clearly worded inclusion clauses in the *actual brief offer* are
  // binding. Other itinerary mentions are NOT interpreted as included services.
  const itineraryLines = text(input.briefItinerary).split(/\n|(?<=[.!?])\s+/);
  for (const phrase of itineraryLines) {
    if (!/\b(included|includes|included\s+in\s+the\s+(?:rate|price|package))\b/i.test(phrase)) continue;
    for (const kind of kindMatches(phrase)) {
      if ((exKinds.get(kind) || []).some(line => !conditional(line))) {
        add(blockers, `ITINERARY_${kind}`, kind,
          `The brief itinerary says "${phrase.trim().slice(0,160)}" but the quotation excludes ${serviceLabel(kind)}. Make the itinerary and rates agree.`, "ITINERARY");
      } else if (!inKinds.has(kind)) {
        add(warnings, `ITINERARY_UNLISTED_${kind}`, kind,
          `The brief itinerary explicitly includes ${serviceLabel(kind)}, but Rates Include does not list it.`, "ITINERARY");
      }
    }
  }
  const snapshot = {
    rulesVersion: "exclusion-audit-v2",
    tourId: text(input.tourId), tourIncludes: text(input.tourInclusions), tourExcludes: text(input.tourExclusions),
    itinerary: text(input.briefItinerary), includes: text(input.includes), excludes: text(input.excludes),
    hotels: coreHotels(input).map(h => [text(h.hotelName), number(h.nights), number(h.singlePerPerson), number(h.doubleTwinPerPerson),number(h.triplePerPerson),text(h.supplierSelectedMealBasis),text(h.supplierMealBasis), h.supplierDinnerIncluded===true, h.supplierDinnerSelected===true,number(h.supplierDinnerMeals),number(h.supplierDinnerAmount),h.supplierPorterageIncluded===true,h.supplierPorterageSelected===true,number(h.supplierPorterageAmount),h.supplierCityTaxIncluded===true,number(h.supplierCityTaxAmount),h.supplierBeverageSelected===true,number(h.supplierBeveragePackageAmount)]),
    fixed: rows(input.fixedCostRows).map(r => [text(r.category), text(r.label),number(r.quantity),number(r.unitCost)]),
    operational: rows(input.operationalCostRows).map(r => [text(r.category),text(r.scope),text(r.label),text(r.costMode),text(r.pricingBasis),number(r.totalContractCost),number(r.dailyRate),number(r.numberOfDays),number(r.hotelPerNight),number(r.hotelNights),number(r.airfareTransport),number(r.mealsPerDay),number(r.mealDays),number(r.otherExpenses),r.accommodationCoveredElsewhere===true]),
    paying: number(input.payingPassengers), complimentary: Number(input.freePassengers)||0,
  };
  return { blockers, warnings, matched: [...new Set(matched)], exclusionComparisons, fingerprint: JSON.stringify(snapshot) };
}
export function isServiceConsistencyConfirmed(summary: unknown, fingerprint: string): boolean {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return false;
  const value = (summary as Record<string,unknown>).serviceConsistencyReview;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const review = value as Record<string,unknown>;
  return review.confirmed === true && review.warningsAcknowledged === true &&
    review.fingerprint === fingerprint && typeof review.confirmedAt === "string" &&
    Number.isFinite(new Date(review.confirmedAt).getTime());
}
export function isServiceConsistencyPdfOutdated(summary: unknown, generatedAt: Date | string | null | undefined): boolean {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return true;
  const value = (summary as Record<string,unknown>).serviceConsistencyReview;
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  const confirmedAt = (value as Record<string,unknown>).confirmedAt;
  const confirmed = typeof confirmedAt === "string" ? new Date(confirmedAt).getTime() : NaN;
  const generated = generatedAt ? new Date(generatedAt).getTime() : NaN;
  return !Number.isFinite(confirmed) || !Number.isFinite(generated) || generated < confirmed;
}
