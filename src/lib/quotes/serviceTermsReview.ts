/**
 * Rates Include / Exclude: one service per line, with explicit Admin review.
 * Shared between the client form and server. No supplier costing is inferred.
 */
export type ServiceTermsReview = {
  inclusions: string[];
  exclusions: string[];
  errors: string[];
};

function normalizedKey(line: string): string {
  return line.replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
}

export function serviceTermsLines(value: string | null | undefined): string[] {
  if (typeof value !== "string") return [];
  return value.replace(/\r\n?/g, "\n").split("\n")
    .map((line) => line.trim().replace(/^(?:[•*]\s*|[-–]\s+)/, "").trim())
    .filter(Boolean);
}

export function reviewServiceTerms(
  includes: string | null | undefined,
  excludes: string | null | undefined
): ServiceTermsReview {
  const inclusions = serviceTermsLines(includes);
  const exclusions = serviceTermsLines(excludes);
  const errors: string[] = [];
  if (!inclusions.length) errors.push("Select or enter at least one Rates Include item.");
  if (!exclusions.length) errors.push("Select or enter at least one Rates Exclude item.");
  function duplicates(lines: string[]) {
    const seen = new Set<string>();
    const repeated: string[] = [];
    for (const line of lines) {
      const key = normalizedKey(line);
      if (seen.has(key) && !repeated.includes(line)) repeated.push(line);
      seen.add(key);
    }
    return repeated;
  }
  const duplicateInclusions = duplicates(inclusions);
  const duplicateExclusions = duplicates(exclusions);
  if (duplicateInclusions.length) errors.push(`Duplicate inclusion(s): ${duplicateInclusions.join("; ")}`);
  if (duplicateExclusions.length) errors.push(`Duplicate exclusion(s): ${duplicateExclusions.join("; ")}`);
  const includeKeys = new Set(inclusions.map(normalizedKey));
  const overlaps = exclusions.filter((line) => includeKeys.has(normalizedKey(line)));
  if (overlaps.length) errors.push(`Listed under both Include and Exclude: ${overlaps.join("; ")}`);
  return { inclusions, exclusions, errors };
}

/** Bind a confirmation to the exact saved service wording, including order. */
export function serviceTermsFingerprint(includes: string | null | undefined, excludes: string | null | undefined): string {
  return JSON.stringify([includes?.trim() || "", excludes?.trim() || ""]);
}

export type ServiceTermsConfirmation = {
  confirmed: boolean;
  fingerprint?: string;
  confirmedAt?: string;
};

export function isServiceTermsConfirmed(
  summary: unknown,
  includes: string | null | undefined,
  excludes: string | null | undefined
): boolean {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return false;
  const review = (summary as Record<string, unknown>).serviceTermsReview;
  if (!review || typeof review !== "object" || Array.isArray(review)) return false;
  const saved = review as Record<string, unknown>;
  return saved.confirmed === true &&
    saved.fingerprint === serviceTermsFingerprint(includes, excludes) &&
    typeof saved.confirmedAt === "string" &&
    Number.isFinite(new Date(saved.confirmedAt).getTime()) &&
    reviewServiceTerms(includes, excludes).errors.length === 0;
}

/** Prevent emailing a saved PDF generated before the Admin's latest confirmation. */
export function isServiceTermsPdfOutdated(summary: unknown, generatedAt: Date | string | null | undefined): boolean {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return true;
  const review = (summary as Record<string, unknown>).serviceTermsReview;
  if (!review || typeof review !== "object" || Array.isArray(review)) return true;
  const stamp = (review as Record<string, unknown>).confirmedAt;
  if (typeof stamp !== "string") return true;
  const approved = new Date(stamp).getTime();
  const generated = generatedAt ? new Date(generatedAt).getTime() : 0;
  return !Number.isFinite(approved) || !Number.isFinite(generated) || generated < approved;
}
