import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

type PartnerType = "TRAVEL_AGENCY" | "GROUP_LEADER";

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { agentId } = await params;

    if (!agentId) {
      return NextResponse.json(
        { ok: false, error: "Missing agentId" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as {
      partnerType?: PartnerType;

      // commercial
      commissionRate?: number | null; // 0.12
      fixedPayoutPerPax?: number | null; // 150

      // profile fields
      fullName?: string | null;
      travelAgency?: string | null;
      phone?: string | null;
      website?: string | null;
      membership?: string | null;
      notes?: string | null;
    };

    // partnerType is required for this endpoint (keeps rules strict)
    const partnerType = body.partnerType ?? null;
    if (partnerType !== "TRAVEL_AGENCY" && partnerType !== "GROUP_LEADER") {
      return NextResponse.json(
        { ok: false, error: "Invalid partnerType" },
        { status: 400 }
      );
    }

    // Validate commercial rules
    if (partnerType === "TRAVEL_AGENCY") {
      const cr = body.commissionRate;
      if (!isFiniteNumber(cr) || cr < 0 || cr > 1) {
        return NextResponse.json(
          {
            ok: false,
            error: "commissionRate must be a decimal between 0 and 1 (e.g., 0.12).",
          },
          { status: 400 }
        );
      }
    }

    if (partnerType === "GROUP_LEADER") {
      const payout = body.fixedPayoutPerPax;
      if (!isFiniteNumber(payout) || payout < 0) {
        return NextResponse.json(
          { ok: false, error: "fixedPayoutPerPax must be 0 or higher." },
          { status: 400 }
        );
      }
    }

    // Normalize optional text fields (trim; allow null)
    const normalize = (v: unknown): string | null => {
      if (v == null) return null;
      const s = String(v).trim();
      return s.length ? s : null;
    };

    const updated = await db.user.update({
      where: { id: agentId },
      data: {
        partnerType,

        // Commercial rules (enforced)
        commissionRate: partnerType === "TRAVEL_AGENCY" ? body.commissionRate! : null,
        fixedPayoutPerPax:
          partnerType === "GROUP_LEADER" ? body.fixedPayoutPerPax! : null,

        // Profile fields (optional)
        fullName: normalize(body.fullName),
        travelAgency: normalize(body.travelAgency),
        phone: normalize(body.phone),
        website: normalize(body.website),
        membership: normalize(body.membership),
        notes: normalize(body.notes),
      },
      select: {
        id: true,
        email: true,
        role: true,
        approved: true,

        partnerType: true,
        commissionRate: true,
        fixedPayoutPerPax: true,

        fullName: true,
        travelAgency: true,
        phone: true,
        website: true,
        membership: true,
        notes: true,

        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, agent: updated });
  } catch (err) {
    console.error("PATCH /api/admin/agents/[agentId] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update agent." },
      { status: 500 }
    );
  }
}
