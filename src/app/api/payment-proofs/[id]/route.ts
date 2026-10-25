import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentApiActor } from "@/lib/security/getCurrentApiActor";
import { readPrivatePaymentProof } from "@/lib/storage/privatePaymentProof";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/** Admins or the submitting agency may download a receipt. Never a public URL. */
export async function GET(_request: Request, context: Context) {
  const access = await getCurrentApiActor();
  if (access.response) return access.response;

  try {
    const { id } = await context.params;
    const record = await db.paymentSubmission.findFirst({
      where: {
        id,
        ...(access.actor.role === Role.ADMIN ? {} : { userId: access.actor.id }),
      },
      select: { proofUrl: true },
    });
    if (!record?.proofUrl) {
      return NextResponse.json({ error: "Payment proof not found." }, { status: 404 });
    }

    const file = await readPrivatePaymentProof(record.proofUrl);
    if (!file) {
      return NextResponse.json({ error: "Payment proof file not found." }, { status: 404 });
    }

    return new Response(file.body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": 'attachment; filename="payment-proof"',
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error("PRIVATE_PAYMENT_PROOF_DOWNLOAD_ERROR", error);
    return NextResponse.json({ error: "Unable to open payment proof." }, { status: 500 });
  }
}
