import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type LastSupportReply = { ticketId: string; authorRole: string; createdAt: Date };
export type SupportTicketView = { label: string; waitingFor: "ADMIN" | "AGENT" | null; lastActivity: Date };

/** Derive response ownership from the persisted conversation; no second status field to drift. */
export function describeSupportTicket(status: string, createdAt: Date, last?: LastSupportReply): SupportTicketView {
  const lastActivity = last?.createdAt ?? createdAt;
  if (status === "RESOLVED") return { label: "Resolved", waitingFor: null, lastActivity };
  const waitingFor = last?.authorRole === "ADMIN" ? "AGENT" : "ADMIN";
  return {
    label: waitingFor === "ADMIN" ? "Awaiting Admin" : "Awaiting Agent",
    waitingFor,
    lastActivity,
  };
}

/** Most recent reply per ticket, restricted to the supplied ticket IDs. */
export async function getLastSupportReplies(ids: string[]): Promise<Map<string, LastSupportReply>> {
  if (ids.length === 0) return new Map();
  const replies = await db.$queryRaw<LastSupportReply[]>`
    SELECT DISTINCT ON ("ticketId") "ticketId", "authorRole", "createdAt"
    FROM "EpochSupportReply"
    WHERE "ticketId" IN (${Prisma.join(ids)})
    ORDER BY "ticketId", "createdAt" DESC, "id" DESC
  `;
  return new Map(replies.map(reply => [reply.ticketId, reply]));
}
