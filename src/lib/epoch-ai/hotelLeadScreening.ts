/** Read-only public hotel evidence for preliminary group-size screening.
 * Published total room count is not an availability commitment. Do not use as a rate.
 * Evidence is static and must be rechecked before contacting a supplier.
 */
export type LeadEvidence = { brand: string; totalRooms: number; source: string; note?: string };
export const HOTEL_LEAD_EVIDENCE: Record<string, LeadEvidence> = {
  "courtyard by marriott sarajevo": {brand:"Marriott",totalRooms:132,source:"https://pub-mediabox-storage.rxweb-prd.com/exhibitor/document/exh-5a52164f-9d2e-4243-800f-dd572ffb7549/464bfc12-ae11-4abb-bc61-418bbd4b722b.pdf"},
  "movenpick hotel sarajevo": {brand:"Accor / Movenpick",totalRooms:186,source:"https://all.accor.com/hotel/B1F7/index.en.shtml"},
  "swissotel sarajevo": {brand:"Accor / Swissotel",totalRooms:218,source:"https://www.swissotel.com/hotels/sarajevo/accommodation/",note:"Check hotel alcohol policy against the required dinner beverage package."},
  "ibis styles sarajevo": {brand:"Accor / ibis Styles",totalRooms:181,source:"https://all.accor.com/hotel/B3G8/index.en.shtml",note:"Hotel public description mentions non-alcoholic beverages; verify group dinner drinks and location suitability."}
};
export function leadEvidence(name:string):LeadEvidence|undefined {
  return HOTEL_LEAD_EVIDENCE[name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
}
export type CapacityScreen = { sharePercent:number|null; status:"screening-pass"|"capacity-caution"|"unknown"; message:string };
export function screenGroupCapacity(requestedRooms:number,totalRooms?:number): CapacityScreen {
  if (!Number.isFinite(requestedRooms) || requestedRooms<1 || !Number.isInteger(requestedRooms) || !totalRooms || !Number.isFinite(totalRooms) || totalRooms<1) return {sharePercent:null,status:"unknown",message:"Hotel room count unknown. Verify property size and group allotment."};
  const sharePercent = Math.round(requestedRooms/totalRooms*100);
  if (requestedRooms > totalRooms || sharePercent > 35) return {sharePercent,status:"capacity-caution",message:"High share of hotel inventory. Group availability and room types require careful confirmation."};
  return {sharePercent,status:"screening-pass",message:"Property size passes initial screening only; 20-room availability is not confirmed."};
}
