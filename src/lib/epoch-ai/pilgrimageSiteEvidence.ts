export type SiteEvidence = {
  day: number;
  sites: string[];
};

export type SiteEvidenceResult = {
  days: SiteEvidence[];
  warnings: string[];
};

export type SiteFinding = {
  day: number;
  site: string;
  category: "possible-omission-or-renaming";
  message: string;
};

function normalize(value: string): string {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const headingPattern = /^\s*Day\s+(\d{1,2})\b[^\r\n]*/gim;
const sitePattern =
  /^\s*(?:Pilgrimage visit|Shrine visit|Visit)\s*:\s*(.+?)\s*$/gim;

export function extractPilgrimageSites(
  text: string,
): SiteEvidenceResult {
  const days: SiteEvidence[] = [];
  const warnings: string[] = [];
  const headings = [...text.matchAll(headingPattern)];

  if (headings.length === 0) {
    warnings.push("No numbered itinerary days identified.");
  }

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const day = Number(heading[1]);
    const start = heading.index! + heading[0].length;
    const end = headings[i + 1]?.index ?? text.length;
    const block = text.slice(start, end);

    const siteLines = [...block.matchAll(sitePattern)];
    const sites = new Map<string, string>();

    for (const line of siteLines) {
      const entries = line[1].split(";");

      for (const entry of entries) {
        const value = entry.trim();
        const key = normalize(value);

        if (
          !key ||
          /^(none|n a|not applicable|to be confirmed|tbc|tbd)$/i.test(key)
        ) {
          warnings.push(
            `Day ${day}: pilgrimage visit information is unresolved.`
          );
          continue;
        }

        if (!sites.has(key)) sites.set(key, value);
      }
    }

    if (siteLines.length === 0) {
      warnings.push(
        `Day ${day}: no explicitly labeled pilgrimage visits.`
      );
    }

    days.push({ day, sites: [...sites.values()] });
  }

  const dayNumbers = days.map((item) => item.day);
  if (new Set(dayNumbers).size !== dayNumbers.length) {
    warnings.push("Duplicate day headings require manual review.");
  }

  warnings.push(
    "Only explicitly labeled visits were extracted. " +
    "Unlabeled narrative visits and alternative shrine names require manual review."
  );

  return { days, warnings };
}

export function comparePilgrimageSites(
  original: SiteEvidenceResult,
  proposed: SiteEvidenceResult,
): SiteFinding[] {
  const findings: SiteFinding[] = [];
  const proposedDays = new Map(proposed.days.map((day) => [day.day, day]));

  for (const before of original.days) {
    const after = proposedDays.get(before.day);
    const proposedNames = new Set(
      (after?.sites ?? []).map(normalize)
    );

    for (const site of before.sites) {
      if (!proposedNames.has(normalize(site))) {
        findings.push({
          day: before.day,
          site,
          category: "possible-omission-or-renaming",
          message:
            "An explicitly listed pilgrimage visit is not found " +
            "under the same name on this day of the proposal. " +
            "Check whether it was moved, renamed, omitted, or described in prose.",
        });
      }
    }
  }

  return findings;
}