import type { HotelOfferTerms } from "./receivedHotelOffer";

export type HotelOfferDeadline = {date: string; label: string; kind: "expiry" | "roomBlock"};
const day = 86_400_000;

function calendarDate(date: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const midnight = new Date(date + "T00:00:00Z");
  if (!Number.isFinite(midnight.getTime()) || midnight.toISOString().slice(0, 10) !== date) return null;
  return new Date(midnight.getTime() + days * day).toISOString().slice(0, 10);
}

export function hotelOfferDeadlines(terms: HotelOfferTerms, received: string, checkIn: string): HotelOfferDeadline[] {
  const deadlines: HotelOfferDeadline[] = [];
  const validity = terms.validity.match(/\bvalid for (\d{1,3}) (?:calendar )?days? (?:from|after) receipt\b/i);
  const expiry = validity && Number(validity[1]) > 0 ? calendarDate(received, Number(validity[1])) : null;
  if (expiry) deadlines.push({date: expiry, label: "Calculated offer expiry from receipt date", kind: "expiry"});

  const [block, reductions] = terms.cancellation.split(/\breduction of room nights within block\s*:/i, 2);
  if (/cancellation of (?:the )?entire room block\s*:/i.test(block)) {
    for (const match of block.matchAll(/\b(\d{1,3})\s*[–—-]\s*(\d{1,3}) days\s*[–—:-]\s*(\d{1,3})\s*%/gi)) {
      const [, upper, lower, percent] = match;
      if (Number(upper) < Number(lower) || Number(percent) > 100) continue;
      const date = calendarDate(checkIn, -Number(upper));
      if (date) deadlines.push({date, label: `Full-block cancellation reaches ${percent}%`, kind: "roomBlock"});
    }
  }
  if (reductions) {
    const allowance = reductions.match(/\bwithin (\d{1,3})\s*[–—-]\s*(\d{1,3}) days\s*\((\d{1,3})\s*%\)/i);
    if (allowance && Number(allowance[1]) >= Number(allowance[2]) && Number(allowance[3]) <= 100) {
      const date = calendarDate(checkIn, -Number(allowance[1]));
      if (date) deadlines.push({date, label: `Room-night reduction window with ${allowance[3]}% free allowance starts`, kind: "roomBlock"});
    }
    if (/\bnone within 48 hours\b/i.test(reductions)) {
      const date = calendarDate(checkIn, -2);
      if (date) deadlines.push({date, label: "48-hour room-night reduction cutoff · confirm exact time", kind: "roomBlock"});
    }
  }
  return deadlines.sort((a, b) => a.date.localeCompare(b.date));
}
