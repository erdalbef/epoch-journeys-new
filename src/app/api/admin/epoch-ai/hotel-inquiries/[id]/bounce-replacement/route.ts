import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { requireAdminApiAccess } from "@/lib/security/requireAdminApiAccess";
import { sendEmail } from "@/lib/email/sendEmail";
import { SUPPLIER_SEND_ENABLED, SUPPLIER_CC } from "@/lib/epoch-ai/hotelSupplierSendSafety";
import { isAuthorizedTestDatabase } from "@/lib/epoch-ai/hotelTestEmail";
import { BOUNCE_REPLACEMENT_CC, ReplacementBlocked } from "@/lib/epoch-ai/hotelBounceReplacementCore";
import { EvidenceReadError, fetchVerifiedRecipientEvents } from "@/lib/epoch-ai/hotelBounceReplacementEvidence";
import { createBounceReplacementService } from "@/lib/epoch-ai/hotelBounceReplacementService";
import { loadBounceReplacementContext, claimBounceReplacement, finalizeBounceReplacement } from "@/lib/epoch-ai/hotelBounceReplacementStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Params = { params: Promise<{ id: string }> };
const reply = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});

function service() {
  return createBounceReplacementService({
    loadContext: loadBounceReplacementContext,
    verifyEvidence: (events, expectedProviderMessageId) => fetchVerifiedRecipientEvents({
      apiKey: process.env.RESEND_API_KEY || "", events, expectedProviderMessageId,
    }),
    sendEnabled: () => SUPPLIER_SEND_ENABLED && SUPPLIER_CC === BOUNCE_REPLACEMENT_CC,
    environmentAllowed: () => process.env.NODE_ENV === "production" ||
      (process.env.NODE_ENV === "development" &&
       isAuthorizedTestDatabase(process.env.DATABASE_URL, process.env.DIRECT_URL)),
    emailConfigured: () => !!process.env.RESEND_API_KEY?.trim(),
    claim: claimBounceReplacement, send: sendEmail, finalize: finalizeBounceReplacement,
  });
}

function errorReply(error: unknown) {
  if (error instanceof ReplacementBlocked) return reply({ error: error.message, blocks: error.blocks }, error.status);
  if (error instanceof EvidenceReadError) return reply({ error: error.message, code: error.code }, error.status);
  console.error("HOTEL_BOUNCE_REPLACEMENT_FAILED");
  return reply({ error: "Replacement review could not be completed. Review the existing attempt before taking further action." }, 503);
}

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  const { id } = await params;
  if (!id || id.length > 128) return reply({ error: "Invalid inquiry ID." }, 400);
  try { return reply(await service().review(id)); } catch (error) { return errorReply(error); }
}

export async function POST(request: Request, { params }: Params) {
  const denied = await requireAdminApiAccess();
  if (denied) return denied;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return reply({ error: "Same-origin confirmation required." }, 403);
  const { id } = await params;
  if (!id || id.length > 128) return reply({ error: "Invalid inquiry ID." }, 400);
  if (Number(request.headers.get("content-length") || 0) > 8192) return reply({ error: "Authorization request is too large." }, 413);
  let submitted: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 8192) return reply({ error: "Authorization request is too large." }, 413);
    submitted = JSON.parse(raw);
  } catch { return reply({ error: "Invalid authorization request." }, 400); }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return reply({ error: "An authenticated Admin identity is required." }, 403);
  try { return reply(await service().submit(id, submitted, session.user.id)); }
  catch (error) { return errorReply(error); }
}
