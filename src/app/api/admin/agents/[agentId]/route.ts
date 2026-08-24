import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

type PatchBody = {
  fullName?: string | null;
  travelAgency?: string | null;
  phone?: string | null;
  website?: string | null;
  membership?: string | null;
  notes?: string | null;
  commissionRate?: number | null;
  payoutPerPax?: number | null;

  billingCompanyName?: string | null;
  billingCompanyRegNo?: string | null;
  billingTaxNumber?: string | null;
  billingVatNumber?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  billingContactName?: string | null;
  billingEmail?: string | null;
  billingEmailSecondary?: string | null;
  billingPhone?: string | null;
};

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeOptionalEmail(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value !== "number" || Number.isNaN(value)) {
    return NaN;
  }

  return value;
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { agentId } = await context.params;
    const body = (await req.json()) as PatchBody;

    const existingAgent = await db.user.findUnique({
      where: { id: agentId },
      select: { id: true },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const data: PatchBody = {};

    const stringFields = [
      "fullName",
      "travelAgency",
      "phone",
      "website",
      "membership",
      "notes",
      "billingCompanyName",
      "billingCompanyRegNo",
      "billingTaxNumber",
      "billingVatNumber",
      "billingAddress",
      "billingCity",
      "billingState",
      "billingPostalCode",
      "billingCountry",
      "billingContactName",
      "billingPhone",
    ] as const;

    for (const field of stringFields) {
      if (field in body) {
        data[field] = normalizeOptionalString(body[field]);
      }
    }

    if ("billingEmail" in body) {
      data.billingEmail = normalizeOptionalEmail(body.billingEmail);
    }

    if ("billingEmailSecondary" in body) {
      data.billingEmailSecondary = normalizeOptionalEmail(
        body.billingEmailSecondary,
      );
    }

    if ("commissionRate" in body) {
      const commissionRate = normalizeOptionalNumber(body.commissionRate);

      if (Number.isNaN(commissionRate)) {
        return NextResponse.json(
          { error: "Commission rate must be a valid number." },
          { status: 400 },
        );
      }

      if (
        commissionRate !== null &&
        (commissionRate < 0 || commissionRate > 1)
      ) {
        return NextResponse.json(
          { error: "Commission rate must be between 0 and 1." },
          { status: 400 },
        );
      }

      data.commissionRate = commissionRate;
    }

    if ("payoutPerPax" in body) {
      const payoutPerPax = normalizeOptionalNumber(body.payoutPerPax);

      if (Number.isNaN(payoutPerPax)) {
        return NextResponse.json(
          { error: "Payout per pax must be a valid number." },
          { status: 400 },
        );
      }

      if (payoutPerPax !== null && payoutPerPax < 0) {
        return NextResponse.json(
          { error: "Payout per pax cannot be negative." },
          { status: 400 },
        );
      }

      data.payoutPerPax = payoutPerPax;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 },
      );
    }

    const updatedAgent = await db.user.update({
      where: { id: agentId },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Agent updated successfully.",
      agent: updatedAgent,
    });
  } catch (error) {
    console.error("PATCH_AGENT_ERROR", error);

    return NextResponse.json(
      { error: "Failed to update agent." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { agentId } = await context.params;

    const existingAgent = await db.user.findUnique({
      where: { id: agentId },
    });

    if (!existingAgent) {
      return NextResponse.json(
        { success: false, message: "Agent not found." },
        { status: 404 },
      );
    }

    await db.user.delete({
      where: { id: agentId },
    });

    return NextResponse.json({
      success: true,
      message: "Agent deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE_AGENT_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete agent." },
      { status: 500 },
    );
  }
}
