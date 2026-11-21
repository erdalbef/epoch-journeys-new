import { evaluateHotelSendReadiness, type InquirySnapshot } from "./hotelSendReadiness";

/** Content-only review. Pretend the snapshot is approved for validation, but do not approve or send it. */
export function reviewHotelInquiryContent(input: Omit<InquirySnapshot, "id" | "status" | "approvedAt" | "approvedBy">) {
  const result = evaluateHotelSendReadiness({ ...input, id: "preflight", status: "APPROVED", approvedAt: new Date(0), approvedBy: "preflight" });
  return { valid: result.ready, blocks: result.blocks };
}

export type InquiryHistoryItem = {
  id: string; supplierId: string; destination: string; checkIn: string; checkOut: string;
  rooms: number; status: string; createdAt: string;
};
export function sameInquiryStay(a: Pick<InquiryHistoryItem,"supplierId"|"destination"|"checkIn"|"checkOut"|"rooms">, b: Pick<InquiryHistoryItem,"supplierId"|"destination"|"checkIn"|"checkOut"|"rooms">) {
  return a.supplierId === b.supplierId && a.destination === b.destination && a.checkIn === b.checkIn && a.checkOut === b.checkOut && a.rooms === b.rooms;
}
/** Historical is a display label, not a write to the existing audit status. */
export function splitHotelInquiryHistory(items: InquiryHistoryItem[], currentStay: Pick<InquiryHistoryItem,"supplierId"|"destination"|"checkIn"|"checkOut"|"rooms">) {
  const sorted = [...items].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
  const current = sorted.find(item=>sameInquiryStay(item,currentStay)) ?? null;
  return { current, historical: sorted.filter(item=>item.id!==current?.id) };
}
