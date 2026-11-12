import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type AgentAlert = {
  id: string;
  title: string;
  description: string;
  href: string;
  ticketId: string;
  readAt: Date | null;
  createdAt: Date;
};

async function getAuthorizedAgentId(): Promise<string | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "AGENT") {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, approved: true, status: true },
  });

  if (
    !user ||
    user.role !== "AGENT" ||
    !user.approved ||
    user.status !== "ACTIVE"
  ) {
    return null;
  }

  return session.user.id;
}

export async function GET() {
  const agentId = await getAuthorizedAgentId();

  if (!agentId) {
    return NextResponse.json(
      { error: "Agent access required." },
      { status: 403 }
    );
  }

  try {
    const [alerts, counts] = await Promise.all([
      db.$queryRaw<AgentAlert[]>`
        SELECT
          "id", "title", "description", "href",
          "ticketId", "readAt", "createdAt"
        FROM "EpochAgentAlert"
        WHERE "agentId" = ${agentId}
        ORDER BY "createdAt" DESC
        LIMIT 100
      `,
      db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "EpochAgentAlert"
        WHERE "agentId" = ${agentId}
          AND "readAt" IS NULL
      `,
    ]);

    return NextResponse.json(
      { alerts, unread: Number(counts[0]?.count ?? 0) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Agent notifications retrieval failed", error);
    return NextResponse.json(
      { error: "Agent notifications unavailable." },
      { status: 503 }
    );
  }
}

export async function PATCH(request: Request) {
  const agentId = await getAuthorizedAgentId();

  if (!agentId) {
    return NextResponse.json(
      { error: "Agent access required." },
      { status: 403 }
    );
  }

  const origin = request.headers.get("origin");

  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return NextResponse.json(
          { error: "Invalid origin." },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid origin." },
        { status: 403 }
      );
    }
  }

  const input = await request.json().catch(() => null);

  // ticket-level-read: clear alerts only for this Agent's ticket.
  if (typeof input?.ticketId === "string") {
    const ticketId = input.ticketId;

    if (!ticketId || ticketId.length > 100) {
      return NextResponse.json(
        { error: "Invalid ticket ID." },
        { status: 400 }
      );
    }

    try {
      const ticket = await db.supportMessage.findFirst({
        where: { id: ticketId, userId: agentId },
        select: { id: true },
      });

      if (!ticket) {
        return NextResponse.json(
          { error: "Ticket not found." },
          { status: 404 }
        );
      }

      const updated = await db.$executeRaw`
        UPDATE "EpochAgentAlert"
        SET "readAt" = NOW()
        WHERE "agentId" = ${agentId}
          AND "ticketId" = ${ticketId}
          AND "readAt" IS NULL
      `;

      return NextResponse.json({
        success: true,
        updated: Number(updated),
      });
    } catch (error) {
      console.error("Agent ticket notification update failed", error);
      return NextResponse.json(
        { error: "Unable to update ticket notifications." },
        { status: 503 }
      );
    }
  }

  if (
    typeof input?.id !== "string" ||
    input.id.length < 1 ||
    input.id.length > 100
  ) {
    return NextResponse.json(
      { error: "Invalid notification ID." },
      { status: 400 }
    );
  }

  try {
    const updated = await db.$executeRaw`
      UPDATE "EpochAgentAlert"
      SET "readAt" = NOW()
      WHERE "id" = ${input.id}
        AND "agentId" = ${agentId}
        AND "readAt" IS NULL
    `;

    return NextResponse.json({
      success: true,
      updated: updated > 0,
    });
  } catch (error) {
    console.error("Agent notification update failed", error);
    return NextResponse.json(
      { error: "Unable to update notification." },
      { status: 503 }
    );
  }
}
