export type DayEvidence = {
  day: number;
  heading: string;
  overnight: string | null;
  mass: string | null;
};

export type ItineraryEvidence = {
  days: DayEvidence[];
  warnings: string[];
  pilgrimageSitesVerified: false;
};

const headingPattern = /^\s*Day\s+(\d{1,2})\b[^\r\n]*/gim;

function normalize(value: string): string {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function labeledLine(block: string, label: string): string | null {
  const expression = new RegExp(
    `^\\s*${label}\\s*:\\s*(.*?)\\s*$`, "gim"
  );
  const values = [...block.matchAll(expression)];

  // Multiple labels are ambiguous; do not silently choose one.
  if (values.length !== 1) return null;

  return values[0][1].trim() || null;
}

/**
 * Extract only explicitly labeled facts from itinerary prose.
 * A day heading alone is NOT evidence of an overnight stay,
 * Mass arrangement, or confirmed shrine visit.
 */
export function extractItineraryEvidence(
  text: string,
  expectedDays: number,
): ItineraryEvidence {
  const warnings: string[] = [];
  const days: DayEvidence[] = [];

  if (!Number.isInteger(expectedDays) ||
      expectedDays < 1 || expectedDays > 40) {
    return {
      days: [],
      warnings: ["Invalid itinerary duration."],
      pilgrimageSitesVerified: false,
    };
  }

  const headings = [...text.matchAll(headingPattern)];

  for (let index = 0; index < headings.length; index++) {
    const match = headings[index];
    const day = Number(match[1]);
    const start = match.index! + match[0].length;
    const end = headings[index + 1]?.index ?? text.length;
    const block = text.slice(start, end);

    const overnight = labeledLine(block, "Overnight");
    const mass = labeledLine(block, "Mass");

    days.push({
      day,
      heading: match[0].trim(),
      overnight,
      mass,
    });

    if (!overnight) {
      warnings.push(`Day ${day}: overnight information not established.`);
    }
    if (!mass) {
      warnings.push(`Day ${day}: Mass information not established.`);
    }
  }

  const numbers = days.map((item) => item.day);
  const unique = new Set(numbers);

  if (unique.size !== numbers.length) {
    warnings.push("Duplicate itinerary day headings.");
  }

  for (let day = 1; day <= expectedDays; day++) {
    if (!unique.has(day)) {
      warnings.push(`Day ${day} is missing.`);
    }
  }

  if (numbers.some((day) => day < 1 || day > expectedDays)) {
    warnings.push("Unexpected day number found.");
  }

  warnings.push(
    "Pilgrimage sites require separate verification against the source itinerary."
  );

  return { days, warnings, pilgrimageSitesVerified: false };
}

export type EvidenceDifference = {
  day: number;
  category: "overnight" | "mass";
  original: string;
  proposed: string;
};

/**
 * Finds differences only when BOTH documents explicitly label a fact.
 * Missing evidence must remain an unresolved warning, not a false match.
 */
export function compareItineraryEvidence(
  original: ItineraryEvidence,
  proposed: ItineraryEvidence,
): EvidenceDifference[] {
  const changes: EvidenceDifference[] = [];
  const proposedByDay = new Map(
    proposed.days.map((day) => [day.day, day])
  );

  for (const before of original.days) {
    const after = proposedByDay.get(before.day);
    if (!after) continue;

    for (const category of ["overnight", "mass"] as const) {
      const oldValue = before[category];
      const newValue = after[category];

      if (oldValue && newValue &&
          normalize(oldValue) !== normalize(newValue)) {
        changes.push({
          day: before.day,
          category,
          original: oldValue,
          proposed: newValue,
        });
      }
    }
  }

  return changes;
}