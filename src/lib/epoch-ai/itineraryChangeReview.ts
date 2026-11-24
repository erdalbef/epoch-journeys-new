export type ProtectedDay = {
  day: number;
  overnightCity: string;
  pilgrimageSites: string[];
  massPlan: string;
  dayType: string;
};

export type ProtectedItinerary = {
  days: ProtectedDay[];
};

export type ChangeFinding = {
  day: number;
  category: string;
  original: string;
  proposed: string;
  message: string;
};

export type ChangeReview = {
  requiresApproval: boolean;
  findings: ChangeFinding[];
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique(values: string[]): string[] {
  const result = new Map<string, string>();

  for (const value of values) {
    const key = normalize(value);
    if (key && !result.has(key)) result.set(key, value);
  }

  return [...result.values()];
}

/**
 * Compare explicitly identified itinerary facts.
 * The caller must extract and verify protected facts from the
 * original itinerary. This function does not infer facts from prose.
 */
export function reviewItineraryChanges(
  original: ProtectedItinerary,
  proposed: ProtectedItinerary,
): ChangeReview {
  const findings: ChangeFinding[] = [];

  if (original.days.length !== proposed.days.length) {
    findings.push({
      day: 0,
      category: "duration",
      original: String(original.days.length),
      proposed: String(proposed.days.length),
      message: "The number of itinerary days has changed.",
    });
  }

  const originalDays = new Map<number, ProtectedDay>();
  const proposedDays = new Map<number, ProtectedDay>();

  for (const day of original.days) {
    if (originalDays.has(day.day)) {
      findings.push({
        day: day.day,
        category: "original-day-numbering",
        original: String(day.day),
        proposed: "",
        message: "Duplicate day number in original itinerary.",
      });
    }
    originalDays.set(day.day, day);
  }

  for (const day of proposed.days) {
    if (proposedDays.has(day.day)) {
      findings.push({
        day: day.day,
        category: "proposed-day-numbering",
        original: "",
        proposed: String(day.day),
        message: "Duplicate day number in proposed itinerary.",
      });
    }
    proposedDays.set(day.day, day);
  }

  for (const [dayNumber, before] of originalDays) {
    const after = proposedDays.get(dayNumber);

    if (!after) {
      findings.push({
        day: dayNumber,
        category: "missing-day",
        original: String(dayNumber),
        proposed: "",
        message: "An original itinerary day is missing.",
      });
      continue;
    }

    if (normalize(before.dayType) !== normalize(after.dayType)) {
      findings.push({
        day: dayNumber,
        category: "day-type",
        original: before.dayType,
        proposed: after.dayType,
        message: "Flight, arrival, touring or departure arrangement changed.",
      });
    }

    if (normalize(before.overnightCity) !== normalize(after.overnightCity)) {
      findings.push({
        day: dayNumber,
        category: "overnight-city",
        original: before.overnightCity,
        proposed: after.overnightCity,
        message: "Overnight city changed or was removed.",
      });
    }

    if (
      before.massPlan.trim() &&
      normalize(before.massPlan) !== normalize(after.massPlan)
    ) {
      findings.push({
        day: dayNumber,
        category: "mass-plan",
        original: before.massPlan,
        proposed: after.massPlan,
        message: "Original Mass arrangement differs from the proposal.",
      });
    }

    const proposedSites = new Set(
      unique(after.pilgrimageSites).map(normalize),
    );

    for (const site of unique(before.pilgrimageSites)) {
      if (!proposedSites.has(normalize(site))) {
        findings.push({
          day: dayNumber,
          category: "pilgrimage-site",
          original: site,
          proposed: after.pilgrimageSites.join(", "),
          message: "A protected pilgrimage site is absent or renamed.",
        });
      }
    }
  }

  for (const [dayNumber] of proposedDays) {
    if (!originalDays.has(dayNumber)) {
      findings.push({
        day: dayNumber,
        category: "added-day",
        original: "",
        proposed: String(dayNumber),
        message: "The proposal contains a day absent from the original.",
      });
    }
  }

  return {
    requiresApproval: findings.length > 0,
    findings,
  };
}