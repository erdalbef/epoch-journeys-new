export type StoryReadiness = {
  ready: boolean;
  identifiedDays: number;
  message: string;
};

export function inspectStoryReadiness(
  itinerary: string,
  duration: number,
): StoryReadiness {
  if (!Number.isInteger(duration) || duration < 1 || duration > 40) {
    return {
      ready: false,
      identifiedDays: 0,
      message: "Enter a valid tour duration first.",
    };
  }

  const matches = [...itinerary.matchAll(
    /^\s*Day\s+0*(\d{1,2})\b/gim
  )];

  const days = matches.map((match) => Number(match[1]));
  const unique = new Set(days);

  if (days.length !== unique.size) {
    return {
      ready: false,
      identifiedDays: unique.size,
      message: "Duplicate itinerary day headings detected. Please review.",
    };
  }

  const missing: number[] = [];

  for (let day = 1; day <= duration; day++) {
    if (!unique.has(day)) missing.push(day);
  }

  const unexpected = days.filter(
    (day) => day < 1 || day > duration
  );

  if (missing.length > 0 || unexpected.length > 0) {
    return {
      ready: false,
      identifiedDays: unique.size,
      message: `Incomplete itinerary: ${unique.size} of ${duration} days identified. Review the numbered day headings before preparing the Pilgrimage Story.`,
    };
  }

  return {
    ready: true,
    identifiedDays: duration,
    message: "All itinerary days are identified.",
  };
}