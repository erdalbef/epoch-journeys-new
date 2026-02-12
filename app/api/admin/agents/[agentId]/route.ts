import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { PartnerType } from "@prisma/client";

type Params = { params: { agentId: string } };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { agentId } = params;
  if (!agentId) {
    return NextResponse.json({ ok: false, error: "Missing agentId" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as {
      partnerType?: PartnerType;
      commissionRate?: number | null;
      fixedPayoutPerPax?: number | null;
    };

    // Basic guardrails
    if (body.commissionRate != null && (body.commissionRate < 0 || body.commissionRate > 1)) {
      return NextResponse.json(
        { ok: false, error: "commissionRate must be between 0 and 1 (e.g., 0.12)" },
        { status: 400 }
      );
    }

    if (body.fixedPayoutPerPax != null && body.fixedPayoutPerPax < 0) {
      return NextResponse.json(
        { ok: false, error: "fixedPayoutPerPax must be >= 0" },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id: agentId },
      data: {
        // only update if provided
        ...(body.partnerType ? { partnerType: body.partnerType } : {}),
        ...(body.commissionRate !== undefined ? { commissionRate: body.commissionRate } : {}),
        ...(body.fixedPayoutPerPax !== undefined ? { fixedPayoutPerPax: body.fixedPayoutPerPax } : {}),
      },
      select: {
        id: true,
        email: true,
        approved: true,
        role: true,
        partnerType: true,
        commissionRate: true,
        fixedPayoutPerPax: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (err) {
    console.error("Update agent failed:", err);
    return NextResponse.json({ ok: false, error: "Failed to update agent" }, { status: 500 });
  }
}
