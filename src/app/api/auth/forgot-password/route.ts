import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allowPasswordResetRequest } from "@/lib/auth/resetRateLimit";
import { genericResetMessage, hashResetToken, newResetToken, resetEmailHtml, RESET_EXPIRY_MINUTES } from "@/lib/auth/passwordReset";
import { sendEmail } from "@/lib/email/sendEmail";

export const runtime = "nodejs";
function generic() {
  return NextResponse.json({ message: genericResetMessage }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: NextRequest) {
  const response = generic();
  try {
    if (Number(req.headers.get("content-length") || 0) > 2048) return response;
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response;
    // IMPORTANT: Only trust IP metadata supplied by your verified hosting proxy.
    // Do not trust arbitrary X-Forwarded-For from unknown origins.
    const rawIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const clientIp = rawIp.slice(0, 120);
    if (!(await allowPasswordResetRequest(email, clientIp))) return response;
    const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) return response;
    const latest = await db.passwordResetToken.findFirst({
      where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < 120_000) return response;
    const origin = process.env.NEXTAUTH_URL;
    if (!origin || !/^https:\/\//i.test(origin)) {
      console.error("Password reset HTTPS origin not configured");
      return response;
    }
    const token = newResetToken();
    const entry = await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + RESET_EXPIRY_MINUTES * 60_000) },
    });
    const link = new URL("/reset-password", origin);
    link.searchParams.set("token", token);
    const result = await sendEmail({ to: user.email, subject: "Reset your Epoch Journeys password", html: resetEmailHtml(link.toString()) });
    // Resend returns {data,error}; do not treat returned errors as success.
    if (!result || result.error || !result.data?.id) {
      console.error("Password reset provider rejected email");
      await db.passwordResetToken.delete({ where: { id: entry.id } }).catch(() => undefined);
    }
  } catch (error) {
    console.error("Password reset request failed", error instanceof Error ? error.name : "unknown");
  }
  return response;
}
