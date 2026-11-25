const monthNames = "January February March April May June July August September October November December".split(" ");
const weekdays = "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" ");

export function correctTourDraftWeekdays(itinerary: string) {
  let corrections = 0;
  const text = itinerary.replace(
    /^(\s*(?:\*\*)?Day\s+\d+\s*[,–—:-]\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:[ \t]*[,–—-][ \t]*|[ \t]+))(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/gim,
    (heading, prefix: string, monthName: string, dayText: string, yearText: string, weekday: string) => {
      const month = monthNames.findIndex(name => name.toLowerCase() === monthName.toLowerCase());
      const day = Number(dayText);
      const year = Number(yearText);
      if (month < 0 || year < 100) return heading;

      const date = new Date(Date.UTC(year, month, day));
      if (date.getUTCMonth() !== month || date.getUTCDate() !== day) return heading;

      const corrected = weekdays[date.getUTCDay()];
      if (corrected.toLowerCase() === weekday.toLowerCase()) return heading;
      corrections++;
      return prefix + corrected;
    },
  );

  return { text, corrections };
}
